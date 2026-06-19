import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { configureRelay } from "../src/index.js"
import { closeRelayDb, openRelayDb } from "../src/internal/db.js"
import { resolveRelayConfig } from "../src/internal/config.js"

const tempDirs: string[] = []

function tempHome() {
  const dir = mkdtempSync(join(tmpdir(), "agent-relay-"))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  closeRelayDb()
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("relay database", () => {
  it("resolves default paths under the configured home directory", () => {
    const homeDir = tempHome()
    const config = resolveRelayConfig({ homeDir })
    expect(config.homeDir).toBe(homeDir)
    expect(config.dbPath).toBe(join(homeDir, "relay.db"))
  })

  it("creates schema and stores the user_version migration", () => {
    const homeDir = tempHome()
    configureRelay({ homeDir })
    const db = openRelayDb()
    const version = db.pragma("user_version", { simple: true })
    const journalMode = db.pragma("journal_mode", { simple: true })
    const busyTimeout = db.pragma("busy_timeout", { simple: true })
    const foreignKeys = db.pragma("foreign_keys", { simple: true })
    const tables = db.prepare("select name from sqlite_master where type = 'table' order by name").all() as Array<{ name: string }>

    expect(version).toBe(1)
    expect(journalMode).toBe("wal")
    expect(busyTimeout).toBe(5000)
    expect(foreignKeys).toBe(1)
    expect(tables.map((row) => row.name)).toEqual([
      "bus_records",
      "events",
      "projects",
      "sessions"
    ])
  })
})
