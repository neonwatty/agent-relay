# Agent Relay

Agent Relay is a local, machine-wide coordination ledger and bus for AI and developer sessions.

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
agent-relay cleanup
```

Use `--json` on any command that supports machine-readable output.

## TypeScript API

```ts
import { latest, publish } from "@neonwatty/agent-relay"
import { claim, handoff, presence } from "@neonwatty/agent-relay/bus"

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

handoff({
  project: "my-package",
  session: "tests",
  toRole: "docs",
  summary: "Docs should cover the ESM caveat"
})

presence({
  project: "my-package",
  session: "docs-session",
  role: "docs"
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
