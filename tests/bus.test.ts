import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { claim, listClaims, notify, presence, releaseClaim } from "../src/bus.js"
import { configureRelay } from "../src/index.js"
import { parseTtl } from "../src/internal/bus.js"
import { findScopeConflicts } from "../src/internal/conflicts.js"
import { closeRelayDb, openRelayDb } from "../src/internal/db.js"

const tempDirs: string[] = []

function setup(now?: () => Date) {
  const dir = mkdtempSync(join(tmpdir(), "agent-relay-bus-"))
  tempDirs.push(dir)
  configureRelay({ homeDir: dir, cwd: dir, now })
  return dir
}

afterEach(() => {
  closeRelayDb()
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("bus API", () => {
  it("records and upserts presence", () => {
    setup()

    const first = presence({ project: "pkg", session: "worker-a", role: "tests" })
    const second = presence({ project: "pkg", session: "worker-a", role: "review" })

    expect(first.kind).toBe("presence")
    expect(second.id).toBe(first.id)
    expect(second.session).toBe("worker-a")
    expect(second.summary).toBe("review")
    expect(second.payload).toEqual({ role: "review" })
    expect(openRelayDb().prepare("select count(*) as count from bus_records where kind = 'presence'").get()).toEqual({
      count: 1
    })
  })

  it("uses configured time and default TTLs for bus records", () => {
    setup(() => new Date("2026-01-01T00:00:00.000Z"))

    const active = presence({ project: "pkg", session: "worker-a" })
    const claimed = claim({ project: "pkg", session: "worker-a", scopes: [{ kind: "resource", name: "db" }] }).record
    const message = notify({ project: "pkg", session: "worker-a", summary: "Artifact ready" })

    expect(active.createdAt).toBe("2026-01-01T00:00:00.000Z")
    expect(active.expiresAt).toBe("2026-01-01T00:10:00.000Z")
    expect(claimed.expiresAt).toBe("2026-01-01T00:45:00.000Z")
    expect(message.expiresAt).toBe("2026-01-01T01:00:00.000Z")
  })

  it("creates and releases claims", () => {
    setup()

    const first = claim({
      project: "pkg",
      session: "worker-a",
      scopes: [{ kind: "files", patterns: ["src/**"] }],
      ttl: "45m"
    })
    expect(first.record.kind).toBe("claim")
    expect(first.conflicts).toEqual([])

    const second = claim({
      project: "pkg",
      session: "worker-b",
      scopes: [{ kind: "files", patterns: ["src/index.ts"] }],
      ttl: "45m"
    })
    expect(second.conflicts[0]?.confidence).toBe("possible")
    expect(second.conflicts[0]?.claimId).toBe(first.record.id)
    expect(listClaims({ project: "pkg" })).toHaveLength(2)

    expect(releaseClaim(first.record.id)).toBe(true)
    expect(listClaims({ project: "pkg" })).toHaveLength(1)
    expect(releaseClaim(first.record.id)).toBe(false)
  })

  it("rejects empty claim scopes", () => {
    setup()

    expect(() => claim({ project: "pkg", session: "worker-a", scopes: [] })).toThrow(/scope/i)
  })

  it("ignores expired claims and filters active claims by project", () => {
    let currentTime = "2026-01-01T00:00:00.000Z"
    setup(() => new Date(currentTime))

    claim({ project: "pkg", session: "worker-a", scopes: [{ kind: "resource", name: "db" }], ttl: "1m" })
    currentTime = "2026-01-01T00:02:00.000Z"
    claim({ project: "other", session: "worker-b", scopes: [{ kind: "resource", name: "db" }], ttl: "1h" })

    expect(listClaims()).toHaveLength(1)
    expect(listClaims({ project: "pkg" })).toHaveLength(0)
    expect(listClaims({ project: "other" })).toHaveLength(1)
  })

  it("reports exact and possible claim conflicts", () => {
    setup()

    const resource = claim({
      project: "pkg",
      session: "worker-a",
      scopes: [{ kind: "resource", name: "shared-db" }],
      summary: "Migrate shared db"
    })
    const task = claim({
      project: "pkg",
      session: "worker-b",
      scopes: [{ kind: "task", name: "Update README" }]
    })

    const resourceConflict = claim({
      project: "pkg",
      session: "worker-c",
      scopes: [{ kind: "resource", name: "shared-db" }]
    })
    const taskConflict = claim({
      project: "pkg",
      session: "worker-d",
      scopes: [{ kind: "task", name: "  update   readme  " }]
    })

    expect(resourceConflict.conflicts).toContainEqual(
      expect.objectContaining({
        claimId: resource.record.id,
        confidence: "exact",
        summary: "Migrate shared db"
      })
    )
    expect(taskConflict.conflicts).toContainEqual(
      expect.objectContaining({
        claimId: task.record.id,
        confidence: "possible"
      })
    )
  })

  it("creates notifications", () => {
    setup()

    const record = notify({
      project: "pkg",
      session: "worker-a",
      summary: "Artifact ready",
      payload: { eventId: "evt_123" }
    })

    expect(record.kind).toBe("notification")
    expect(record.summary).toBe("Artifact ready")
    expect(record.payload).toEqual({ eventId: "evt_123" })
  })
})

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
})
