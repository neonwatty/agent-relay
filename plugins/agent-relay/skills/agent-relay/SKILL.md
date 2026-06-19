---
name: agent-relay
description: Use when coordinating multiple AI or developer sessions with the agent-relay CLI, especially for status updates, parallel file claims, handoffs, experiment results, or reading explicit cross-session context.
---

# Agent Relay

Agent Relay is a local, machine-wide coordination ledger and bus for AI and developer sessions.

Use it when the user asks to coordinate sessions, check another session's explicit status, divide parallel work, claim file scopes, publish experiment results, or hand work off to another agent.

## Principles

- Record only explicit events. Do not ingest transcripts, terminal logs, or file contents unless the user explicitly asks you to summarize them into an event.
- Prefer concise summaries that another session can act on.
- Read recent project context before starting parallel work if coordination matters.
- Claim independent file scopes before doing parallel edits.
- Release claims when done or when abandoning a path.
- Publish a handoff when another session should pick up the thread.

## Common Commands

Read recent project events:

```bash
agent-relay latest --project <project> --limit 10
```

Publish a status update:

```bash
agent-relay publish --project <project> --session <session> --status active --summary "Investigating test failure"
```

Publish an experiment result:

```bash
agent-relay publish --project <project> --session <session> --type experiment.result --status done --tag package --summary "Package install smoke passed"
```

Claim a file scope before parallel work:

```bash
agent-relay claim --project <project> --session <session> --files "src/**" --task "Implement CLI installer"
```

List active claims:

```bash
agent-relay claims --project <project>
```

Release a claim:

```bash
agent-relay release <claim-id>
```

Create a handoff:

```bash
agent-relay handoff --project <project> --session <session> --to-role docs --summary "Docs should cover plugin install flow"
```

## Agent Behavior

When starting coordinated work:

1. Identify a stable project name, usually the repository name.
2. Use a short session name that describes your role or task.
3. Read `latest` and `claims` for that project.
4. Claim the files, tasks, or shared resources you expect to touch.
5. Publish important discoveries, blockers, results, and handoffs.

When finishing coordinated work:

1. Publish the outcome with `status done`, `blocked`, or `failed`.
2. Release claims that are no longer active.
3. Include exact commands or file paths in the summary only when they are important for another session.
