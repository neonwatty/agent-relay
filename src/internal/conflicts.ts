import type { ClaimConflict, ClaimScope } from "../types.js"

interface ExistingClaim {
  id: string
  session: string
  scopes: ClaimScope[]
  expiresAt: string
  summary?: string
}

export function findScopeConflicts(existing: ExistingClaim[], requested: ClaimScope[]): ClaimConflict[] {
  const conflicts: ClaimConflict[] = []

  for (const claim of existing) {
    for (const currentScope of claim.scopes) {
      for (const requestedScope of requested) {
        const confidence = conflictConfidence(currentScope, requestedScope)
        if (confidence) {
          conflicts.push({
            claimId: claim.id,
            session: claim.session,
            scope: currentScope,
            expiresAt: claim.expiresAt,
            summary: claim.summary,
            confidence
          })
        }
      }
    }
  }

  return conflicts
}

function conflictConfidence(a: ClaimScope, b: ClaimScope): "exact" | "possible" | undefined {
  if (a.kind !== b.kind) {
    return undefined
  }

  if (a.kind === "resource" && b.kind === "resource") {
    return a.name === b.name ? "exact" : undefined
  }

  if (a.kind === "task" && b.kind === "task") {
    return normalizeTask(a.name) === normalizeTask(b.name) ? "possible" : undefined
  }

  if (a.kind === "files" && b.kind === "files") {
    return filePatternsOverlap(a.patterns, b.patterns) ? "possible" : undefined
  }

  return undefined
}

function filePatternsOverlap(a: string[], b: string[]): boolean {
  for (const leftPattern of a) {
    for (const rightPattern of b) {
      const left = normalizePattern(leftPattern)
      const right = normalizePattern(rightPattern)

      if (left === right) {
        return true
      }

      if (globMatches(right, left) || globMatches(left, right)) {
        return true
      }

      if (left.includes("**") || right.includes("**")) {
        const leftPrefix = left.split("**")[0]
        const rightPrefix = right.split("**")[0]
        if (leftPrefix && right.startsWith(leftPrefix)) return true
        if (rightPrefix && left.startsWith(rightPrefix)) return true
      }
    }
  }

  return false
}

function normalizePattern(value: string): string {
  return value.trim().replace(/^\.\//, "")
}

function normalizeTask(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function globMatches(input: string, pattern: string): boolean {
  return globToRegExp(pattern).test(input)
}

function globToRegExp(pattern: string): RegExp {
  let source = "^"

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index]
    const next = pattern[index + 1]

    if (char === "*" && next === "*") {
      source += ".*"
      index += 1
    } else if (char === "*") {
      source += "[^/]*"
    } else if (char === "?") {
      source += "[^/]"
    } else {
      source += escapeRegExp(char)
    }
  }

  return new RegExp(`${source}$`)
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&")
}
