#!/usr/bin/env node
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const MAX_LINES = 260
const checkedExtensions = new Set([".cjs", ".js", ".json", ".mjs", ".ts", ".yaml", ".yml"])
const excludedFiles = new Set(["package-lock.json"])
const excludedPrefixes = [".github/", "coverage/", "dist/", "node_modules/"]

const mode = process.argv.includes("--staged") ? "staged" : "all"
const files = mode === "staged" ? stagedFiles() : trackedFiles()
const oversized = files.filter((file) => shouldCheck(file)).flatMap((file) => {
  const lineCount = countLines(file)
  return lineCount > MAX_LINES ? [{ file, lineCount }] : []
})

if (oversized.length > 0) {
  console.error(`Files exceed ${MAX_LINES} lines:`)
  for (const { file, lineCount } of oversized) {
    console.error(`  ${file}: ${lineCount}`)
  }
  process.exit(1)
}

function trackedFiles() {
  return execFileSync("git", ["ls-files"], { encoding: "utf8" }).trim().split("\n").filter(Boolean)
}

function stagedFiles() {
  return execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf8" }).trim().split("\n").filter(Boolean)
}

function shouldCheck(file) {
  return (
    checkedExtensions.has(extension(file)) &&
    !excludedFiles.has(file) &&
    !excludedPrefixes.some((prefix) => file.startsWith(prefix))
  )
}

function countLines(file) {
  const contents = readFileSync(file, "utf8")
  return contents.length === 0 ? 0 : contents.split(/\r?\n/).length
}

function extension(file) {
  const index = file.lastIndexOf(".")
  return index === -1 ? "" : file.slice(index)
}
