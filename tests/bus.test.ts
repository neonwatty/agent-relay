import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { claim, listClaims, notify, presence, releaseClaim } from "../src/bus.js"
import { configureRelay } from "../src/index.js"
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

  it("scopes implicit claim conflicts to the resolved project", () => {
    const homeDir = setup()
    const firstProject = join(homeDir, "first-project")
    const secondProject = join(homeDir, "second-project")
    mkdirSync(firstProject)
    mkdirSync(secondProject)
    writeFileSync(join(firstProject, "package.json"), JSON.stringify({ name: "first-project" }))
    writeFileSync(join(secondProject, "package.json"), JSON.stringify({ name: "second-project" }))

    configureRelay({ homeDir, cwd: firstProject })
    const first = claim({
      session: "worker-a",
      scopes: [{ kind: "resource", name: "shared-db" }]
    })

    configureRelay({ homeDir, cwd: secondProject })
    const second = claim({
      session: "worker-b",
      scopes: [{ kind: "resource", name: "shared-db" }]
    })

    expect(first.record.project).toBe("first-project")
    expect(second.record.project).toBe("second-project")
    expect(second.conflicts).toEqual([])
  })

  it("scopes same-name project claim listing to the current root", () => {
    const homeDir = setup()
    const firstRoot = join(homeDir, "workspace-a")
    const secondRoot = join(homeDir, "workspace-b")
    mkdirSync(firstRoot)
    mkdirSync(secondRoot)
    writeFileSync(join(firstRoot, "package.json"), JSON.stringify({ name: "shared-package" }))
    writeFileSync(join(secondRoot, "package.json"), JSON.stringify({ name: "shared-package" }))

    configureRelay({ homeDir, cwd: firstRoot })
    const first = claim({
      session: "worker-a",
      scopes: [{ kind: "resource", name: "shared-db" }]
    })

    configureRelay({ homeDir, cwd: secondRoot })
    const second = claim({
      session: "worker-b",
      scopes: [{ kind: "resource", name: "shared-db" }]
    })

    expect(second.conflicts).toEqual([])
    expect(listClaims({ project: "shared-package" }).map((record) => record.id)).toEqual([second.record.id])

    configureRelay({ homeDir, cwd: firstRoot })
    expect(listClaims({ project: "shared-package" }).map((record) => record.id)).toEqual([first.record.id])
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

  it("preserves explicit null notification payloads", () => {
    setup()

    const explicitNull = notify({
      project: "pkg",
      session: "worker-a",
      summary: "No payload",
      payload: null
    })
    const omitted = notify({
      project: "pkg",
      session: "worker-a",
      summary: "Default payload"
    })

    expect(explicitNull.payload).toBeNull()
    expect(omitted.payload).toEqual({})
  })

  it("treats explicit undefined notification payloads like omitted payloads", () => {
    setup()

    const record = notify({
      project: "pkg",
      session: "worker-a",
      summary: "Default payload",
      payload: undefined
    })

    expect(record.payload).toEqual({})
  })
})
