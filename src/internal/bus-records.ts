import { nanoid } from "nanoid"
import type { BusRecord, ClaimInput, HandoffInput, NotifyInput, PresenceInput } from "../types.js"
import { openRelayDb, type RelayDb } from "./db.js"
import { upsertProjectAndSession } from "./project-session.js"

export function createBusRecord(
  kind: BusRecord["kind"],
  input: PresenceInput | ClaimInput | NotifyInput | HandoffInput,
  summary: string | undefined,
  payload: unknown,
  ttlMs: number,
  now: Date
): BusRecord {
  const db = openRelayDb()
  const { project, session } = upsertProjectAndSession(db, {
    project: input.project,
    session: input.session,
    role: input.role,
    status: input.status ?? "active"
  })
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

export function insertBusRecord(
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

export function selectBusRecordById(db: RelayDb, id: string): BusRecord {
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

export interface DbBusRecord {
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

export function mapBusRecord(row: DbBusRecord): BusRecord {
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
