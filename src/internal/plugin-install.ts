import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const pluginName = "agent-relay"
const defaultMarketplaceSource = "neonwatty/agent-relay"

export interface PluginInstallOptions {
  codexHome?: string
  packageRoot?: string
  skipCodex?: boolean
  source?: string
}

export interface PluginInstallResult {
  installed: true
  plugin: string
  version: string
  codexHome: string
  marketplaceSource: string
  cachePath: string
  configPath: string
  marketplaceAdded: boolean
  warnings: string[]
}

export interface PluginDoctorOptions {
  codexHome?: string
  packageRoot?: string
}

export interface PluginDoctorResult {
  ok: boolean
  plugin: string
  expectedVersion: string
  codexHome: string
  codexCliAvailable: boolean
  codexVersion?: string
  cachePath: string
  cacheInstalled: boolean
  configPath: string
  configEnabled: boolean
  skillPath: string
  skillInstalled: boolean
  issues: string[]
}

interface PluginManifest {
  version: string
}

export function installCodexPlugin(options: PluginInstallOptions = {}): PluginInstallResult {
  const packageRoot = options.packageRoot ?? defaultPackageRoot()
  const codexHome = options.codexHome ?? process.env.CODEX_HOME ?? join(homedir(), ".codex")
  const marketplaceSource = options.source ?? defaultMarketplaceSource
  const pluginSource = join(packageRoot, "plugins", pluginName)
  const manifestPath = join(pluginSource, ".codex-plugin", "plugin.json")

  if (!existsSync(manifestPath)) {
    throw new Error(`Plugin manifest not found: ${manifestPath}`)
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as PluginManifest
  const cachePath = join(codexHome, "plugins", "cache", pluginName, pluginName, manifest.version)
  const warnings: string[] = []
  let marketplaceAdded = false

  if (!options.skipCodex) {
    const marketplace = runCodex(["plugin", "marketplace", "add", marketplaceSource], codexHome)
    marketplaceAdded = marketplace.ok
    if (!marketplace.ok) {
      warnings.push(`Could not add Codex marketplace: ${firstLine(marketplace.stderr || marketplace.stdout)}`)
    }
  }

  mkdirSync(dirname(cachePath), { recursive: true })
  rmSync(cachePath, { recursive: true, force: true })
  cpSync(pluginSource, cachePath, { recursive: true })

  const configPath = enablePluginConfig(codexHome)

  return {
    installed: true,
    plugin: `${pluginName}@${pluginName}`,
    version: manifest.version,
    codexHome,
    marketplaceSource,
    cachePath,
    configPath,
    marketplaceAdded,
    warnings
  }
}

export function doctorCodexPlugin(options: PluginDoctorOptions = {}): PluginDoctorResult {
  const packageRoot = options.packageRoot ?? defaultPackageRoot()
  const codexHome = options.codexHome ?? process.env.CODEX_HOME ?? join(homedir(), ".codex")
  const manifest = readBundledManifest(packageRoot)
  const cachePath = pluginCachePath(codexHome, manifest.version)
  const configPath = join(codexHome, "config.toml")
  const skillPath = join(cachePath, "skills", pluginName, "SKILL.md")
  const codex = runCodex(["--version"], codexHome)
  const cacheInstalled = existsSync(join(cachePath, ".codex-plugin", "plugin.json"))
  const configEnabled = isPluginEnabled(configPath)
  const skillInstalled = existsSync(skillPath)
  const issues = [
    ...(!codex.ok ? [`Codex CLI unavailable: ${firstLine(codex.stderr || codex.stdout)}`] : []),
    ...(!cacheInstalled ? [`Plugin cache missing: ${cachePath}`] : []),
    ...(!configEnabled ? [`Plugin is not enabled in config: ${configPath}`] : []),
    ...(!skillInstalled ? [`Skill payload missing: ${skillPath}`] : [])
  ]

  return {
    ok: issues.length === 0,
    plugin: `${pluginName}@${pluginName}`,
    expectedVersion: manifest.version,
    codexHome,
    codexCliAvailable: codex.ok,
    codexVersion: codex.ok ? firstLine(codex.stdout) : undefined,
    cachePath,
    cacheInstalled,
    configPath,
    configEnabled,
    skillPath,
    skillInstalled,
    issues
  }
}

function defaultPackageRoot(): string {
  const starts = [dirname(process.argv[1] ?? ""), dirname(fileURLToPath(import.meta.url))]
  for (const start of starts) {
    const root = findPackageRoot(start)
    if (root) {
      return root
    }
  }

  return resolve(dirname(fileURLToPath(import.meta.url)), "../..")
}

function findPackageRoot(start: string): string | undefined {
  let current = resolve(start)

  while (true) {
    const manifestPath = join(current, "plugins", pluginName, ".codex-plugin", "plugin.json")
    if (existsSync(manifestPath)) {
      return current
    }

    const parent = dirname(current)
    if (parent === current) {
      return undefined
    }
    current = parent
  }
}

function readBundledManifest(packageRoot: string): PluginManifest {
  const manifestPath = join(packageRoot, "plugins", pluginName, ".codex-plugin", "plugin.json")
  if (!existsSync(manifestPath)) {
    throw new Error(`Plugin manifest not found: ${manifestPath}`)
  }

  return JSON.parse(readFileSync(manifestPath, "utf8")) as PluginManifest
}

function pluginCachePath(codexHome: string, version: string): string {
  return join(codexHome, "plugins", "cache", pluginName, pluginName, version)
}

function enablePluginConfig(codexHome: string): string {
  const configPath = join(codexHome, "config.toml")
  mkdirSync(dirname(configPath), { recursive: true })
  const existing = existsSync(configPath) ? readFileSync(configPath, "utf8") : ""
  writeFileSync(configPath, upsertTomlEnabled(existing, `[plugins."${pluginName}@${pluginName}"]`))
  return configPath
}

function isPluginEnabled(configPath: string): boolean {
  if (!existsSync(configPath)) {
    return false
  }

  const lines = readFileSync(configPath, "utf8").split(/\r?\n/)
  const start = lines.findIndex((line) => line.trim() === `[plugins."${pluginName}@${pluginName}"]`)
  if (start === -1) {
    return false
  }

  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s*\[/.test(lines[index])) {
      return false
    }
    if (/^\s*enabled\s*=\s*true\s*$/.test(lines[index])) {
      return true
    }
  }

  return false
}

function upsertTomlEnabled(text: string, header: string): string {
  const normalized = text.endsWith("\n") || text.length === 0 ? text : `${text}\n`
  const lines = normalized.split("\n")
  const start = lines.findIndex((line) => line.trim() === header)

  if (start === -1) {
    const prefix = normalized.trim() ? `${normalized}\n` : ""
    return `${prefix}${header}\nenabled = true\n`
  }

  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s*\[/.test(lines[index])) {
      end = index
      break
    }
  }

  for (let index = start + 1; index < end; index += 1) {
    if (/^\s*enabled\s*=/.test(lines[index])) {
      lines[index] = "enabled = true"
      return lines.join("\n").replace(/\n*$/, "\n")
    }
  }

  lines.splice(start + 1, 0, "enabled = true")
  return lines.join("\n").replace(/\n*$/, "\n")
}

function runCodex(args: string[], codexHome: string): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync("codex", args, {
    encoding: "utf8",
    env: { ...process.env, CODEX_HOME: codexHome }
  })

  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr || result.error?.message || ""
  }
}

function firstLine(value: string): string {
  return value.trim().split(/\r?\n/)[0] || "unknown error"
}
