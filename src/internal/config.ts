import { homedir } from "node:os"
import { join } from "node:path"
import type { RelayConfig } from "../types.js"

export interface ResolvedRelayConfig {
  homeDir: string
  dbPath: string
  defaultProject?: string
  defaultSession?: string
  cwd: string
  now: () => Date
}

let currentConfig: ResolvedRelayConfig | undefined

export function resolveRelayConfig(config: RelayConfig = {}): ResolvedRelayConfig {
  const homeDir = config.homeDir ?? process.env.AGENT_RELAY_HOME ?? join(homedir(), ".agent-relay")
  const dbPath = config.dbPath ?? process.env.AGENT_RELAY_DB ?? join(homeDir, "relay.db")

  return {
    homeDir,
    dbPath,
    defaultProject: config.defaultProject,
    defaultSession: config.defaultSession,
    cwd: config.cwd ?? process.cwd(),
    now: config.now ?? (() => new Date())
  }
}

export function configure(config: RelayConfig): void {
  currentConfig = resolveRelayConfig(config)
}

export function getConfig(): ResolvedRelayConfig {
  if (!currentConfig) {
    currentConfig = resolveRelayConfig()
  }
  return currentConfig
}
