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
