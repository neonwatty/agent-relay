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

    const publishOutput = cli(
      [
        "publish",
        "--project",
        "pkg",
        "--session",
        "worker",
        "--type",
        "status.update",
        "--status",
        "done",
        "--summary",
        "Ready",
        "--json"
      ],
      homeDir
    )
    const published = JSON.parse(publishOutput) as {
      id: string
      project: string
      session: string
      type: string
      status: string
      summary: string
    }
    const output = cli(["latest", "--project", "pkg", "--json"], homeDir)
    const events = JSON.parse(output) as Array<{ summary: string }>

    expect(published).toEqual(
      expect.objectContaining({
        project: "pkg",
        session: "worker",
        type: "status.update",
        status: "done",
        summary: "Ready"
      })
    )
    expect(published.id).toMatch(/^evt_/)
    expect(events[0]?.summary).toBe("Ready")
  })

  it("creates claim conflict output", () => {
    const homeDir = tempHome()

    cli(["claim", "--project", "pkg", "--session", "a", "--files", "src/**"], homeDir)
    const output = cli(["claim", "--project", "pkg", "--session", "b", "--files", "src/index.ts", "--json"], homeDir)
    const result = JSON.parse(output) as { conflicts: unknown[] }

    expect(result.conflicts).toHaveLength(1)
  })

  it("exports durable events as JSONL from oldest to newest", () => {
    const homeDir = tempHome()

    cli(["publish", "--project", "pkg", "--session", "worker", "--summary", "First"], homeDir)
    cli(["publish", "--project", "pkg", "--session", "worker", "--summary", "Second"], homeDir)
    const output = cli(["export", "--format", "jsonl"], homeDir)
    const events = output
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { summary: string })

    expect(events.map((event) => event.summary)).toEqual(["First", "Second"])
  })
})
