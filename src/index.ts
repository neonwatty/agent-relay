import type { RelayConfig } from "./types.js"
import { configure } from "./internal/config.js"
import { closeRelayDb } from "./internal/db.js"

export type { ProjectRefInput, RelayConfig, RelayProject, RelaySession, RelayStatus } from "./types.js"

export function configureRelay(config: RelayConfig): void {
  closeRelayDb()
  configure(config)
}
