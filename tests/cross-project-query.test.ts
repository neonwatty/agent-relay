import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { claim, listClaims } from "../src/bus.js"
import { configureRelay, latest, publish } from "../src/index.js"
import { closeRelayDb } from "../src/internal/db.js"

const tempDirs: string[] = []

function setup() {
  const homeDir = mkdtempSync(join(tmpdir(), "agent-relay-cross-project-"))
  tempDirs.push(homeDir)
  return homeDir
}

function packageRoot(homeDir: string, name: string) {
  const root = join(homeDir, name)
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, "package.json"), JSON.stringify({ name }))
  return root
}

afterEach(() => {
  closeRelayDb()
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("cross-project queries", () => {
  it("reads unique project events from a different project cwd", () => {
    const homeDir = setup()
    const alpha = packageRoot(homeDir, "alpha-project")
    const beta = packageRoot(homeDir, "beta-project")

    configureRelay({ homeDir, cwd: alpha })
    const event = publish({
      session: "session-a",
      type: "experiment.result",
      status: "done",
      summary: "Alpha package experiment passed"
    })

    configureRelay({ homeDir, cwd: beta })
    expect(latest({ project: "alpha-project" }).map((result) => result.id)).toEqual([event.id])
  })

  it("reads unique project claims from a different project cwd", () => {
    const homeDir = setup()
    const alpha = packageRoot(homeDir, "alpha-project")
    const beta = packageRoot(homeDir, "beta-project")

    configureRelay({ homeDir, cwd: alpha })
    const first = claim({
      session: "session-a",
      scopes: [{ kind: "files", patterns: ["src/**"] }],
      summary: "Touch alpha src"
    }).record

    configureRelay({ homeDir, cwd: beta })
    expect(listClaims({ project: "alpha-project" }).map((record) => record.id)).toEqual([first.id])
  })

  it("requires cwd disambiguation for same-name projects outside their roots", () => {
    const homeDir = setup()
    const first = join(homeDir, "workspace-a")
    const second = join(homeDir, "workspace-b")
    const observer = packageRoot(homeDir, "observer-project")
    mkdirSync(first)
    mkdirSync(second)
    writeFileSync(join(first, "package.json"), JSON.stringify({ name: "shared-package" }))
    writeFileSync(join(second, "package.json"), JSON.stringify({ name: "shared-package" }))

    configureRelay({ homeDir, cwd: first })
    publish({ session: "a", type: "status.update", status: "done", summary: "First" })
    configureRelay({ homeDir, cwd: second })
    publish({ session: "b", type: "status.update", status: "done", summary: "Second" })

    configureRelay({ homeDir, cwd: observer })
    expect(() => latest({ project: "shared-package" })).toThrow(/multiple roots/)
  })
})
