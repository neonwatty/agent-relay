import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { doctorCodexPlugin, installCodexPlugin } from "../src/internal/plugin-install.js"

const tempDirs: string[] = []

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), "agent-relay-plugin-"))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("Codex plugin installer", () => {
  it("keeps the plugin version aligned with the package version", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { version: string }
    const pluginJson = JSON.parse(readFileSync("plugins/agent-relay/.codex-plugin/plugin.json", "utf8")) as {
      version: string
    }

    expect(pluginJson.version).toBe(packageJson.version)
  })

  it("copies the bundled plugin and enables it in Codex config", () => {
    const codexHome = tempDir()
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { version: string }
    const result = installCodexPlugin({ codexHome, packageRoot: process.cwd(), skipCodex: true })

    expect(result).toEqual(
      expect.objectContaining({
        installed: true,
        plugin: "agent-relay@agent-relay",
        version: packageJson.version,
        marketplaceAdded: false
      })
    )
    expect(existsSync(join(result.cachePath, ".codex-plugin", "plugin.json"))).toBe(true)
    expect(readFileSync(result.configPath, "utf8")).toContain('[plugins."agent-relay@agent-relay"]')
  })

  it("reports plugin install health", () => {
    const codexHome = tempDir()
    installCodexPlugin({ codexHome, packageRoot: process.cwd(), skipCodex: true })
    const report = doctorCodexPlugin({ codexHome, packageRoot: process.cwd() })

    expect(report).toEqual(
      expect.objectContaining({
        cacheInstalled: true,
        configEnabled: true,
        skillInstalled: true
      })
    )
  })

  it("supports plugin install from the built CLI", () => {
    const codexHome = tempDir()
    const output = execFileSync(
      "node",
      ["dist/cli.js", "plugin", "install", "--codex-home", codexHome, "--skip-codex", "--json"],
      { encoding: "utf8" }
    )
    const result = JSON.parse(output) as { installed: boolean; cachePath: string }

    expect(result.installed).toBe(true)
    expect(existsSync(join(result.cachePath, "skills", "agent-relay", "SKILL.md"))).toBe(true)
  })

  it("supports plugin doctor from the built CLI", () => {
    const codexHome = tempDir()
    const result = spawnSync("node", ["dist/cli.js", "plugin", "doctor", "--codex-home", codexHome, "--json"], {
      encoding: "utf8"
    })
    const report = JSON.parse(result.stdout) as { ok: boolean; issues: string[] }

    expect(result.status).not.toBe(0)
    expect(report.ok).toBe(false)
    expect(report.issues).toEqual(expect.arrayContaining([expect.stringContaining("Plugin cache missing")]))
  })
})
