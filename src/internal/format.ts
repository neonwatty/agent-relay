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
  if ("record" in record && "conflicts" in record) {
    return formatClaimResult(record)
  }

  const parts = [
    record.id,
    record.project,
    record.session,
    record.type ?? record.kind,
    record.status,
    record.summary
  ].filter(Boolean)

  if (parts.length === 0) {
    return JSON.stringify(value)
  }

  return parts.join("  ")
}

function formatClaimResult(record: Record<string, unknown>): string {
  const claimRecord = record.record as Record<string, unknown> | undefined
  const conflicts = Array.isArray(record.conflicts) ? record.conflicts : []
  const base = claimRecord ? formatItem(claimRecord) : "claim"

  if (conflicts.length === 0) {
    return `${base}  conflicts: 0`
  }

  return `${base}  conflicts: ${conflicts.length}`
}
