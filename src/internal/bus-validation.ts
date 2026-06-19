import type { BusRecord, ClaimInput, ClaimScope, HandoffInput } from "../types.js"

export function parseTtl(ttl: string): number {
  const match = ttl.match(/^(\d+)(m|h|d)$/)
  if (!match) {
    throw new Error(`Invalid TTL: ${ttl}`)
  }

  const value = Number(match[1])
  const unit = match[2]
  if (unit === "m") return value * 60 * 1000
  if (unit === "h") return value * 60 * 60 * 1000
  return value * 24 * 60 * 60 * 1000
}

export function validateClaimInput(input: ClaimInput): void {
  if (input.scopes.length === 0) {
    throw new Error("Claim requires at least one scope")
  }

  for (const scope of input.scopes) {
    if (scope.kind === "files") {
      if (scope.patterns.length === 0 || scope.patterns.some((pattern) => pattern.trim().length === 0)) {
        throw new Error("Files claim scope requires at least one non-empty pattern")
      }
    } else if (scope.kind === "resource") {
      if (scope.name.trim().length === 0) {
        throw new Error("Resource claim scope requires a non-empty name")
      }
    } else if (scope.kind === "task" && scope.name.trim().length === 0) {
      throw new Error("Task claim scope requires a non-empty name")
    }
  }
}

export function validateHandoffInput(input: HandoffInput): void {
  if (input.toRole.trim().length === 0) {
    throw new Error("Handoff requires a non-empty toRole")
  }
  if (input.summary.trim().length === 0) {
    throw new Error("Handoff requires a non-empty summary")
  }
}

export function getClaimScopes(record: BusRecord): ClaimScope[] {
  const payload = record.payload as { scopes?: unknown }
  return Array.isArray(payload.scopes) ? (payload.scopes as ClaimScope[]) : []
}
