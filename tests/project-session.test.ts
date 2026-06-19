import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { configureRelay } from "../src/index.js"
import { closeRelayDb, openRelayDb } from "../src/internal/db.js"
import { resolveProject, upsertProjectAndSession } from "../src/internal/project-session.js"

const tempDirs: string[] = []

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), "agent-relay-project-"))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  closeRelayDb()
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("project and session resolution", () => {
  it("uses explicit project before filesystem inference", () => {
    const homeDir = tempDir()
    const root = tempDir()
    const cwd = join(root, "packages", "demo")
    mkdirSync(cwd, { recursive: true })
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "@scope/root-package" }))
    writeFileSync(join(cwd, "package.json"), JSON.stringify({ name: "@scope/child-package" }))
    configureRelay({ homeDir, cwd })
    const project = resolveProject({ project: "explicit-name" })
    expect(project.name).toBe("explicit-name")
    expect(project.rootPath).toBe(cwd)
  })

  it("infers nearest package name", () => {
    const homeDir = tempDir()
    const root = tempDir()
    const child = join(root, "packages", "demo")
    const cwd = join(child, "src")
    mkdirSync(cwd, { recursive: true })
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "@scope/root-package" }))
    writeFileSync(join(child, "package.json"), JSON.stringify({ name: "@scope/child-package" }))
    configureRelay({ homeDir, cwd })
    const project = resolveProject({})
    expect(project.name).toBe("@scope/child-package")
    expect(project.rootPath).toBe(child)
  })

  it("upserts a project and session", () => {
    const homeDir = tempDir()
    const cwd = tempDir()
    configureRelay({ homeDir, cwd })
    const db = openRelayDb()
    const result = upsertProjectAndSession(db, {
      project: "my-package",
      session: "vitest-repro",
      role: "testing",
      status: "active"
    })
    expect(result.project.name).toBe("my-package")
    expect(result.session.name).toBe("vitest-repro")
    expect(result.session.status).toBe("active")
  })

  it("returns the refreshed project after updating an existing row", () => {
    const homeDir = tempDir()
    const cwd = tempDir()
    let tick = 0
    configureRelay({
      homeDir,
      cwd,
      now: () => new Date(tick++ === 0 ? "2026-01-01T00:00:00.000Z" : "2026-01-01T00:00:01.000Z")
    })
    const db = openRelayDb()
    upsertProjectAndSession(db, { project: "my-package", session: "vitest-repro" })
    const result = upsertProjectAndSession(db, { project: "my-package", session: "vitest-repro" })
    expect(result.project.updatedAt).toBe("2026-01-01T00:00:01.000Z")
  })
})
