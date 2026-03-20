import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (global.__db) return global.__db;

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(path.join(dataDir, "ortho.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS practices (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      phone       TEXT,
      address     TEXT,
      website     TEXT,
      email       TEXT,
      status      TEXT NOT NULL DEFAULT 'not_contacted',
      practice_type TEXT NOT NULL DEFAULT 'unknown',
      google_place_id TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_practices_phone
      ON practices(phone) WHERE phone IS NOT NULL AND phone != '';

    CREATE TABLE IF NOT EXISTS outreach_notes (
      id          TEXT PRIMARY KEY,
      practice_id TEXT NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
      call_date   TEXT NOT NULL,
      notes       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add practice_type column for existing databases
  try {
    db.exec(`ALTER TABLE practices ADD COLUMN practice_type TEXT NOT NULL DEFAULT 'unknown'`);
  } catch {
    // Column already exists — ignore
  }

  global.__db = db;
  return db;
}
