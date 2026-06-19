import { existsSync, readFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { nanoid } from "nanoid"
import type { ProjectRefInput, RelayProject, RelaySession } from "../types.js"
import { getConfig } from "./config.js"
import type { RelayDb } from "./db.js"

interface ResolvedProjectInput {
  name: string
  rootPath: string
}

interface DbProject {
  id: string
  name: string
  root_path: string
  created_at: string
  updated_at: string
}

interface DbSession {
  id: string
  project_id: string
  name: string
  role: string | null
  cwd: string
  status: RelaySession["status"]
  last_seen_at: string
  created_at: string
  updated_at: string
}

export function resolveProject(input: ProjectRefInput): ResolvedProjectInput {
  const config = getConfig()
  const explicitProject = input.project ?? config.defaultProject
  if (explicitProject) {
    return { name: explicitProject, rootPath: config.cwd }
  }

  const packageProject = findPackageProject(config.cwd)
  if (packageProject) {
    return packageProject
  }

  const gitRoot = findUp(config.cwd, ".git")
  if (gitRoot) {
    return { name: basename(gitRoot), rootPath: gitRoot }
  }

  return { name: basename(config.cwd), rootPath: config.cwd }
}

export function upsertProjectAndSession(
  db: RelayDb,
  input: ProjectRefInput
): { project: RelayProject; session: RelaySession } {
  const config = getConfig()
  const now = config.now().toISOString()
  const resolvedProject = resolveProject(input)
  const sessionName = input.session ?? config.defaultSession ?? `session-${process.pid}`
  const status = input.status ?? "active"

  let project = db.prepare("select * from projects where name = ? and root_path = ?").get(
    resolvedProject.name,
    resolvedProject.rootPath
  ) as DbProject | undefined

  if (!project) {
    const id = `proj_${nanoid()}`
    db.prepare("insert into projects (id, name, root_path, created_at, updated_at) values (?, ?, ?, ?, ?)").run(
      id,
      resolvedProject.name,
      resolvedProject.rootPath,
      now,
      now
    )
    project = db.prepare("select * from projects where id = ?").get(id) as DbProject
  } else {
    db.prepare("update projects set updated_at = ? where id = ?").run(now, project.id)
  }

  let session = db.prepare("select * from sessions where project_id = ? and name = ?").get(
    project.id,
    sessionName
  ) as DbSession | undefined

  if (!session) {
    const id = `sess_${nanoid()}`
    db.prepare(`
      insert into sessions (id, project_id, name, role, cwd, status, last_seen_at, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, project.id, sessionName, input.role ?? null, config.cwd, status, now, now, now)
    session = db.prepare("select * from sessions where id = ?").get(id) as DbSession
  } else {
    db.prepare(`
      update sessions
      set role = coalesce(?, role), cwd = ?, status = ?, last_seen_at = ?, updated_at = ?
      where id = ?
    `).run(input.role ?? null, config.cwd, status, now, now, session.id)
    session = db.prepare("select * from sessions where id = ?").get(session.id) as DbSession
  }

  return { project: mapProject(project), session: mapSession(session) }
}

function findPackageProject(start: string): ResolvedProjectInput | undefined {
  let current = resolve(start)
  while (true) {
    const packageJsonPath = join(current, "package.json")
    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { name?: unknown }
        if (typeof pkg.name === "string" && pkg.name.length > 0) {
          return { name: pkg.name, rootPath: current }
        }
      } catch {
        // Keep walking upward; a malformed nested package should not hide an outer project.
      }
    }

    const parent = dirname(current)
    if (parent === current) {
      return undefined
    }
    current = parent
  }
}

function findUp(start: string, marker: string): string | undefined {
  let current = resolve(start)
  while (true) {
    if (existsSync(join(current, marker))) {
      return current
    }
    const parent = dirname(current)
    if (parent === current) {
      return undefined
    }
    current = parent
  }
}

function mapProject(row: DbProject): RelayProject {
  return {
    id: row.id,
    name: row.name,
    rootPath: row.root_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapSession(row: DbSession): RelaySession {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    role: row.role ?? undefined,
    cwd: row.cwd,
    status: row.status,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
