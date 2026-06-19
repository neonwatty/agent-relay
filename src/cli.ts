import { Command, CommanderError } from "commander"
import { claim, listClaims, notify, presence, releaseClaim } from "./bus.js"
import { latest, publish, search } from "./index.js"
import { exportJsonl } from "./internal/export.js"
import { writeOutput } from "./internal/format.js"
import type { ClaimScope, EventQuery, NotifyInput, PresenceInput, RelayStatus } from "./types.js"

const program = new Command()

program
  .name("agent-relay")
  .description("Local coordination ledger and bus for AI/developer sessions")
  .version("0.1.0")
  .exitOverride()

program
  .command("publish")
  .description("Publish a durable ledger event")
  .requiredOption("--summary <summary>")
  .option("--project <project>")
  .option("--session <session>")
  .option("--type <type>", "event type", "status.update")
  .option("--status <status>", "event status", "info")
  .option("--details <details>")
  .option("--tag <tag>", "tag", collect, [])
  .option("--json")
  .action((options: PublishOptions) => {
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
  .description("Read recent durable ledger events")
  .option("--project <project>")
  .option("--session <session>")
  .option("--type <type>")
  .option("--status <status>")
  .option("--tag <tag>")
  .option("--since <isoDate>")
  .option("--limit <limit>", "limit", parseLimit, 20)
  .option("--json")
  .action((options: EventQueryOptions) => {
    writeOutput(latest(toEventQuery(options)), Boolean(options.json))
  })

program
  .command("search")
  .description("Search durable ledger events")
  .option("--project <project>")
  .option("--session <session>")
  .option("--type <type>")
  .option("--status <status>")
  .option("--tag <tag>")
  .option("--since <isoDate>")
  .option("--limit <limit>", "limit", parseLimit, 100)
  .option("--json")
  .action((options: EventQueryOptions) => {
    writeOutput(search(toEventQuery(options)), Boolean(options.json))
  })

program
  .command("presence")
  .description("Record short-lived session presence")
  .option("--project <project>")
  .option("--session <session>")
  .option("--status <status>")
  .option("--role <role>")
  .option("--ttl <ttl>")
  .option("--json")
  .action((options: PresenceOptions) => {
    const input: PresenceInput = {
      project: options.project,
      session: options.session,
      status: options.status as RelayStatus | undefined,
      role: options.role,
      ttl: options.ttl
    }
    writeOutput(presence(input), Boolean(options.json))
  })

program
  .command("claim")
  .description("Create an advisory coordination claim")
  .option("--project <project>")
  .option("--session <session>")
  .option("--status <status>")
  .option("--files <glob>", "file glob", collect, [])
  .option("--resource <name>", "resource name", collect, [])
  .option("--task <name>", "task name", collect, [])
  .option("--summary <summary>")
  .option("--ttl <ttl>")
  .option("--json")
  .action((options: ClaimOptions) => {
    writeOutput(
      claim({
        project: options.project,
        session: options.session,
        status: options.status as RelayStatus | undefined,
        scopes: toClaimScopes(options),
        summary: options.summary,
        ttl: options.ttl
      }),
      Boolean(options.json)
    )
  })

program
  .command("claims")
  .description("List active advisory claims")
  .option("--project <project>")
  .option("--json")
  .action((options: ClaimsOptions) => {
    writeOutput(listClaims({ project: options.project }), Boolean(options.json))
  })

program
  .command("release")
  .description("Release an advisory claim")
  .argument("<claimId>")
  .option("--json")
  .action((claimId: string, options: JsonOption) => {
    writeOutput({ released: releaseClaim(claimId) }, Boolean(options.json))
  })

program
  .command("notify")
  .description("Create a short-lived notification")
  .requiredOption("--summary <summary>")
  .option("--project <project>")
  .option("--session <session>")
  .option("--status <status>")
  .option("--ttl <ttl>")
  .option("--json")
  .action((options: NotifyOptions) => {
    const input: NotifyInput = {
      project: options.project,
      session: options.session,
      status: options.status as RelayStatus | undefined,
      summary: options.summary,
      ttl: options.ttl
    }
    writeOutput(notify(input), Boolean(options.json))
  })

program
  .command("export")
  .description("Export durable ledger events")
  .option("--format <format>", "export format", "jsonl")
  .action((options: ExportOptions) => {
    if (options.format !== "jsonl") {
      throw new Error("Only jsonl export is supported")
    }
    const output = exportJsonl()
    process.stdout.write(output ? `${output}\n` : "")
  })

try {
  program.parse()
} catch (error) {
  if (error instanceof CommanderError && error.code === "commander.helpDisplayed") {
    process.exit(error.exitCode)
  }

  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`agent-relay: ${message}\n`)
  process.exit(error instanceof CommanderError ? error.exitCode : 1)
}

interface JsonOption {
  json?: boolean
}

interface PublishOptions extends JsonOption {
  project?: string
  session?: string
  type: string
  status: string
  summary: string
  details?: string
  tag: string[]
}

interface EventQueryOptions extends JsonOption {
  project?: string
  session?: string
  type?: string
  status?: string
  tag?: string
  since?: string
  limit?: number
}

interface PresenceOptions extends JsonOption {
  project?: string
  session?: string
  status?: string
  role?: string
  ttl?: string
}

interface ClaimOptions extends JsonOption {
  project?: string
  session?: string
  status?: string
  files: string[]
  resource: string[]
  task: string[]
  summary?: string
  ttl?: string
}

interface ClaimsOptions extends JsonOption {
  project?: string
}

interface NotifyOptions extends JsonOption {
  project?: string
  session?: string
  status?: string
  summary: string
  ttl?: string
}

interface ExportOptions {
  format: string
}

function collect(value: string, previous: string[]): string[] {
  previous.push(value)
  return previous
}

function parseLimit(value: string): number {
  const limit = Number(value)
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(`Invalid limit: ${value}`)
  }
  return limit
}

function toEventQuery(options: EventQueryOptions): EventQuery {
  return {
    project: options.project,
    session: options.session,
    type: options.type,
    status: options.status as RelayStatus | undefined,
    tag: options.tag,
    since: options.since,
    limit: options.limit
  }
}

function toClaimScopes(options: ClaimOptions): ClaimScope[] {
  return [
    ...(options.files.length ? [{ kind: "files" as const, patterns: options.files }] : []),
    ...options.resource.map((name) => ({ kind: "resource" as const, name })),
    ...options.task.map((name) => ({ kind: "task" as const, name }))
  ]
}
