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
