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
