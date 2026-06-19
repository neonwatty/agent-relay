export type {
  BusKind,
  BusRecord,
  ClaimConflict,
  ClaimInput,
  ClaimQuery,
  ClaimResult,
  ClaimScope,
  NotifyInput,
  PresenceInput
} from "./types.js"

import type { ClaimInput, ClaimQuery, NotifyInput, PresenceInput } from "./types.js"
import { createClaim, createNotification, listActiveClaims, releaseClaimById, upsertPresence } from "./internal/bus.js"

export const presence = (input: PresenceInput) => upsertPresence(input)
export const claim = (input: ClaimInput) => createClaim(input)
export const releaseClaim = (id: string) => releaseClaimById(id)
export const listClaims = (query: ClaimQuery = {}) => listActiveClaims(query)
export const notify = (input: NotifyInput) => createNotification(input)
