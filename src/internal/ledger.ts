import { nanoid } from "nanoid"
import type { EventQuery, PublishEventInput, RelayEvent, RelayLink } from "../types.js"
import { getConfig } from "./config.js"
import { openRelayDb, type RelayDb } from "./db.js"
import { upsertProjectAndSession } from "./project-session.js"
import { DEFAULT_LATEST_LIMIT, DEFAULT_SEARCH_LIMIT, eventQuerySchema, publishEventSchema } from "./validation.js"

export function publishEvent(input: PublishEventInput): RelayEvent {
  const parsed = publishEventSchema.parse(input)
  const db = openRelayDb()

  return db.transaction(() => {
    const { project, session } = upsertProjectAndSession(db, {
      project: parsed.project,
      session: parsed.session,
      role: parsed.role,
      status: parsed.status
    })
    const id = `evt_${nanoid()}`
    const createdAt = getConfig().now().toISOString()

    db.prepare(`
      insert into events (id, project_id, session_id, type, status, summary, details, tags_json, links_json, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      project.id,
      session.id,
      parsed.type,
      parsed.status,
      parsed.summary,
      parsed.details ?? null,
      JSON.stringify(parsed.tags),
      JSON.stringify(parsed.links),
      createdAt
    )

    const event = selectEventById(db, id)
    if (!event) {
      throw new Error(`Failed to publish event ${id}`)
    }
    return event
  })()
}

export function getEventById(id: string): RelayEvent | undefined {
  const db = openRelayDb()
  return selectEventById(db, id)
}

function selectEventById(db: RelayDb, id: string): RelayEvent | undefined {
  const row = db.prepare(`
    select e.*, p.name as project_name, s.name as session_name
    from events e
    join projects p on p.id = e.project_id
    join sessions s on s.id = e.session_id
    where e.id = ?
  `).get(id) as DbEvent | undefined
  return row ? mapEvent(row) : undefined
}

export function latestEvents(query: EventQuery = {}): RelayEvent[] {
  return searchEvents({ ...query, limit: query.limit ?? DEFAULT_LATEST_LIMIT })
}

export function searchEvents(query: EventQuery = {}): RelayEvent[] {
  const parsed = eventQuerySchema.parse({ ...query, limit: query.limit ?? DEFAULT_SEARCH_LIMIT })
  const db = openRelayDb()
  const clauses: string[] = []
  const params: unknown[] = []

  if (parsed.project) {
    clauses.push("p.name = ?")
    params.push(parsed.project)
  }
  if (parsed.session) {
    clauses.push("s.name = ?")
    params.push(parsed.session)
  }
  if (parsed.type) {
    clauses.push("e.type = ?")
    params.push(parsed.type)
  }
  if (parsed.status) {
    clauses.push("e.status = ?")
    params.push(parsed.status)
  }
  if (parsed.since) {
    clauses.push("e.created_at >= ?")
    params.push(parsed.since)
  }
  if (parsed.tag) {
    clauses.push("exists (select 1 from json_each(e.tags_json) where value = ?)")
    params.push(parsed.tag)
  }

  const where = clauses.length ? `where ${clauses.join(" and ")}` : ""
  const rows = db.prepare(`
    select e.*, p.name as project_name, s.name as session_name
    from events e
    join projects p on p.id = e.project_id
    join sessions s on s.id = e.session_id
    ${where}
    order by e.created_at desc, e.rowid desc
    limit ?
  `).all(...params, parsed.limit) as DbEvent[]

  return rows.map(mapEvent)
}

interface DbEvent {
  id: string
  project_id: string
  session_id: string
  project_name: string
  session_name: string
  type: string
  status: RelayEvent["status"]
  summary: string
  details: string | null
  tags_json: string
  links_json: string
  created_at: string
}

function mapEvent(row: DbEvent): RelayEvent {
  return {
    id: row.id,
    projectId: row.project_id,
    sessionId: row.session_id,
    project: row.project_name,
    session: row.session_name,
    type: row.type,
    status: row.status,
    summary: row.summary,
    details: row.details ?? undefined,
    tags: JSON.parse(row.tags_json) as string[],
    links: JSON.parse(row.links_json) as RelayLink[],
    createdAt: row.created_at
  }
}
