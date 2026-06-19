import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { claim } from "../src/bus.js"
import { configureRelay } from "../src/index.js"
import { closeRelayDb } from "../src/internal/db.js"

const tempDirs: string[] = []

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "agent-relay-bus-validation-"))
  tempDirs.push(dir)
  configureRelay({ homeDir: dir, cwd: dir })
}

afterEach(() => {
  closeRelayDb()
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("bus validation", () => {
  it("rejects empty claim scopes", () => {
    setup()

    expect(() => claim({ project: "pkg", session: "worker-a", scopes: [] })).toThrow(/scope/i)
  })

  it("rejects invalid claim scope values", () => {
    setup()

    expect(() =>
      claim({
        project: "pkg",
        session: "worker-a",
        scopes: [{ kind: "files", patterns: [] }]
      })
    ).toThrow(/pattern/i)
    expect(() =>
      claim({
        project: "pkg",
        session: "worker-a",
        scopes: [{ kind: "files", patterns: ["src/**", "  "] }]
      })
    ).toThrow(/pattern/i)
    expect(() =>
      claim({
        project: "pkg",
        session: "worker-a",
        scopes: [{ kind: "resource", name: "  " }]
      })
    ).toThrow(/resource/i)
    expect(() =>
      claim({
        project: "pkg",
        session: "worker-a",
        scopes: [{ kind: "task", name: "  " }]
      })
    ).toThrow(/task/i)
  })

  it("rejects invalid claim TTLs with a clear error", () => {
    setup()

    expect(() =>
      claim({
        project: "pkg",
        session: "worker-a",
        scopes: [{ kind: "resource", name: "db" }],
        ttl: "soon"
      })
    ).toThrow(/Invalid TTL: soon/)
  })
})
