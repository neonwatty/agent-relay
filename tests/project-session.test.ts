import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { configureRelay } from "../src/index.js"
import type { ProjectRefInput, RelayProject, RelaySession } from "../src/index.js"
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

  it("uses explicit project names with inferred project roots", () => {
    const homeDir = tempDir()
    const root = tempDir()
    const cwd = join(root, "src")
    mkdirSync(cwd, { recursive: true })
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "@scope/root-package" }))
    configureRelay({ homeDir, cwd })
    const project = resolveProject({ project: "explicit-name" })
    expect(project.name).toBe("explicit-name")
    expect(project.rootPath).toBe(root)
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
    const input: ProjectRefInput = {
      project: "my-package",
      session: "vitest-repro",
      role: "testing",
      status: "active"
    }
    const result = upsertProjectAndSession(db, input)
    const project: RelayProject = result.project
    const session: RelaySession = result.session
    expect(project.name).toBe("my-package")
    expect(session.name).toBe("vitest-repro")
    expect(session.status).toBe("active")
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

  it("refreshes an existing session without creating duplicates", () => {
    const homeDir = tempDir()
    const root = tempDir()
    const firstCwd = join(root, "packages", "demo")
    const secondCwd = join(root, "packages", "demo", "src")
    mkdirSync(secondCwd, { recursive: true })
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "@scope/root-package" }))
    let tick = 0
    const now = () => new Date(tick++ === 0 ? "2026-01-01T00:00:00.000Z" : "2026-01-01T00:00:01.000Z")
    configureRelay({ homeDir, cwd: firstCwd, now })
    let db = openRelayDb()
    const first = upsertProjectAndSession(db, {
      session: "shared",
      role: "testing",
      status: "active"
    })

    configureRelay({ homeDir, cwd: secondCwd, now })
    db = openRelayDb()
    const second = upsertProjectAndSession(db, { session: "shared", status: "blocked" })

    expect(second.project.id).toBe(first.project.id)
    expect(second.session.id).toBe(first.session.id)
    expect(second.session.role).toBe("testing")
    expect(second.session.status).toBe("blocked")
    expect(second.session.cwd).toBe(secondCwd)
    expect(second.session.lastSeenAt).toBe("2026-01-01T00:00:01.000Z")
    expect(db.prepare("select count(*) as count from projects").get()).toEqual({ count: 1 })
    expect(db.prepare("select count(*) as count from sessions").get()).toEqual({ count: 1 })
  })

  it("uses configured defaults for project and session", () => {
    const homeDir = tempDir()
    const root = tempDir()
    const cwd = join(root, "packages", "demo")
    mkdirSync(cwd, { recursive: true })
    writeFileSync(join(cwd, "package.json"), JSON.stringify({ name: "@scope/child-package" }))
    configureRelay({ homeDir, cwd, defaultProject: "configured-project", defaultSession: "configured-session" })
    const db = openRelayDb()
    const result = upsertProjectAndSession(db, {})
    expect(result.project.name).toBe("configured-project")
    expect(result.project.rootPath).toBe(cwd)
    expect(result.session.name).toBe("configured-session")
  })

  it("falls back to the cwd basename when no package or git root is found", () => {
    const homeDir = tempDir()
    const root = tempDir()
    const cwd = join(root, "plain-project")
    mkdirSync(cwd, { recursive: true })
    configureRelay({ homeDir, cwd })
    const project = resolveProject({})
    expect(project.name).toBe("plain-project")
    expect(project.rootPath).toBe(cwd)
  })
})
