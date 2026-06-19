import type { RelayEvent, RelayLink } from "../types.js"
import { openRelayDb } from "./db.js"

export function exportJsonl(): string {
  return listEventsOldestFirst()
    .map((event) => JSON.stringify(event))
    .join("\n")
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

function listEventsOldestFirst(): RelayEvent[] {
  const rows = openRelayDb().prepare(`
    select e.*, p.name as project_name, s.name as session_name
    from events e
    join projects p on p.id = e.project_id
    join sessions s on s.id = e.session_id
    order by e.created_at asc, e.rowid asc
  `).all() as DbEvent[]

  return rows.map((row) => ({
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
  }))
}
