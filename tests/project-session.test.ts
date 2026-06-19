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
    const cwd = tempDir()
    configureRelay({ homeDir, cwd })
    const project = resolveProject({ project: "explicit-name" })
    expect(project.name).toBe("explicit-name")
    expect(project.rootPath).toBe(cwd)
  })

  it("infers nearest package name", () => {
    const homeDir = tempDir()
    const root = tempDir()
    const child = join(root, "packages", "demo")
    mkdirSync(child, { recursive: true })
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "@scope/root-package" }))
    configureRelay({ homeDir, cwd: child })
    const project = resolveProject({})
    expect(project.name).toBe("@scope/root-package")
    expect(project.rootPath).toBe(root)
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
})
