import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { configureRelay, getEvent, latest, publish, search } from "../src/index.js"
import { closeRelayDb } from "../src/internal/db.js"

const tempDirs: string[] = []

function tempHome() {
  const dir = mkdtempSync(join(tmpdir(), "agent-relay-ledger-"))
  tempDirs.push(dir)
  configureRelay({ homeDir: dir, cwd: dir })
  return dir
}

afterEach(() => {
  closeRelayDb()
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("ledger API", () => {
  it("publishes and retrieves an event", () => {
    tempHome()
    const event = publish({
      project: "my-package",
      session: "vitest-repro",
      type: "experiment.result",
      status: "done",
      summary: "Vitest ESM repro confirmed",
      tags: ["esm", "vitest"],
      links: [{ kind: "file", path: "/tmp/repro.md" }]
    })

    expect(event.id).toMatch(/^evt_/)
    expect(event.summary).toBe("Vitest ESM repro confirmed")
    expect(event.tags).toEqual(["esm", "vitest"])
    expect(event.links).toEqual([{ kind: "file", path: "/tmp/repro.md" }])
    expect(getEvent(event.id)?.id).toBe(event.id)
  })

  it("filters latest and search results", () => {
    tempHome()
    publish({ project: "pkg", session: "a", type: "status.update", status: "active", summary: "Working", tags: ["docs"] })
    publish({ project: "pkg", session: "b", type: "experiment.result", status: "done", summary: "ESM works", tags: ["esm"] })
    publish({ project: "other", session: "c", type: "experiment.result", status: "done", summary: "Elsewhere", tags: ["esm"] })

    expect(latest({ project: "pkg", limit: 1 })[0]?.summary).toBe("ESM works")
    expect(search({ project: "pkg", tag: "esm" })).toHaveLength(1)
    expect(search({ project: "pkg", type: "status.update" })).toHaveLength(1)
    expect(search({ project: "pkg", session: "a", status: "active" })[0]?.summary).toBe("Working")
  })

  it("uses the configured clock for event timestamps", () => {
    const dir = tempHome()
    configureRelay({ homeDir: dir, cwd: dir, now: () => new Date("2026-01-01T00:00:00.000Z") })

    const event = publish({
      project: "pkg",
      session: "clock",
      type: "status.update",
      status: "info",
      summary: "Clocked"
    })

    expect(event.createdAt).toBe("2026-01-01T00:00:00.000Z")
  })

  it("filters search results by valid since timestamps", () => {
    const dir = tempHome()
    const dates = [
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:01.000Z",
      "2026-01-01T00:00:02.000Z",
      "2026-01-01T00:00:03.000Z"
    ]
    configureRelay({ homeDir: dir, cwd: dir, now: () => new Date(dates.shift() ?? "2026-01-01T00:00:03.000Z") })

    publish({ project: "pkg", session: "since", type: "status.update", status: "info", summary: "Before" })
    publish({ project: "pkg", session: "since", type: "status.update", status: "info", summary: "After" })

    expect(search({ project: "pkg", since: "2026-01-01T00:00:02.000Z" }).map((event) => event.summary)).toEqual(["After"])
  })

  it("rejects invalid since timestamps", () => {
    tempHome()

    expect(() => search({ since: "banana" })).toThrow(/since/i)
  })

  it("rejects oversized summaries", () => {
    tempHome()
    expect(() =>
      publish({
        project: "pkg",
        session: "a",
        type: "status.update",
        status: "info",
        summary: "x".repeat(501)
      })
    ).toThrow(/summary/i)
  })
})
