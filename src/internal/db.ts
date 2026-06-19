import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import Database from "better-sqlite3"
import { getConfig } from "./config.js"
import { MIGRATION_001, SCHEMA_VERSION } from "./schema.js"

export type RelayDb = Database.Database

let db: RelayDb | undefined

export function openRelayDb(): RelayDb {
  if (db?.open) {
    return db
  }

  const config = getConfig()
  mkdirSync(dirname(config.dbPath), { recursive: true })
  db = new Database(config.dbPath)
  db.pragma("journal_mode = WAL")
  db.pragma("busy_timeout = 5000")
  db.pragma("foreign_keys = ON")
  migrate(db)
  return db
}

export function closeRelayDb(): void {
  if (db?.open) {
    db.close()
  }
  db = undefined
}

export function migrate(database: RelayDb): void {
  const version = database.pragma("user_version", { simple: true }) as number
  if (version < 1) {
    database.exec(MIGRATION_001)
    database.pragma(`user_version = ${SCHEMA_VERSION}`)
  }
}
