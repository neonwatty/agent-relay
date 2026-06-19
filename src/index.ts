import type { RelayConfig } from "./types.js"

export type { RelayConfig, RelayStatus } from "./types.js"

export function configureRelay(_config: RelayConfig): void {
  throw new Error("configureRelay is not implemented yet")
}
