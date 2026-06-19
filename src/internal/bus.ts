import type {
  BusRecord,
  ClaimInput,
  ClaimQuery,
  ClaimResult,
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
import {
  createBusRecord,
  insertBusRecord,
  mapBusRecord,
  selectBusRecordById,
  type DbBusRecord
} from "./bus-records.js"
import { getClaimScopes, parseTtl, validateClaimInput, validateHandoffInput } from "./bus-validation.js"

export { parseTtl } from "./bus-validation.js"

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
  const payload = input.payload === undefined ? {} : input.payload
  return createBusRecord("notification", input, input.summary, payload, parseTtl(input.ttl ?? "60m"), getConfig().now())
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
    ttlMs,
    getConfig().now()
  )

  return { event, notification }
}

export function cleanupExpired(): number {
  const db = openRelayDb()
  const result = db.prepare("delete from bus_records where expires_at <= ?").run(getConfig().now().toISOString())
  return result.changes
}
