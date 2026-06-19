import { Command, CommanderError } from "commander"
import { cleanupExpiredBusRecords, claim, handoff, listClaims, notify, presence, releaseClaim } from "./bus.js"
import { latest, publish, search } from "./index.js"
import {
  collect,
  parseLimit,
  parseOptionalStatus,
  toClaimScopes,
  toEventQuery,
  type ClaimOptions,
  type ClaimsOptions,
  type EventQueryOptions,
  type ExportOptions,
  type HandoffOptions,
  type JsonOption,
  type NotifyOptions,
  type PresenceOptions,
  type PublishOptions
} from "./internal/cli-options.js"
import { exportJsonl } from "./internal/export.js"
import { writeOutput } from "./internal/format.js"
import type { HandoffInput, NotifyInput, PresenceInput, RelayStatus } from "./types.js"

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
      status: parseOptionalStatus(options.status),
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
        status: parseOptionalStatus(options.status),
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
      status: parseOptionalStatus(options.status),
      summary: options.summary,
      ttl: options.ttl
    }
    writeOutput(notify(input), Boolean(options.json))
  })

program
  .command("handoff")
  .description("Create a durable handoff request and short-lived bus notification")
  .requiredOption("--to-role <role>")
  .requiredOption("--summary <summary>")
  .option("--project <project>")
  .option("--session <session>")
  .option("--event-id <eventId>")
  .option("--ttl <ttl>")
  .option("--json")
  .action((options: HandoffOptions) => {
    const input: HandoffInput = {
      project: options.project,
      session: options.session,
      toRole: options.toRole,
      summary: options.summary,
      eventId: options.eventId,
      ttl: options.ttl
    }
    writeOutput(handoff(input), Boolean(options.json))
  })

program
  .command("cleanup")
  .description("Delete expired bus records")
  .option("--json")
  .action((options: JsonOption) => {
    writeOutput({ deleted: cleanupExpiredBusRecords() }, Boolean(options.json))
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
  if (error instanceof CommanderError) {
    process.exit(error.exitCode)
  }

  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`agent-relay: ${message}\n`)
  process.exit(error instanceof CommanderError ? error.exitCode : 1)
}
