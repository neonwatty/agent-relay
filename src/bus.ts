export type {
  BusKind,
  BusRecord,
  ClaimConflict,
  ClaimInput,
  ClaimQuery,
  ClaimResult,
  ClaimScope,
  HandoffInput,
  HandoffResult,
  NotifyInput,
  PresenceInput
} from "./types.js"

import type { ClaimInput, ClaimQuery, HandoffInput, NotifyInput, PresenceInput } from "./types.js"
import {
  cleanupExpired,
  createClaim,
  createHandoff,
  createNotification,
  listActiveClaims,
  releaseClaimById,
  upsertPresence
} from "./internal/bus.js"

export const presence = (input: PresenceInput) => upsertPresence(input)
export const claim = (input: ClaimInput) => createClaim(input)
export const releaseClaim = (id: string) => releaseClaimById(id)
export const listClaims = (query: ClaimQuery = {}) => listActiveClaims(query)
export const notify = (input: NotifyInput) => createNotification(input)
export const handoff = (input: HandoffInput) => createHandoff(input)
export const cleanupExpiredBusRecords = () => cleanupExpired()
