import type { EventQuery, PublishEventInput, RelayConfig } from "./types.js"
import { configure } from "./internal/config.js"
import { closeRelayDb } from "./internal/db.js"
import { getEventById, latestEvents, publishEvent, searchEvents } from "./internal/ledger.js"

export type {
  EventQuery,
  ProjectRefInput,
  PublishEventInput,
  RelayConfig,
  RelayEvent,
  RelayLink,
  RelayProject,
  RelaySession,
  RelayStatus
} from "./types.js"

export function configureRelay(config: RelayConfig): void {
  closeRelayDb()
  configure(config)
}

export const publish = (input: PublishEventInput) => publishEvent(input)
export const getEvent = (id: string) => getEventById(id)
export const latest = (query: EventQuery = {}) => latestEvents(query)
export const search = (query: EventQuery = {}) => searchEvents(query)
