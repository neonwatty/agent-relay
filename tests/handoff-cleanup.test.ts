import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { cleanupExpiredBusRecords, handoff, notify } from "../src/bus.js"
import { configureRelay, latest } from "../src/index.js"
import { closeRelayDb, openRelayDb } from "../src/internal/db.js"

const tempDirs: string[] = []

function setup(now?: () => Date) {
  const dir = mkdtempSync(join(tmpdir(), "agent-relay-handoff-"))
  tempDirs.push(dir)
  configureRelay({ homeDir: dir, cwd: dir, now })
}

afterEach(() => {
  closeRelayDb()
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("handoff and cleanup", () => {
  it("creates a durable handoff event and expiring bus notification", () => {
    setup(() => new Date("2026-01-01T00:00:00.000Z"))

    const result = handoff({
      project: "pkg",
      session: "worker-a",
      toRole: "docs",
      summary: "Docs should cover the ESM caveat",
      eventId: "evt_related"
    })

    expect(result.event).toEqual(
      expect.objectContaining({
        type: "handoff.requested",
        status: "todo",
        summary: "Docs should cover the ESM caveat",
        details: "Related event: evt_related",
        tags: ["handoff", "docs"]
      })
    )
    expect(result.notification).toEqual(
      expect.objectContaining({
        kind: "handoff",
        summary: "Docs should cover the ESM caveat",
        expiresAt: "2026-01-02T00:00:00.000Z"
      })
    )
    expect(result.notification.payload).toEqual({
      toRole: "docs",
      eventId: result.event.id,
      relatedEventId: "evt_related"
    })
    expect(latest({ project: "pkg", type: "handoff.requested" })).toHaveLength(1)
  })

  it("rejects invalid handoff TTLs before writing durable or bus records", () => {
    setup()

    expect(() =>
      handoff({
        project: "pkg",
        session: "worker-a",
        toRole: "docs",
        summary: "Docs should cover the ESM caveat",
        ttl: "soon"
      })
    ).toThrow(/Invalid TTL: soon/)

    expect(latest({ project: "pkg", type: "handoff.requested" })).toHaveLength(0)
    expect(openRelayDb().prepare("select count(*) as count from bus_records where kind = 'handoff'").get()).toEqual({
      count: 0
    })
  })

  it("cleans expired bus records using the configured clock", () => {
    setup(() => new Date("2026-01-01T00:02:00.000Z"))

    notify({
      project: "pkg",
      session: "worker-a",
      summary: "expired",
      ttl: "1m"
    })
    notify({
      project: "pkg",
      session: "worker-a",
      summary: "active",
      ttl: "1h"
    })

    const db = openRelayDb()
    expect(db.prepare("select count(*) as count from bus_records").get()).toEqual({ count: 2 })
    expect(cleanupExpiredBusRecords()).toBe(0)

    configureRelay({
      homeDir: tempDirs[0],
      cwd: tempDirs[0],
      now: () => new Date("2026-01-01T00:04:00.000Z")
    })

    expect(cleanupExpiredBusRecords()).toBe(1)
    expect(openRelayDb().prepare("select summary from bus_records").all()).toEqual([{ summary: "active" }])
  })
})
