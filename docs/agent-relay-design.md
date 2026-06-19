# Agent Relay Design

Date: 2026-06-19

## Overview

Agent Relay is a local, machine-global coordination package for AI and developer sessions. It lets independent sessions publish explicit status updates, experiment results, handoffs, and short-lived coordination signals without reading one another's transcript history.

Package name: `@neonwatty/agent-relay`

CLI binary: `agent-relay`

Global store: `~/.agent-relay/relay.db`

The package has two related layers:

- Ledger: durable, explicit, queryable records.
- Bus: short-lived coordination state for active sessions.

The core boundary is:

```txt
Ledger = durable memory
Bus = active coordination
Session history = never imported
```

## Goals

- Give multiple sessions on one machine a shared, durable status surface.
- Support explicit event publishing from any project or session.
- Support active coordination for parallel work through presence, claims, notifications, handoffs, and wait/watch flows.
- Make it easy for one session to discover the status of another session or project without reading that session's full history.
- Keep updates compact, structured, and queryable.
- Work across projects on the same machine without per-project setup.

## Non-Goals

- No automatic transcript ingestion.
- No automatic capture of shell commands, changed files, or test results in v1.
- No cross-machine sync in v1.
- No hard file locks.
- No general chat system between agents.
- No background daemon required for the initial version.

## Storage

Agent Relay uses SQLite as the default local store.

Default database path:

```txt
~/.agent-relay/relay.db
```

The path can be overridden for tests or advanced workflows:

```txt
AGENT_RELAY_HOME=/custom/path
AGENT_RELAY_DB=/custom/path/relay.db
```

SQLite is the right default because it is durable, queryable, compact, and safe for concurrent local access when configured with WAL mode and sensible busy timeouts.

The package provides JSONL export commands so users can inspect or archive the ledger:

```bash
agent-relay export --format jsonl
```

## Core Concepts

### Project

A project is a logical grouping for work. It can be supplied explicitly or inferred from the current working directory.

Project identity resolution order:

1. Explicit `project` API option or `--project` CLI flag.
2. Nearest `package.json` `name` field, using that package directory as `rootPath`.
3. Nearest git root basename, using the git root as `rootPath`.
4. Current directory basename, using the current directory as `rootPath`.

Fields:

- `id`
- `name`
- `rootPath`
- `createdAt`
- `updatedAt`

### Session

A session represents one active or historical working context.

Fields:

- `id`
- `projectId`
- `name`
- `role`
- `cwd`
- `status`
- `lastSeenAt`
- `createdAt`
- `updatedAt`

Sessions can be named by the caller:

```bash
agent-relay presence --project my-package --session vitest-repro --role "package testing"
```

If no session name is supplied, the package generates a stable local id for the current process/session invocation.

### Ledger Event

A ledger event is a durable, explicit record.

Example:

```ts
await publish({
  project: "my-package",
  session: "nextjs-test-session",
  type: "experiment.result",
  status: "done",
  summary: "Package imports in Next.js 15, but Vitest needs an exports condition fix.",
  details: "Optional bounded markdown with key evidence and next steps.",
  tags: ["esm", "vitest"],
  links: [
    { kind: "file", path: "/abs/path/repro.md" },
    { kind: "url", url: "https://example.com" }
  ]
})
```

Fields:

- `id`
- `projectId`
- `sessionId`
- `type`
- `status`
- `summary`
- `details`
- `tags`
- `links`
- `createdAt`

Event types are caller-defined strings. Recommended conventions:

- `status.update`
- `experiment.started`
- `experiment.result`
- `decision`
- `blocker`
- `artifact.ready`
- `handoff.requested`
- `handoff.completed`
- `review.requested`
- `review.result`

Statuses are a small known set:

- `info`
- `todo`
- `active`
- `blocked`
- `done`
- `failed`
- `superseded`

### Bus Record

A bus record is short-lived coordination state. It has an expiration time and is not treated as durable memory.

Bus record kinds:

- `presence`
- `claim`
- `notification`
- `handoff`
- `wait-condition`

Common fields:

- `id`
- `projectId`
- `sessionId`
- `kind`
- `summary`
- `payload`
- `expiresAt`
- `createdAt`
- `updatedAt`

Expired bus records are hidden by default and periodically cleaned up.

## TypeScript API

Primary API:

```ts
import {
  publish,
  latest,
  search,
  getEvent,
  summarize,
  configureRelay
} from "@neonwatty/agent-relay"
```

Bus API:

```ts
import {
  presence,
  claim,
  releaseClaim,
  listClaims,
  notify,
  waitFor,
  watch,
  handoff
} from "@neonwatty/agent-relay/bus"
```

### Ledger Functions

`publish(event)`

Writes a durable event and returns the inserted event.

`latest(query)`

Returns recent events for a project, session, type, status, or tag filter.

`search(query)`

Searches durable events by project, type, status, tags, summary/details text, and time range.

`getEvent(id)`

Returns one event by id.

`summarize(query)`

Returns a compact project/session summary derived from recent durable events. This is deterministic and local, not LLM-generated.

`configureRelay(options)`

Sets database path, default project, default session, and clock/testing hooks.

### Bus Functions

`presence(input)`

Upserts active session presence with a TTL.

`claim(input)`

Creates a temporary claim over files, resources, or task scopes. Returns conflict warnings when overlapping active claims exist.

`releaseClaim(id)`

Releases a claim early.

`listClaims(query)`

Lists active claims.

`notify(input)`

Posts a short-lived notification. Notifications may point to durable ledger events.

`waitFor(condition, options)`

Polls until a matching ledger event or bus notification appears, or until timeout.

`watch(query, callback)`

Watches for matching ledger or bus changes. The v1 implementation can use polling instead of a daemon.

`handoff(input)`

Creates a durable handoff event and an ephemeral bus notification.

## CLI API

The CLI exposes only one binary:

```bash
agent-relay
```

Commands:

```bash
agent-relay init
agent-relay publish
agent-relay latest
agent-relay search
agent-relay status
agent-relay summarize
agent-relay presence
agent-relay sessions
agent-relay claim
agent-relay claims
agent-relay release
agent-relay conflicts
agent-relay notify
agent-relay wait
agent-relay handoff
agent-relay export
agent-relay cleanup
```

Examples:

```bash
agent-relay publish \
  --project my-package \
  --session vitest-repro \
  --type experiment.result \
  --status done \
  --tag esm \
  --tag vitest \
  --summary "Vitest ESM repro confirmed"
```

```bash
agent-relay claim \
  --project my-package \
  --session docs-session \
  --files "docs/**" \
  --task "Update package usage docs" \
  --ttl 45m
```

```bash
agent-relay conflicts \
  --project my-package \
  --files "src/exports/index.ts"
```

```bash
agent-relay wait \
  --project my-package \
  --type experiment.result \
  --tag esm \
  --timeout 30m
```

## Claim Model

Claims support multiple scope kinds:

```ts
await claim({
  project: "my-package",
  session: "vitest-repro",
  scopes: [
    { kind: "files", patterns: ["src/exports/**", "tests/vitest/**"] },
    { kind: "resource", name: "port:3000" },
    { kind: "task", name: "Next.js ESM package test" }
  ],
  ttl: "45m"
})
```

File claims are advisory. They do not prevent writes. They let other sessions detect possible overlap before starting or while coordinating parallel work.

Resource claims cover shared local resources such as ports, package links, temp directories, database instances, and test accounts.

Task claims cover conceptual work that may not map cleanly to files.

## Conflict Detection

Conflict detection is advisory and conservative.

For file scopes:

- Normalize absolute paths where possible.
- Resolve project-relative globs against the project root.
- Detect direct file overlap.
- Detect glob overlap when practical.
- If exact glob overlap is ambiguous, return a possible-conflict warning instead of pretending certainty.

For resource scopes:

- Conflicts occur when two active claims use the same resource name.

For task scopes:

- Exact name matches can be warnings.
- Matching uses exact normalized task names in v1. Tag-based fuzzy task matching is out of scope for v1.

Conflict responses include:

- conflicting claim id
- owning session
- scope
- expiration time
- summary/task
- confidence: `exact` or `possible`

## Retention And Cleanup

Ledger events are durable by default and not deleted automatically.

Bus records expire by TTL. Defaults:

- presence: 10 minutes
- claim: 45 minutes
- notification: 60 minutes
- handoff notification: 24 hours
- wait-condition: until timeout

Cleanup behavior:

```bash
agent-relay cleanup
```

The library can opportunistically clean expired bus records during writes.

## Error Handling

The package fails clearly and locally.

Expected error cases:

- SQLite database cannot be opened.
- Database migration fails.
- Invalid event type, status, TTL, or path.
- Claim request contains no scopes.
- Wait timeout expires.
- Export path is not writable.

Concurrent write contention uses SQLite busy timeout and returns a readable error if the database remains locked.

## Security And Privacy

Agent Relay stores local coordination data on one machine. It assumes data may include sensitive project names, paths, summaries, and artifact links.

Privacy rules:

- Never ingest session transcripts.
- Never scan files automatically.
- Never publish command output automatically.
- Keep event details bounded.
- Prefer file links over embedding large artifact content.

Default size limits:

- `summary`: 500 characters.
- `details`: 16 KiB.
- `tags`: 20 tags per event.
- `links`: 20 links per event.

Future privacy features:

- Per-project redaction settings.
- `agent-relay doctor privacy` to inspect potentially sensitive stored fields.

## Testing Plan

Unit tests:

- event validation
- TTL parsing
- project/session inference
- claim scope normalization
- conflict detection
- query filtering

Integration tests:

- SQLite migrations
- concurrent publish calls
- publish/latest/search flows
- presence expiration
- claim/release flows
- waitFor success and timeout
- export JSONL

CLI tests:

- command argument parsing
- successful publish/search/claim flows
- readable error output
- nonzero exit codes on invalid input

Concurrency tests:

- multiple processes publishing simultaneously
- overlapping claims from separate sessions
- database busy timeout behavior

## Initial Implementation Slice

The first useful version should include:

- SQLite database setup and migrations.
- `publish`, `latest`, `search`, and `getEvent`.
- `presence`, `claim`, `releaseClaim`, `listClaims`, and `notify`.
- `handoff`, implemented as one durable ledger event plus one expiring bus notification.
- CLI commands for publish, latest, search, presence, sessions, claim, claims, release, conflicts, notify, handoff, export, and cleanup.
- Advisory file/resource conflict warnings.
- JSONL export.
- Human-readable CLI output by default, with `--json` for machine-readable output.

`waitFor`, `watch`, and `summarize` are v1.1 features once the basic ledger, claim, and handoff flows are solid.

## Fixed V1 Decisions

- Project identity uses explicit input first, then `package.json`, then git root, then current directory.
- Event details have hard default size limits.
- The CLI outputs human-readable tables/text by default and JSON with `--json`.
- Handoff is included in v1.
- No `relay` alias is provided; the only binary is `agent-relay`.
