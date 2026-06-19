export type RelayStatus =
  | "info"
  | "todo"
  | "active"
  | "blocked"
  | "done"
  | "failed"
  | "superseded"

export interface RelayConfig {
  homeDir?: string
  dbPath?: string
  defaultProject?: string
  defaultSession?: string
  cwd?: string
  now?: () => Date
}

export interface ProjectRefInput {
  project?: string
  session?: string
  role?: string
  status?: RelayStatus
}

export interface RelayProject {
  id: string
  name: string
  rootPath: string
  createdAt: string
  updatedAt: string
}

export interface RelaySession {
  id: string
  projectId: string
  name: string
  role?: string
  cwd: string
  status: RelayStatus
  lastSeenAt: string
  createdAt: string
  updatedAt: string
}

export interface RelayLink {
  kind: "file" | "url"
  path?: string
  url?: string
}

export interface PublishEventInput extends ProjectRefInput {
  type: string
  status: RelayStatus
  summary: string
  details?: string
  tags?: string[]
  links?: RelayLink[]
}

export interface RelayEvent {
  id: string
  projectId: string
  sessionId: string
  project: string
  session: string
  type: string
  status: RelayStatus
  summary: string
  details?: string
  tags: string[]
  links: RelayLink[]
  createdAt: string
}

export interface EventQuery {
  project?: string
  session?: string
  type?: string
  status?: RelayStatus
  tag?: string
  since?: string
  limit?: number
}

export type BusKind = "presence" | "claim" | "notification" | "handoff" | "wait-condition"

export type ClaimScope =
  | { kind: "files"; patterns: string[] }
  | { kind: "resource"; name: string }
  | { kind: "task"; name: string }

export interface BusRecord {
  id: string
  projectId: string
  sessionId: string
  project: string
  session: string
  kind: BusKind
  summary?: string
  payload: unknown
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export interface PresenceInput extends ProjectRefInput {
  ttl?: string
}

export interface ClaimInput extends ProjectRefInput {
  scopes: ClaimScope[]
  ttl?: string
  summary?: string
}

export interface ClaimResult {
  record: BusRecord
  conflicts: ClaimConflict[]
}

export interface ClaimConflict {
  claimId: string
  session: string
  scope: ClaimScope
  expiresAt: string
  summary?: string
  confidence: "exact" | "possible"
}

export interface ClaimQuery {
  project?: string
}

export interface NotifyInput extends ProjectRefInput {
  summary: string
  payload?: unknown
  ttl?: string
}

export interface HandoffInput extends ProjectRefInput {
  toRole: string
  summary: string
  eventId?: string
  ttl?: string
}

export interface HandoffResult {
  event: RelayEvent
  notification: BusRecord
}
