import { nanoid } from "nanoid"
import type {
  BusRecord,
  ClaimInput,
  ClaimQuery,
  ClaimResult,
  ClaimScope,
  HandoffInput,
  HandoffResult,
  NotifyInput,
  PresenceInput
} from "../types.js"
import { getConfig } from "./config.js"
import { findScopeConflicts } from "./conflicts.js"
import { openRelayDb, type RelayDb } from "./db.js"
import { publishEvent } from "./ledger.js"
import { resolveProject, upsertProjectAndSession } from "./project-session.js"

export function upsertPresence(input: PresenceInput): BusRecord {
  const db = openRelayDb()

  return db.transaction(() => {
    const { project, session } = upsertProjectAndSession(db, {
      project: input.project,
      session: input.session,
      role: input.role,
      status: input.status ?? "active"
    })
    const now = getConfig().now()
    const updatedAt = now.toISOString()
    const expiresAt = new Date(now.getTime() + parseTtl(input.ttl ?? "10m")).toISOString()
    const summary = input.role ?? "active"
    const payload = { role: input.role }
    const existing = db.prepare(`
      select id
      from bus_records
      where project_id = ? and session_id = ? and kind = 'presence'
      order by updated_at desc
      limit 1
    `).get(project.id, session.id) as { id: string } | undefined

    if (existing) {
      db.prepare(`
        update bus_records
        set summary = ?, payload_json = ?, expires_at = ?, updated_at = ?
        where id = ?
      `).run(summary, JSON.stringify(payload), expiresAt, updatedAt, existing.id)
      return selectBusRecordById(db, existing.id)
    }

    return insertBusRecord(db, {
      projectId: project.id,
      sessionId: session.id,
      kind: "presence",
      summary,
      payload,
      expiresAt,
      createdAt: updatedAt,
      updatedAt
    })
  })()
}

export function createClaim(input: ClaimInput): ClaimResult {
  validateClaimInput(input)
  const ttlMs = parseTtl(input.ttl ?? "45m")

  const db = openRelayDb()

  return db.transaction(() => {
    const { project, session } = upsertProjectAndSession(db, {
      project: input.project,
      session: input.session,
      role: input.role,
      status: input.status ?? "active"
    })
    const activeClaims = listActiveClaimsByProjectId(db, project.id)
    const now = getConfig().now()
    const createdAt = now.toISOString()
    const record = insertBusRecord(db, {
      projectId: project.id,
      sessionId: session.id,
      kind: "claim",
      summary: input.summary,
      payload: { scopes: input.scopes },
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      createdAt,
      updatedAt: createdAt
    })
    const conflicts = findScopeConflicts(
      activeClaims.map((claim) => ({
        id: claim.id,
        session: claim.session,
        scopes: getClaimScopes(claim),
        expiresAt: claim.expiresAt,
        summary: claim.summary
      })),
      input.scopes
    )

    return { record, conflicts }
  }).immediate()
}

export function releaseClaimById(id: string): boolean {
  const db = openRelayDb()
  const result = db.prepare("delete from bus_records where id = ? and kind = 'claim'").run(id)
  return result.changes > 0
}

export function listActiveClaims(query: ClaimQuery = {}): BusRecord[] {
  const db = openRelayDb()
  const now = getConfig().now().toISOString()
  const rows = query.project
    ? listActiveClaimRowsByResolvedProject(db, query.project, now)
    : db.prepare(`
        select b.*, p.name as project_name, s.name as session_name
        from bus_records b
        join projects p on p.id = b.project_id
        join sessions s on s.id = b.session_id
        where b.kind = 'claim' and b.expires_at > ?
        order by b.created_at desc, b.rowid desc
      `).all(now) as DbBusRecord[]

  return rows.map(mapBusRecord)
}

function listActiveClaimRowsByResolvedProject(db: RelayDb, projectName: string, now: string): DbBusRecord[] {
  const resolved = resolveProject({ project: projectName })
  return db.prepare(`
    select b.*, p.name as project_name, s.name as session_name
    from bus_records b
    join projects p on p.id = b.project_id
    join sessions s on s.id = b.session_id
    where b.kind = 'claim' and b.expires_at > ? and p.name = ? and p.root_path = ?
    order by b.created_at desc, b.rowid desc
  `).all(now, resolved.name, resolved.rootPath) as DbBusRecord[]
}

function listActiveClaimsByProjectId(db: RelayDb, projectId: string): BusRecord[] {
  const rows = db.prepare(`
    select b.*, p.name as project_name, s.name as session_name
    from bus_records b
    join projects p on p.id = b.project_id
    join sessions s on s.id = b.session_id
    where b.kind = 'claim' and b.expires_at > ? and b.project_id = ?
    order by b.created_at desc, b.rowid desc
  `).all(getConfig().now().toISOString(), projectId) as DbBusRecord[]

  return rows.map(mapBusRecord)
}

export function createNotification(input: NotifyInput): BusRecord {
  const payload = Object.hasOwn(input, "payload") ? input.payload : {}
  return createBusRecord("notification", input, input.summary, payload, parseTtl(input.ttl ?? "60m"))
}

export function createHandoff(input: HandoffInput): HandoffResult {
  validateHandoffInput(input)
  const ttlMs = parseTtl(input.ttl ?? "24h")

  const event = publishEvent({
    project: input.project,
    session: input.session,
    role: input.role,
    type: "handoff.requested",
    status: "todo",
    summary: input.summary,
    details: input.eventId ? `Related event: ${input.eventId}` : undefined,
    tags: ["handoff", input.toRole]
  })
  const notification = createBusRecord(
    "handoff",
    input,
    input.summary,
    { toRole: input.toRole, eventId: event.id, relatedEventId: input.eventId },
    ttlMs
  )

  return { event, notification }
}

export function cleanupExpired(): number {
  const db = openRelayDb()
  const result = db.prepare("delete from bus_records where expires_at <= ?").run(getConfig().now().toISOString())
  return result.changes
}

export function parseTtl(ttl: string): number {
  const match = ttl.match(/^(\d+)(m|h|d)$/)
  if (!match) {
    throw new Error(`Invalid TTL: ${ttl}`)
  }

  const value = Number(match[1])
  const unit = match[2]
  if (unit === "m") return value * 60 * 1000
  if (unit === "h") return value * 60 * 60 * 1000
  return value * 24 * 60 * 60 * 1000
}

function createBusRecord(
  kind: BusRecord["kind"],
  input: PresenceInput | ClaimInput | NotifyInput | HandoffInput,
  summary: string | undefined,
  payload: unknown,
  ttlMs: number
): BusRecord {
  const db = openRelayDb()
  const { project, session } = upsertProjectAndSession(db, {
    project: input.project,
    session: input.session,
    role: input.role,
    status: input.status ?? "active"
  })
  const now = getConfig().now()
  const createdAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString()

  return insertBusRecord(db, {
    projectId: project.id,
    sessionId: session.id,
    kind,
    summary,
    payload,
    expiresAt,
    createdAt,
    updatedAt: createdAt
  })
}

function validateClaimInput(input: ClaimInput): void {
  if (input.scopes.length === 0) {
    throw new Error("Claim requires at least one scope")
  }

  for (const scope of input.scopes) {
    if (scope.kind === "files") {
      if (scope.patterns.length === 0 || scope.patterns.some((pattern) => pattern.trim().length === 0)) {
        throw new Error("Files claim scope requires at least one non-empty pattern")
      }
    } else if (scope.kind === "resource") {
      if (scope.name.trim().length === 0) {
        throw new Error("Resource claim scope requires a non-empty name")
      }
    } else if (scope.kind === "task" && scope.name.trim().length === 0) {
      throw new Error("Task claim scope requires a non-empty name")
    }
  }
}

function validateHandoffInput(input: HandoffInput): void {
  if (input.toRole.trim().length === 0) {
    throw new Error("Handoff requires a non-empty toRole")
  }
  if (input.summary.trim().length === 0) {
    throw new Error("Handoff requires a non-empty summary")
  }
}

function insertBusRecord(
  db: RelayDb,
  input: {
    projectId: string
    sessionId: string
    kind: BusRecord["kind"]
    summary?: string
    payload: unknown
    expiresAt: string
    createdAt: string
    updatedAt: string
  }
): BusRecord {
  const id = `bus_${nanoid()}`
  db.prepare(`
    insert into bus_records (id, project_id, session_id, kind, summary, payload_json, expires_at, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.projectId,
    input.sessionId,
    input.kind,
    input.summary ?? null,
    JSON.stringify(input.payload),
    input.expiresAt,
    input.createdAt,
    input.updatedAt
  )

  return selectBusRecordById(db, id)
}

function selectBusRecordById(db: RelayDb, id: string): BusRecord {
  const row = db.prepare(`
    select b.*, p.name as project_name, s.name as session_name
    from bus_records b
    join projects p on p.id = b.project_id
    join sessions s on s.id = b.session_id
    where b.id = ?
  `).get(id) as DbBusRecord | undefined

  if (!row) {
    throw new Error(`Failed to load bus record ${id}`)
  }

  return mapBusRecord(row)
}

function getClaimScopes(record: BusRecord): ClaimScope[] {
  const payload = record.payload as { scopes?: unknown }
  return Array.isArray(payload.scopes) ? (payload.scopes as ClaimScope[]) : []
}

interface DbBusRecord {
  id: string
  project_id: string
  session_id: string
  project_name: string
  session_name: string
  kind: BusRecord["kind"]
  summary: string | null
  payload_json: string
  expires_at: string
  created_at: string
  updated_at: string
}

function mapBusRecord(row: DbBusRecord): BusRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    sessionId: row.session_id,
    project: row.project_name,
    session: row.session_name,
    kind: row.kind,
    summary: row.summary ?? undefined,
    payload: JSON.parse(row.payload_json) as unknown,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
