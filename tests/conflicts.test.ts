import { describe, expect, it } from "vitest"
import { parseTtl } from "../src/internal/bus.js"
import { findScopeConflicts } from "../src/internal/conflicts.js"

describe("bus internals", () => {
  it("parses integer minute, hour, and day TTLs", () => {
    expect(parseTtl("2m")).toBe(2 * 60 * 1000)
    expect(parseTtl("3h")).toBe(3 * 60 * 60 * 1000)
    expect(parseTtl("4d")).toBe(4 * 24 * 60 * 60 * 1000)
    expect(() => parseTtl("1.5h")).toThrow(/ttl/i)
  })

  it("finds equivalent and overlapping file pattern conflicts", () => {
    const conflicts = findScopeConflicts(
      [
        {
          id: "claim_a",
          session: "worker-a",
          scopes: [{ kind: "files", patterns: ["./src/**", "README.md"] }],
          expiresAt: "2026-01-01T00:45:00.000Z"
        }
      ],
      [{ kind: "files", patterns: ["src/index.ts"] }]
    )

    expect(conflicts).toEqual([
      expect.objectContaining({
        claimId: "claim_a",
        confidence: "possible"
      })
    ])
  })

  it("finds overlapping wildcard file pattern conflicts", () => {
    const conflicts = findScopeConflicts(
      [
        {
          id: "claim_wildcard",
          session: "worker-a",
          scopes: [{ kind: "files", patterns: ["src/*.ts"] }],
          expiresAt: "2026-01-01T00:45:00.000Z"
        }
      ],
      [{ kind: "files", patterns: ["src/index.*"] }]
    )

    expect(conflicts).toEqual([
      expect.objectContaining({
        claimId: "claim_wildcard",
        confidence: "possible"
      })
    ])
  })
})
