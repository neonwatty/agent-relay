# Agent Relay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@neonwatty/agent-relay`, a local machine-wide TypeScript library and CLI for durable agent/session ledger events plus short-lived coordination bus records.

**Architecture:** Use a focused TypeScript package with a SQLite persistence layer, small service modules for project/session resolution, ledger events, bus records, claim conflicts, and CLI commands. Keep the public API thin and stable while implementation details live under `src/internal`.

**Tech Stack:** TypeScript, Node.js >=20, Vitest, tsup, commander, better-sqlite3, zod, picomatch, nanoid.

---

## File Structure

- Create `package.json`: npm metadata, CLI binary, scripts, dependencies.
- Create `tsconfig.json`: strict TypeScript config.
- Create `tsup.config.ts`: dual ESM/CJS build plus type declarations.
- Create `vitest.config.ts`: test configuration.
- Create `src/index.ts`: public ledger API exports.
- Create `src/bus.ts`: public bus API exports.
- Create `src/cli.ts`: CLI entrypoint.
- Create `src/types.ts`: shared public types.
- Create `src/internal/config.ts`: data directory and database path resolution.
- Create `src/internal/db.ts`: SQLite open, migrations, and transaction helpers.
- Create `src/internal/schema.ts`: SQL schema strings.
- Create `src/internal/validation.ts`: zod schemas and size limits.
- Create `src/internal/project-session.ts`: project/session resolution and upsert helpers.
- Create `src/internal/ledger.ts`: durable event operations.
- Create `src/internal/bus.ts`: presence, notification, handoff, and claims.
- Create `src/internal/conflicts.ts`: advisory conflict detection.
- Create `src/internal/export.ts`: JSONL export.
- Create `src/internal/format.ts`: human and JSON CLI output helpers.
- Create `tests/*.test.ts`: focused unit and integration tests.
- Create `README.md`: install, quickstart, API, CLI examples.

## Task 1: Package Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `src/index.ts`
- Create: `src/bus.ts`
- Create: `src/cli.ts`
- Create: `src/types.ts`
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: Create package metadata**

Create `package.json`:

```json
{
  "name": "@neonwatty/agent-relay",
  "version": "0.1.0",
  "description": "Local machine-wide coordination ledger and bus for AI/developer sessions.",
  "type": "module",
  "license": "MIT",
  "bin": {
    "agent-relay": "./dist/cli.js"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./bus": {
      "types": "./dist/bus.d.ts",
      "import": "./dist/bus.js",
      "require": "./dist/bus.cjs"
    }
  },
  "files": [
    "dist",
    "README.md",
    "docs"
  ],
  "scripts": {
    "build": "tsup",
    "clean": "rm -rf dist coverage",
    "dev": "tsx src/cli.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "better-sqlite3": "^11.10.0",
    "commander": "^14.0.0",
    "nanoid": "^5.1.5",
    "picomatch": "^4.0.2",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^24.0.0",
    "tsup": "^8.5.0",
    "tsx": "^4.20.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Add TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "tests", "tsup.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 3: Add build and test config**

Create `tsup.config.ts`:

```ts
import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    bus: "src/bus.ts",
    cli: "src/cli.ts"
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  banner: {
    js: "#!/usr/bin/env node"
  }
})
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    restoreMocks: true,
    testTimeout: 10000
  }
})
```

- [ ] **Step 4: Add placeholder public modules**

Create `src/types.ts`:

```ts
export type RelayStatus =
  | "info"
  | "todo"
  | "active"
  | "blocked"
  | "done"
  | "failed"
  | "superseded"

export interface RelayConfig {
  homeDir?: string
  dbPath?: string
  defaultProject?: string
  defaultSession?: string
  cwd?: string
  now?: () => Date
}
```

Create `src/index.ts`:

```ts
export type { RelayConfig, RelayStatus } from "./types.js"

export function configureRelay(_config: RelayConfig): void {
  throw new Error("configureRelay is not implemented yet")
}
```

Create `src/bus.ts`:

```ts
export function presence(): never {
  throw new Error("presence is not implemented yet")
}
```

Create `src/cli.ts`:

```ts
#!/usr/bin/env node

console.log("agent-relay is not implemented yet")
```

Create `tests/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest"

describe("package scaffold", () => {
  it("runs tests", () => {
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 5: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and install exits successfully.

- [ ] **Step 6: Verify scaffold**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all commands pass.

- [ ] **Step 7: Commit scaffold**

```bash
git add package.json package-lock.json tsconfig.json tsup.config.ts vitest.config.ts src tests
git commit -m "chore: scaffold TypeScript package"
```

## Task 2: SQLite Store And Configuration

**Files:**
- Create: `src/internal/config.ts`
- Create: `src/internal/schema.ts`
- Create: `src/internal/db.ts`
- Create: `tests/db.test.ts`
- Modify: `src/index.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Write database tests**

Create `tests/db.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { configureRelay } from "../src/index.js"
import { openRelayDb } from "../src/internal/db.js"
import { resolveRelayConfig } from "../src/internal/config.js"

const tempDirs: string[] = []

function tempHome() {
  const dir = mkdtempSync(join(tmpdir(), "agent-relay-"))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
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
    const tables = db.prepare("select name from sqlite_master where type = 'table' order by name").all() as Array<{ name: string }>
    db.close()

    expect(version).toBe(1)
    expect(tables.map((row) => row.name)).toEqual([
      "bus_records",
      "events",
      "projects",
      "sessions"
    ])
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/db.test.ts
```

Expected: FAIL because `src/internal/db.ts` and `src/internal/config.ts` do not exist.

- [ ] **Step 3: Implement config**

Create `src/internal/config.ts`:

```ts
import { homedir } from "node:os"
import { join } from "node:path"
import type { RelayConfig } from "../types.js"

export interface ResolvedRelayConfig {
  homeDir: string
  dbPath: string
  defaultProject?: string
  defaultSession?: string
  cwd: string
  now: () => Date
}

let currentConfig: ResolvedRelayConfig | undefined

export function resolveRelayConfig(config: RelayConfig = {}): ResolvedRelayConfig {
  const homeDir = config.homeDir ?? process.env.AGENT_RELAY_HOME ?? join(homedir(), ".agent-relay")
  const dbPath = config.dbPath ?? process.env.AGENT_RELAY_DB ?? join(homeDir, "relay.db")

  return {
    homeDir,
    dbPath,
    defaultProject: config.defaultProject,
    defaultSession: config.defaultSession,
    cwd: config.cwd ?? process.cwd(),
    now: config.now ?? (() => new Date())
  }
}

export function configure(config: RelayConfig): void {
  currentConfig = resolveRelayConfig(config)
}

export function getConfig(): ResolvedRelayConfig {
  if (!currentConfig) {
    currentConfig = resolveRelayConfig()
  }
  return currentConfig
}
```

- [ ] **Step 4: Implement schema**

Create `src/internal/schema.ts`:

```ts
export const SCHEMA_VERSION = 1

export const MIGRATION_001 = `
create table if not exists projects (
  id text primary key,
  name text not null,
  root_path text not null,
  created_at text not null,
  updated_at text not null,
  unique(name, root_path)
);

create table if not exists sessions (
  id text primary key,
  project_id text not null references projects(id),
  name text not null,
  role text,
  cwd text not null,
  status text not null,
  last_seen_at text not null,
  created_at text not null,
  updated_at text not null,
  unique(project_id, name)
);

create table if not exists events (
  id text primary key,
  project_id text not null references projects(id),
  session_id text not null references sessions(id),
  type text not null,
  status text not null,
  summary text not null,
  details text,
  tags_json text not null,
  links_json text not null,
  created_at text not null
);

create index if not exists events_project_created_idx on events(project_id, created_at desc);
create index if not exists events_type_idx on events(type);
create index if not exists events_status_idx on events(status);

create table if not exists bus_records (
  id text primary key,
  project_id text not null references projects(id),
  session_id text not null references sessions(id),
  kind text not null,
  summary text,
  payload_json text not null,
  expires_at text not null,
  created_at text not null,
  updated_at text not null
);

create index if not exists bus_project_kind_expires_idx on bus_records(project_id, kind, expires_at);
create index if not exists bus_session_kind_idx on bus_records(session_id, kind);
`
```

- [ ] **Step 5: Implement SQLite open and migrations**

Create `src/internal/db.ts`:

```ts
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import Database from "better-sqlite3"
import { getConfig } from "./config.js"
import { MIGRATION_001, SCHEMA_VERSION } from "./schema.js"

export type RelayDb = Database.Database

let db: RelayDb | undefined

export function openRelayDb(): RelayDb {
  if (db?.open) {
    return db
  }

  const config = getConfig()
  mkdirSync(dirname(config.dbPath), { recursive: true })
  db = new Database(config.dbPath)
  db.pragma("journal_mode = WAL")
  db.pragma("busy_timeout = 5000")
  migrate(db)
  return db
}

export function closeRelayDb(): void {
  if (db?.open) {
    db.close()
  }
  db = undefined
}

export function migrate(database: RelayDb): void {
  const version = database.pragma("user_version", { simple: true }) as number
  if (version < 1) {
    database.exec(MIGRATION_001)
    database.pragma(`user_version = ${SCHEMA_VERSION}`)
  }
}
```

- [ ] **Step 6: Wire configureRelay**

Modify `src/index.ts`:

```ts
export type { RelayConfig, RelayStatus } from "./types.js"

import type { RelayConfig } from "./types.js"
import { configure } from "./internal/config.js"
import { closeRelayDb } from "./internal/db.js"

export function configureRelay(config: RelayConfig): void {
  closeRelayDb()
  configure(config)
}
```

- [ ] **Step 7: Verify database tests**

Run:

```bash
npm test -- tests/db.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit database foundation**

```bash
git add src tests
git commit -m "feat: add SQLite store"
```

## Task 3: Project And Session Resolution

**Files:**
- Create: `src/internal/project-session.ts`
- Create: `tests/project-session.test.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Write project/session tests**

Create `tests/project-session.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/project-session.test.ts
```

Expected: FAIL because `project-session.ts` does not exist.

- [ ] **Step 3: Add public types**

Modify `src/types.ts`:

```ts
export type RelayStatus =
  | "info"
  | "todo"
  | "active"
  | "blocked"
  | "done"
  | "failed"
  | "superseded"

export interface RelayConfig {
  homeDir?: string
  dbPath?: string
  defaultProject?: string
  defaultSession?: string
  cwd?: string
  now?: () => Date
}

export interface ProjectRefInput {
  project?: string
  session?: string
  role?: string
  status?: RelayStatus
}

export interface RelayProject {
  id: string
  name: string
  rootPath: string
  createdAt: string
  updatedAt: string
}

export interface RelaySession {
  id: string
  projectId: string
  name: string
  role?: string
  cwd: string
  status: RelayStatus
  lastSeenAt: string
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 4: Implement project/session helpers**

Create `src/internal/project-session.ts`:

```ts
import { existsSync, readFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { nanoid } from "nanoid"
import type { RelayDb } from "./db.js"
import { getConfig } from "./config.js"
import type { ProjectRefInput, RelayProject, RelaySession } from "../types.js"

interface ResolvedProjectInput {
  name: string
  rootPath: string
}

export function resolveProject(input: ProjectRefInput): ResolvedProjectInput {
  const config = getConfig()
  if (input.project ?? config.defaultProject) {
    return { name: input.project ?? config.defaultProject!, rootPath: config.cwd }
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

export function upsertProjectAndSession(db: RelayDb, input: ProjectRefInput): { project: RelayProject; session: RelaySession } {
  const config = getConfig()
  const now = config.now().toISOString()
  const resolvedProject = resolveProject(input)
  const sessionName = input.session ?? config.defaultSession ?? `session-${process.pid}`
  const status = input.status ?? "active"

  let project = db.prepare("select * from projects where name = ? and root_path = ?").get(resolvedProject.name, resolvedProject.rootPath) as DbProject | undefined
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

  let session = db.prepare("select * from sessions where project_id = ? and name = ?").get(project.id, sessionName) as DbSession | undefined
  if (!session) {
    const id = `sess_${nanoid()}`
    db.prepare(`
      insert into sessions (id, project_id, name, role, cwd, status, last_seen_at, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, project.id, sessionName, input.role ?? null, config.cwd, status, now, now, now)
    session = db.prepare("select * from sessions where id = ?").get(id) as DbSession
  } else {
    db.prepare("update sessions set role = coalesce(?, role), cwd = ?, status = ?, last_seen_at = ?, updated_at = ? where id = ?").run(
      input.role ?? null,
      config.cwd,
      status,
      now,
      now,
      session.id
    )
    session = db.prepare("select * from sessions where id = ?").get(session.id) as DbSession
  }

  return { project: mapProject(project), session: mapSession(session) }
}

function findPackageProject(start: string): ResolvedProjectInput | undefined {
  const root = findUp(start, "package.json")
  if (!root) {
    return undefined
  }
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { name?: string }
  if (!pkg.name) {
    return undefined
  }
  return { name: pkg.name, rootPath: root }
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

function mapProject(row: DbProject): RelayProject {
  return { id: row.id, name: row.name, rootPath: row.root_path, createdAt: row.created_at, updatedAt: row.updated_at }
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
```

- [ ] **Step 5: Verify project/session tests**

Run:

```bash
npm test -- tests/project-session.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit project/session resolution**

```bash
git add src tests
git commit -m "feat: resolve projects and sessions"
```

## Task 4: Durable Ledger API

**Files:**
- Create: `src/internal/validation.ts`
- Create: `src/internal/ledger.ts`
- Create: `tests/ledger.test.ts`
- Modify: `src/index.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Write ledger tests**

Create `tests/ledger.test.ts`:

```ts
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
    expect(getEvent(event.id)?.id).toBe(event.id)
  })

  it("filters latest and search results", () => {
    tempHome()
    publish({ project: "pkg", session: "a", type: "status.update", status: "active", summary: "Working", tags: ["docs"] })
    publish({ project: "pkg", session: "b", type: "experiment.result", status: "done", summary: "ESM works", tags: ["esm"] })

    expect(latest({ project: "pkg", limit: 1 })[0]?.summary).toBe("ESM works")
    expect(search({ project: "pkg", tag: "esm" })).toHaveLength(1)
    expect(search({ project: "pkg", type: "status.update" })).toHaveLength(1)
  })

  it("rejects oversized summaries", () => {
    tempHome()
    expect(() => publish({
      project: "pkg",
      session: "a",
      type: "status.update",
      status: "info",
      summary: "x".repeat(501)
    })).toThrow(/summary/i)
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/ledger.test.ts
```

Expected: FAIL because ledger functions are not implemented.

- [ ] **Step 3: Add ledger types**

Modify `src/types.ts` to include:

```ts
export interface RelayLink {
  kind: "file" | "url"
  path?: string
  url?: string
}

export interface PublishEventInput extends ProjectRefInput {
  type: string
  status: RelayStatus
  summary: string
  details?: string
  tags?: string[]
  links?: RelayLink[]
}

export interface RelayEvent {
  id: string
  projectId: string
  sessionId: string
  project: string
  session: string
  type: string
  status: RelayStatus
  summary: string
  details?: string
  tags: string[]
  links: RelayLink[]
  createdAt: string
}

export interface EventQuery {
  project?: string
  session?: string
  type?: string
  status?: RelayStatus
  tag?: string
  since?: string
  limit?: number
}
```

- [ ] **Step 4: Add validation**

Create `src/internal/validation.ts`:

```ts
import { z } from "zod"

export const SUMMARY_LIMIT = 500
export const DETAILS_LIMIT = 16 * 1024
export const TAG_LIMIT = 20
export const LINK_LIMIT = 20

export const statusSchema = z.enum(["info", "todo", "active", "blocked", "done", "failed", "superseded"])

export const linkSchema = z.union([
  z.object({ kind: z.literal("file"), path: z.string().min(1), url: z.undefined().optional() }),
  z.object({ kind: z.literal("url"), url: z.string().url(), path: z.undefined().optional() })
])

export const publishEventSchema = z.object({
  project: z.string().min(1).optional(),
  session: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  type: z.string().min(1),
  status: statusSchema,
  summary: z.string().min(1).max(SUMMARY_LIMIT),
  details: z.string().max(DETAILS_LIMIT).optional(),
  tags: z.array(z.string().min(1)).max(TAG_LIMIT).default([]),
  links: z.array(linkSchema).max(LINK_LIMIT).default([])
})
```

- [ ] **Step 5: Implement ledger operations**

Create `src/internal/ledger.ts`:

```ts
import { nanoid } from "nanoid"
import { openRelayDb } from "./db.js"
import { publishEventSchema } from "./validation.js"
import { upsertProjectAndSession } from "./project-session.js"
import type { EventQuery, PublishEventInput, RelayEvent, RelayLink } from "../types.js"

export function publishEvent(input: PublishEventInput): RelayEvent {
  const parsed = publishEventSchema.parse(input)
  const db = openRelayDb()
  const { project, session } = upsertProjectAndSession(db, {
    project: parsed.project,
    session: parsed.session,
    role: parsed.role,
    status: parsed.status
  })
  const id = `evt_${nanoid()}`
  const createdAt = new Date().toISOString()

  db.prepare(`
    insert into events (id, project_id, session_id, type, status, summary, details, tags_json, links_json, created_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    project.id,
    session.id,
    parsed.type,
    parsed.status,
    parsed.summary,
    parsed.details ?? null,
    JSON.stringify(parsed.tags),
    JSON.stringify(parsed.links),
    createdAt
  )

  return getEventById(id)!
}

export function getEventById(id: string): RelayEvent | undefined {
  const db = openRelayDb()
  const row = db.prepare(`
    select e.*, p.name as project_name, s.name as session_name
    from events e
    join projects p on p.id = e.project_id
    join sessions s on s.id = e.session_id
    where e.id = ?
  `).get(id) as DbEvent | undefined
  return row ? mapEvent(row) : undefined
}

export function latestEvents(query: EventQuery = {}): RelayEvent[] {
  return searchEvents({ ...query, limit: query.limit ?? 20 })
}

export function searchEvents(query: EventQuery = {}): RelayEvent[] {
  const db = openRelayDb()
  const clauses: string[] = []
  const params: unknown[] = []

  if (query.project) {
    clauses.push("p.name = ?")
    params.push(query.project)
  }
  if (query.session) {
    clauses.push("s.name = ?")
    params.push(query.session)
  }
  if (query.type) {
    clauses.push("e.type = ?")
    params.push(query.type)
  }
  if (query.status) {
    clauses.push("e.status = ?")
    params.push(query.status)
  }

  const where = clauses.length ? `where ${clauses.join(" and ")}` : ""
  const limit = query.limit ?? 100
  const rows = db.prepare(`
    select e.*, p.name as project_name, s.name as session_name
    from events e
    join projects p on p.id = e.project_id
    join sessions s on s.id = e.session_id
    ${where}
    order by e.created_at desc
    limit ?
  `).all(...params, limit) as DbEvent[]

  const mapped = rows.map(mapEvent)
  return query.tag ? mapped.filter((event) => event.tags.includes(query.tag!)) : mapped
}

interface DbEvent {
  id: string
  project_id: string
  session_id: string
  project_name: string
  session_name: string
  type: string
  status: RelayEvent["status"]
  summary: string
  details: string | null
  tags_json: string
  links_json: string
  created_at: string
}

function mapEvent(row: DbEvent): RelayEvent {
  return {
    id: row.id,
    projectId: row.project_id,
    sessionId: row.session_id,
    project: row.project_name,
    session: row.session_name,
    type: row.type,
    status: row.status,
    summary: row.summary,
    details: row.details ?? undefined,
    tags: JSON.parse(row.tags_json) as string[],
    links: JSON.parse(row.links_json) as RelayLink[],
    createdAt: row.created_at
  }
}
```

- [ ] **Step 6: Wire public ledger exports**

Modify `src/index.ts`:

```ts
export type {
  EventQuery,
  PublishEventInput,
  RelayConfig,
  RelayEvent,
  RelayLink,
  RelayStatus
} from "./types.js"

import type { EventQuery, PublishEventInput, RelayConfig } from "./types.js"
import { configure } from "./internal/config.js"
import { closeRelayDb } from "./internal/db.js"
import { getEventById, latestEvents, publishEvent, searchEvents } from "./internal/ledger.js"

export function configureRelay(config: RelayConfig): void {
  closeRelayDb()
  configure(config)
}

export const publish = (input: PublishEventInput) => publishEvent(input)
export const getEvent = (id: string) => getEventById(id)
export const latest = (query: EventQuery = {}) => latestEvents(query)
export const search = (query: EventQuery = {}) => searchEvents(query)
```

- [ ] **Step 7: Verify ledger tests**

Run:

```bash
npm test -- tests/ledger.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit ledger API**

```bash
git add src tests
git commit -m "feat: add ledger events"
```

## Task 5: Bus Presence, Claims, Notifications, And Conflicts

**Files:**
- Create: `src/internal/bus.ts`
- Create: `src/internal/conflicts.ts`
- Create: `tests/bus.test.ts`
- Modify: `src/bus.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Write bus tests**

Create `tests/bus.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { configureRelay } from "../src/index.js"
import { claim, listClaims, notify, presence, releaseClaim } from "../src/bus.js"
import { closeRelayDb } from "../src/internal/db.js"

const tempDirs: string[] = []

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "agent-relay-bus-"))
  tempDirs.push(dir)
  configureRelay({ homeDir: dir, cwd: dir })
}

afterEach(() => {
  closeRelayDb()
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("bus API", () => {
  it("records presence", () => {
    setup()
    const record = presence({ project: "pkg", session: "worker-a", role: "tests" })
    expect(record.kind).toBe("presence")
    expect(record.session).toBe("worker-a")
  })

  it("creates and releases claims", () => {
    setup()
    const first = claim({
      project: "pkg",
      session: "worker-a",
      scopes: [{ kind: "files", patterns: ["src/**"] }],
      ttl: "45m"
    })
    expect(first.conflicts).toEqual([])

    const second = claim({
      project: "pkg",
      session: "worker-b",
      scopes: [{ kind: "files", patterns: ["src/index.ts"] }],
      ttl: "45m"
    })
    expect(second.conflicts[0]?.confidence).toBe("possible")
    expect(listClaims({ project: "pkg" })).toHaveLength(2)

    releaseClaim(first.record.id)
    expect(listClaims({ project: "pkg" })).toHaveLength(1)
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
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/bus.test.ts
```

Expected: FAIL because bus functions are not implemented.

- [ ] **Step 3: Add bus types**

Modify `src/types.ts` to include:

```ts
export type BusKind = "presence" | "claim" | "notification" | "handoff" | "wait-condition"

export type ClaimScope =
  | { kind: "files"; patterns: string[] }
  | { kind: "resource"; name: string }
  | { kind: "task"; name: string }

export interface BusRecord {
  id: string
  projectId: string
  sessionId: string
  project: string
  session: string
  kind: BusKind
  summary?: string
  payload: unknown
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export interface PresenceInput extends ProjectRefInput {
  ttl?: string
}

export interface ClaimInput extends ProjectRefInput {
  scopes: ClaimScope[]
  ttl?: string
  summary?: string
}

export interface ClaimResult {
  record: BusRecord
  conflicts: ClaimConflict[]
}

export interface ClaimConflict {
  claimId: string
  session: string
  scope: ClaimScope
  expiresAt: string
  summary?: string
  confidence: "exact" | "possible"
}

export interface ClaimQuery {
  project?: string
}

export interface NotifyInput extends ProjectRefInput {
  summary: string
  payload?: unknown
  ttl?: string
}
```

- [ ] **Step 4: Implement conflict helpers**

Create `src/internal/conflicts.ts`:

```ts
import picomatch from "picomatch"
import type { ClaimConflict, ClaimScope } from "../types.js"

export function findScopeConflicts(existing: Array<{ id: string; session: string; scopes: ClaimScope[]; expiresAt: string; summary?: string }>, requested: ClaimScope[]): ClaimConflict[] {
  const conflicts: ClaimConflict[] = []
  for (const claim of existing) {
    for (const currentScope of claim.scopes) {
      for (const requestedScope of requested) {
        const confidence = conflictConfidence(currentScope, requestedScope)
        if (confidence) {
          conflicts.push({
            claimId: claim.id,
            session: claim.session,
            scope: currentScope,
            expiresAt: claim.expiresAt,
            summary: claim.summary,
            confidence
          })
        }
      }
    }
  }
  return conflicts
}

function conflictConfidence(a: ClaimScope, b: ClaimScope): "exact" | "possible" | undefined {
  if (a.kind !== b.kind) {
    return undefined
  }
  if (a.kind === "resource" && b.kind === "resource") {
    return a.name === b.name ? "exact" : undefined
  }
  if (a.kind === "task" && b.kind === "task") {
    return normalize(a.name) === normalize(b.name) ? "possible" : undefined
  }
  if (a.kind === "files" && b.kind === "files") {
    return filePatternsOverlap(a.patterns, b.patterns) ? "possible" : undefined
  }
  return undefined
}

function filePatternsOverlap(a: string[], b: string[]): boolean {
  for (const left of a) {
    for (const right of b) {
      if (left === right) {
        return true
      }
      if (picomatch.isMatch(right, left) || picomatch.isMatch(left, right)) {
        return true
      }
      if (left.includes("**") || right.includes("**")) {
        const leftPrefix = left.split("**")[0]
        const rightPrefix = right.split("**")[0]
        if (leftPrefix && right.startsWith(leftPrefix)) return true
        if (rightPrefix && left.startsWith(rightPrefix)) return true
      }
    }
  }
  return false
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}
```

- [ ] **Step 5: Implement bus operations**

Create `src/internal/bus.ts`:

```ts
import { nanoid } from "nanoid"
import { openRelayDb } from "./db.js"
import { upsertProjectAndSession } from "./project-session.js"
import { findScopeConflicts } from "./conflicts.js"
import type { BusRecord, ClaimInput, ClaimQuery, ClaimResult, ClaimScope, NotifyInput, PresenceInput } from "../types.js"

export function upsertPresence(input: PresenceInput): BusRecord {
  return createBusRecord("presence", input, input.role ?? "active", { role: input.role }, parseTtl(input.ttl ?? "10m"))
}

export function createClaim(input: ClaimInput): ClaimResult {
  if (!input.scopes.length) {
    throw new Error("Claim requires at least one scope")
  }
  const activeClaims = listActiveClaims({ project: input.project })
  const record = createBusRecord("claim", input, input.summary, { scopes: input.scopes }, parseTtl(input.ttl ?? "45m"))
  const conflicts = findScopeConflicts(
    activeClaims
      .filter((claim) => claim.id !== record.id)
      .map((claim) => ({
        id: claim.id,
        session: claim.session,
        scopes: (claim.payload as { scopes: ClaimScope[] }).scopes,
        expiresAt: claim.expiresAt,
        summary: claim.summary
      })),
    input.scopes
  )
  return { record, conflicts }
}

export function releaseClaimById(id: string): boolean {
  const db = openRelayDb()
  const result = db.prepare("delete from bus_records where id = ? and kind = 'claim'").run(id)
  return result.changes > 0
}

export function listActiveClaims(query: ClaimQuery = {}): BusRecord[] {
  const db = openRelayDb()
  const now = new Date().toISOString()
  const rows = query.project
    ? db.prepare(`
        select b.*, p.name as project_name, s.name as session_name
        from bus_records b
        join projects p on p.id = b.project_id
        join sessions s on s.id = b.session_id
        where b.kind = 'claim' and b.expires_at > ? and p.name = ?
        order by b.created_at desc
      `).all(now, query.project) as DbBusRecord[]
    : db.prepare(`
        select b.*, p.name as project_name, s.name as session_name
        from bus_records b
        join projects p on p.id = b.project_id
        join sessions s on s.id = b.session_id
        where b.kind = 'claim' and b.expires_at > ?
        order by b.created_at desc
      `).all(now) as DbBusRecord[]
  return rows.map(mapBusRecord)
}

export function createNotification(input: NotifyInput): BusRecord {
  return createBusRecord("notification", input, input.summary, input.payload ?? {}, parseTtl(input.ttl ?? "60m"))
}

function createBusRecord(kind: BusRecord["kind"], input: PresenceInput | ClaimInput | NotifyInput, summary: string | undefined, payload: unknown, ttlMs: number): BusRecord {
  const db = openRelayDb()
  const { project, session } = upsertProjectAndSession(db, {
    project: input.project,
    session: input.session,
    role: input.role,
    status: "active"
  })
  const now = new Date()
  const id = `bus_${nanoid()}`
  const createdAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString()
  db.prepare(`
    insert into bus_records (id, project_id, session_id, kind, summary, payload_json, expires_at, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, project.id, session.id, kind, summary ?? null, JSON.stringify(payload), expiresAt, createdAt, createdAt)
  return mapBusRecord(db.prepare(`
    select b.*, p.name as project_name, s.name as session_name
    from bus_records b
    join projects p on p.id = b.project_id
    join sessions s on s.id = b.session_id
    where b.id = ?
  `).get(id) as DbBusRecord)
}

export function parseTtl(ttl: string): number {
  const match = ttl.match(/^(\d+)(m|h|d)$/)
  if (!match) {
    throw new Error(`Invalid TTL: ${ttl}`)
  }
  const value = Number(match[1])
  const unit = match[2]
  if (unit === "m") return value * 60 * 1000
  if (unit === "h") return value * 60 * 60 * 1000
  return value * 24 * 60 * 60 * 1000
}

interface DbBusRecord {
  id: string
  project_id: string
  session_id: string
  project_name: string
  session_name: string
  kind: BusRecord["kind"]
  summary: string | null
  payload_json: string
  expires_at: string
  created_at: string
  updated_at: string
}

function mapBusRecord(row: DbBusRecord): BusRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    sessionId: row.session_id,
    project: row.project_name,
    session: row.session_name,
    kind: row.kind,
    summary: row.summary ?? undefined,
    payload: JSON.parse(row.payload_json) as unknown,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
```

- [ ] **Step 6: Wire public bus exports**

Modify `src/bus.ts`:

```ts
export type {
  BusRecord,
  ClaimConflict,
  ClaimInput,
  ClaimQuery,
  ClaimResult,
  ClaimScope,
  NotifyInput,
  PresenceInput
} from "./types.js"

import type { ClaimInput, ClaimQuery, NotifyInput, PresenceInput } from "./types.js"
import { createClaim, createNotification, listActiveClaims, releaseClaimById, upsertPresence } from "./internal/bus.js"

export const presence = (input: PresenceInput) => upsertPresence(input)
export const claim = (input: ClaimInput) => createClaim(input)
export const releaseClaim = (id: string) => releaseClaimById(id)
export const listClaims = (query: ClaimQuery = {}) => listActiveClaims(query)
export const notify = (input: NotifyInput) => createNotification(input)
```

- [ ] **Step 7: Verify bus tests**

Run:

```bash
npm test -- tests/bus.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit bus API**

```bash
git add src tests
git commit -m "feat: add coordination bus"
```

## Task 6: CLI Commands And JSONL Export

**Files:**
- Create: `src/internal/export.ts`
- Create: `src/internal/format.ts`
- Create: `tests/cli.test.ts`
- Modify: `src/cli.ts`
- Modify: `package.json`

- [ ] **Step 1: Write CLI tests**

Create `tests/cli.test.ts`:

```ts
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

const tempDirs: string[] = []

function tempHome() {
  const dir = mkdtempSync(join(tmpdir(), "agent-relay-cli-"))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function cli(args: string[], homeDir: string) {
  return execFileSync("node", ["dist/cli.js", ...args], {
    encoding: "utf8",
    env: { ...process.env, AGENT_RELAY_HOME: homeDir }
  })
}

describe("agent-relay CLI", () => {
  it("publishes and reads latest JSON", () => {
    const homeDir = tempHome()
    cli(["publish", "--project", "pkg", "--session", "worker", "--type", "status.update", "--status", "done", "--summary", "Ready"], homeDir)
    const output = cli(["latest", "--project", "pkg", "--json"], homeDir)
    const events = JSON.parse(output) as Array<{ summary: string }>
    expect(events[0]?.summary).toBe("Ready")
  })

  it("creates claim conflict output", () => {
    const homeDir = tempHome()
    cli(["claim", "--project", "pkg", "--session", "a", "--files", "src/**"], homeDir)
    const output = cli(["claim", "--project", "pkg", "--session", "b", "--files", "src/index.ts", "--json"], homeDir)
    const result = JSON.parse(output) as { conflicts: unknown[] }
    expect(result.conflicts).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run build
npm test -- tests/cli.test.ts
```

Expected: FAIL because CLI commands are not implemented.

- [ ] **Step 3: Add export helper**

Create `src/internal/export.ts`:

```ts
import { searchEvents } from "./ledger.js"

export function exportJsonl(): string {
  return searchEvents({ limit: 10000 })
    .slice()
    .reverse()
    .map((event) => JSON.stringify(event))
    .join("\n")
}
```

- [ ] **Step 4: Add format helper**

Create `src/internal/format.ts`:

```ts
export function writeOutput(value: unknown, json: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      process.stdout.write(`${formatItem(item)}\n`)
    }
    return
  }
  process.stdout.write(`${formatItem(value)}\n`)
}

function formatItem(value: unknown): string {
  if (typeof value !== "object" || value === null) {
    return String(value)
  }
  const record = value as Record<string, unknown>
  const parts = [record.id, record.project, record.session, record.type ?? record.kind, record.status, record.summary].filter(Boolean)
  return parts.join("  ")
}
```

- [ ] **Step 5: Implement CLI**

Modify `src/cli.ts`:

```ts
#!/usr/bin/env node

import { Command } from "commander"
import { publish, latest, search } from "./index.js"
import { claim, listClaims, notify, presence, releaseClaim } from "./bus.js"
import { exportJsonl } from "./internal/export.js"
import { writeOutput } from "./internal/format.js"
import type { RelayStatus } from "./types.js"

const program = new Command()

program
  .name("agent-relay")
  .description("Local coordination ledger and bus for AI/developer sessions")
  .version("0.1.0")

program
  .command("publish")
  .requiredOption("--summary <summary>")
  .option("--project <project>")
  .option("--session <session>")
  .option("--type <type>", "event type", "status.update")
  .option("--status <status>", "event status", "info")
  .option("--details <details>")
  .option("--tag <tag>", "tag", collect, [])
  .option("--json")
  .action((options) => {
    const event = publish({
      project: options.project,
      session: options.session,
      type: options.type,
      status: options.status as RelayStatus,
      summary: options.summary,
      details: options.details,
      tags: options.tag
    })
    writeOutput(event, Boolean(options.json))
  })

program
  .command("latest")
  .option("--project <project>")
  .option("--session <session>")
  .option("--type <type>")
  .option("--status <status>")
  .option("--tag <tag>")
  .option("--limit <limit>", "limit", "20")
  .option("--json")
  .action((options) => {
    writeOutput(latest({
      project: options.project,
      session: options.session,
      type: options.type,
      status: options.status,
      tag: options.tag,
      limit: Number(options.limit)
    }), Boolean(options.json))
  })

program
  .command("search")
  .option("--project <project>")
  .option("--session <session>")
  .option("--type <type>")
  .option("--status <status>")
  .option("--tag <tag>")
  .option("--limit <limit>", "limit", "100")
  .option("--json")
  .action((options) => {
    writeOutput(search({
      project: options.project,
      session: options.session,
      type: options.type,
      status: options.status,
      tag: options.tag,
      limit: Number(options.limit)
    }), Boolean(options.json))
  })

program
  .command("presence")
  .option("--project <project>")
  .option("--session <session>")
  .option("--role <role>")
  .option("--ttl <ttl>")
  .option("--json")
  .action((options) => {
    writeOutput(presence(options), Boolean(options.json))
  })

program
  .command("claim")
  .option("--project <project>")
  .option("--session <session>")
  .option("--files <glob>", "file glob", collect, [])
  .option("--resource <name>", "resource name", collect, [])
  .option("--task <name>", "task name", collect, [])
  .option("--summary <summary>")
  .option("--ttl <ttl>")
  .option("--json")
  .action((options) => {
    const scopes = [
      ...(options.files.length ? [{ kind: "files" as const, patterns: options.files }] : []),
      ...options.resource.map((name: string) => ({ kind: "resource" as const, name })),
      ...options.task.map((name: string) => ({ kind: "task" as const, name }))
    ]
    writeOutput(claim({ project: options.project, session: options.session, scopes, summary: options.summary, ttl: options.ttl }), Boolean(options.json))
  })

program
  .command("claims")
  .option("--project <project>")
  .option("--json")
  .action((options) => {
    writeOutput(listClaims({ project: options.project }), Boolean(options.json))
  })

program
  .command("release")
  .argument("<claimId>")
  .option("--json")
  .action((claimId, options) => {
    writeOutput({ released: releaseClaim(claimId) }, Boolean(options.json))
  })

program
  .command("notify")
  .requiredOption("--summary <summary>")
  .option("--project <project>")
  .option("--session <session>")
  .option("--ttl <ttl>")
  .option("--json")
  .action((options) => {
    writeOutput(notify(options), Boolean(options.json))
  })

program
  .command("export")
  .option("--format <format>", "export format", "jsonl")
  .action((options) => {
    if (options.format !== "jsonl") {
      throw new Error("Only jsonl export is supported")
    }
    process.stdout.write(`${exportJsonl()}\n`)
  })

program.parse()

function collect(value: string, previous: string[]): string[] {
  previous.push(value)
  return previous
}
```

- [ ] **Step 6: Verify CLI**

Run:

```bash
npm run build
npm test -- tests/cli.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit CLI**

```bash
git add src tests package.json
git commit -m "feat: add agent-relay CLI"
```

## Task 7: Handoff, Cleanup, README, And Final Verification

**Files:**
- Modify: `src/internal/bus.ts`
- Modify: `src/bus.ts`
- Modify: `src/cli.ts`
- Create: `tests/handoff-cleanup.test.ts`
- Create: `README.md`

- [ ] **Step 1: Write handoff and cleanup tests**

Create `tests/handoff-cleanup.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { configureRelay, latest } from "../src/index.js"
import { cleanupExpiredBusRecords, handoff } from "../src/bus.js"
import { closeRelayDb, openRelayDb } from "../src/internal/db.js"

const tempDirs: string[] = []

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "agent-relay-handoff-"))
  tempDirs.push(dir)
  configureRelay({ homeDir: dir, cwd: dir })
}

afterEach(() => {
  closeRelayDb()
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("handoff and cleanup", () => {
  it("creates a durable handoff event and expiring bus notification", () => {
    setup()
    const result = handoff({
      project: "pkg",
      session: "worker-a",
      toRole: "docs",
      summary: "Docs should cover the ESM caveat"
    })
    expect(result.event.type).toBe("handoff.requested")
    expect(result.notification.kind).toBe("handoff")
    expect(latest({ project: "pkg", type: "handoff.requested" })).toHaveLength(1)
  })

  it("cleans expired bus records", () => {
    setup()
    const db = openRelayDb()
    db.prepare(`
      insert into projects (id, name, root_path, created_at, updated_at)
      values ('proj_old', 'pkg', '/tmp/pkg', '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z')
    `).run()
    db.prepare(`
      insert into sessions (id, project_id, name, role, cwd, status, last_seen_at, created_at, updated_at)
      values ('sess_old', 'proj_old', 'old', null, '/tmp/pkg', 'active', '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z')
    `).run()
    db.prepare(`
      insert into bus_records (id, project_id, session_id, kind, summary, payload_json, expires_at, created_at, updated_at)
      values ('bus_old', 'proj_old', 'sess_old', 'notification', 'old', '{}', '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z')
    `).run()
    expect(cleanupExpiredBusRecords()).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/handoff-cleanup.test.ts
```

Expected: FAIL because handoff and cleanup functions are not implemented.

- [ ] **Step 3: Add handoff and cleanup types**

Modify `src/types.ts` to include:

```ts
export interface HandoffInput extends ProjectRefInput {
  toRole: string
  summary: string
  eventId?: string
  ttl?: string
}

export interface HandoffResult {
  event: RelayEvent
  notification: BusRecord
}
```

- [ ] **Step 4: Implement handoff and cleanup**

Modify `src/internal/bus.ts` to add:

```ts
import { publishEvent } from "./ledger.js"
import type { HandoffInput, HandoffResult } from "../types.js"

export function createHandoff(input: HandoffInput): HandoffResult {
  const event = publishEvent({
    project: input.project,
    session: input.session,
    type: "handoff.requested",
    status: "todo",
    summary: input.summary,
    details: input.eventId ? `Related event: ${input.eventId}` : undefined,
    tags: ["handoff", input.toRole]
  })
  const notification = createBusRecord(
    "handoff",
    input,
    input.summary,
    { toRole: input.toRole, eventId: event.id, relatedEventId: input.eventId },
    parseTtl(input.ttl ?? "24h")
  )
  return { event, notification }
}

export function cleanupExpired(): number {
  const db = openRelayDb()
  const result = db.prepare("delete from bus_records where expires_at <= ?").run(new Date().toISOString())
  return result.changes
}
```

- [ ] **Step 5: Export handoff and cleanup**

Modify `src/bus.ts`:

```ts
export type {
  BusRecord,
  ClaimConflict,
  ClaimInput,
  ClaimQuery,
  ClaimResult,
  ClaimScope,
  HandoffInput,
  HandoffResult,
  NotifyInput,
  PresenceInput
} from "./types.js"

import type { ClaimInput, ClaimQuery, HandoffInput, NotifyInput, PresenceInput } from "./types.js"
import { cleanupExpired, createClaim, createHandoff, createNotification, listActiveClaims, releaseClaimById, upsertPresence } from "./internal/bus.js"

export const presence = (input: PresenceInput) => upsertPresence(input)
export const claim = (input: ClaimInput) => createClaim(input)
export const releaseClaim = (id: string) => releaseClaimById(id)
export const listClaims = (query: ClaimQuery = {}) => listActiveClaims(query)
export const notify = (input: NotifyInput) => createNotification(input)
export const handoff = (input: HandoffInput) => createHandoff(input)
export const cleanupExpiredBusRecords = () => cleanupExpired()
```

- [ ] **Step 6: Add CLI handoff and cleanup commands**

Modify `src/cli.ts` imports:

```ts
import { cleanupExpiredBusRecords, claim, handoff, listClaims, notify, presence, releaseClaim } from "./bus.js"
```

Add commands before `program.parse()`:

```ts
program
  .command("handoff")
  .requiredOption("--to-role <role>")
  .requiredOption("--summary <summary>")
  .option("--project <project>")
  .option("--session <session>")
  .option("--event-id <eventId>")
  .option("--ttl <ttl>")
  .option("--json")
  .action((options) => {
    writeOutput(handoff({
      project: options.project,
      session: options.session,
      toRole: options.toRole,
      summary: options.summary,
      eventId: options.eventId,
      ttl: options.ttl
    }), Boolean(options.json))
  })

program
  .command("cleanup")
  .option("--json")
  .action((options) => {
    writeOutput({ deleted: cleanupExpiredBusRecords() }, Boolean(options.json))
  })
```

- [ ] **Step 7: Add README**

Create `README.md`:

```md
# Agent Relay

Agent Relay is a local, machine-wide coordination ledger and bus for AI/developer sessions.

It gives parallel sessions a shared status surface without importing or reading each other's transcript history.

```txt
Ledger = durable memory
Bus = active coordination
Session history = never imported
```

## Install

```bash
npm install -g @neonwatty/agent-relay
```

## CLI

```bash
agent-relay publish --project my-package --session vitest-repro --type experiment.result --status done --tag esm --summary "Vitest ESM repro confirmed"
agent-relay latest --project my-package
agent-relay claim --project my-package --session docs-session --files "docs/**" --task "Update package usage docs"
agent-relay claims --project my-package
agent-relay handoff --project my-package --session tests --to-role docs --summary "Docs should cover the ESM caveat"
```

Use `--json` on read commands for machine-readable output.

## TypeScript API

```ts
import { latest, publish } from "@neonwatty/agent-relay"
import { claim, presence } from "@neonwatty/agent-relay/bus"

publish({
  project: "my-package",
  session: "vitest-repro",
  type: "experiment.result",
  status: "done",
  summary: "Vitest ESM repro confirmed",
  tags: ["esm", "vitest"]
})

claim({
  project: "my-package",
  session: "docs-session",
  scopes: [{ kind: "files", patterns: ["docs/**"] }],
  ttl: "45m"
})

console.log(latest({ project: "my-package" }))
```

## Storage

Default database:

```txt
~/.agent-relay/relay.db
```

Override with:

```bash
AGENT_RELAY_HOME=/custom/home
AGENT_RELAY_DB=/custom/home/relay.db
```

## Privacy

Agent Relay only stores explicit events and bus records. It does not ingest transcripts, scan files, or capture command output automatically.
```

- [ ] **Step 8: Verify all tests and build**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 9: Manual CLI smoke test**

Run:

```bash
tmp_home="$(mktemp -d)"
AGENT_RELAY_HOME="$tmp_home" node dist/cli.js publish --project demo --session one --type status.update --status done --summary "Ready"
AGENT_RELAY_HOME="$tmp_home" node dist/cli.js latest --project demo --json
rm -rf "$tmp_home"
```

Expected: `latest --json` prints an array containing one event with `"summary": "Ready"`.

- [ ] **Step 10: Commit final v1 implementation**

```bash
git add src tests README.md
git commit -m "feat: complete initial agent relay flows"
```

## Self-Review Checklist

- Spec coverage: The plan covers package naming, single `agent-relay` binary, SQLite storage, project/session resolution, durable events, bus records, advisory claims/conflicts, handoff, cleanup, JSONL export, human/JSON CLI output, and privacy-focused explicit writes.
- Deferred by design: `waitFor`, `watch`, and deterministic `summarize` are v1.1 features as specified in the design doc.
- Placeholder scan: No unresolved placeholder language remains.
- Type consistency: Public names are `publish`, `latest`, `search`, `getEvent`, `configureRelay`, `presence`, `claim`, `releaseClaim`, `listClaims`, `notify`, `handoff`, and `cleanupExpiredBusRecords`.
