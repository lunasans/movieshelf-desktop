import Database from 'better-sqlite3'
import { applyMigrations } from '../../database'

export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  applyMigrations(db)
  return db
}

export function insertMovie(db: Database.Database, overrides: Record<string, unknown> = {}): number {
  const now = new Date().toISOString()
  const result = db.prepare(`
    INSERT INTO movies (title, year, collection_type, in_collection, is_deleted, is_boxset, created_at, updated_at)
    VALUES (@title, @year, @collection_type, @in_collection, @is_deleted, @is_boxset, @created_at, @updated_at)
  `).run({
    title: 'Test Film', year: 2020, collection_type: 'Film',
    in_collection: 1, is_deleted: 0, is_boxset: 0,
    created_at: now, updated_at: now,
    ...overrides,
  })
  return Number(result.lastInsertRowid)
}
