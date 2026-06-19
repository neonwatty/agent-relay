import type { ClaimScope, EventQuery, RelayStatus } from "../types.js"

export interface JsonOption {
  json?: boolean
}

export interface PublishOptions extends JsonOption {
  project?: string
  session?: string
  type: string
  status: string
  summary: string
  details?: string
  tag: string[]
}

export interface EventQueryOptions extends JsonOption {
  project?: string
  session?: string
  type?: string
  status?: string
  tag?: string
  since?: string
  limit?: number
}

export interface PresenceOptions extends JsonOption {
  project?: string
  session?: string
  status?: string
  role?: string
  ttl?: string
}

export interface ClaimOptions extends JsonOption {
  project?: string
  session?: string
  status?: string
  files: string[]
  resource: string[]
  task: string[]
  summary?: string
  ttl?: string
}

export interface ClaimsOptions extends JsonOption {
  project?: string
}

export interface NotifyOptions extends JsonOption {
  project?: string
  session?: string
  status?: string
  summary: string
  ttl?: string
}

export interface HandoffOptions extends JsonOption {
  project?: string
  session?: string
  toRole: string
  summary: string
  eventId?: string
  ttl?: string
}

export interface ExportOptions {
  format: string
}

export function collect(value: string, previous: string[]): string[] {
  previous.push(value)
  return previous
}

export function parseLimit(value: string): number {
  const limit = Number(value)
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(`Invalid limit: ${value}`)
  }
  return limit
}

export function parseOptionalStatus(value: string | undefined): RelayStatus | undefined {
  if (value === undefined) {
    return undefined
  }

  if (isRelayStatus(value)) {
    return value
  }

  throw new Error(`Invalid status: ${value}`)
}

export function toEventQuery(options: EventQueryOptions): EventQuery {
  return {
    project: options.project,
    session: options.session,
    type: options.type,
    status: options.status as RelayStatus | undefined,
    tag: options.tag,
    since: options.since,
    limit: options.limit
  }
}

export function toClaimScopes(options: ClaimOptions): ClaimScope[] {
  return [
    ...(options.files.length ? [{ kind: "files" as const, patterns: options.files }] : []),
    ...options.resource.map((name) => ({ kind: "resource" as const, name })),
    ...options.task.map((name) => ({ kind: "task" as const, name }))
  ]
}

function isRelayStatus(value: string): value is RelayStatus {
  return ["info", "todo", "active", "blocked", "done", "failed", "superseded"].includes(value)
}
