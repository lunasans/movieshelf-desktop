import Database from 'better-sqlite3'
import { applyMigrations } from '../../database'

export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  applyMigrations(db)
  return db
}

export function insertActor(db: Database.Database, overrides: Record<string, unknown> = {}): number {
  const now = new Date().toISOString()
  const result = db.prepare(`
    INSERT INTO actors (name, created_at, updated_at)
    VALUES (@name, @created_at, @updated_at)
  `).run({ name: 'Test Actor', created_at: now, updated_at: now, ...overrides })
  return Number(result.lastInsertRowid)
}

export function insertExternal(db: Database.Database, overrides: Record<string, unknown> = {}): number {
  const now = new Date().toISOString()
  const result = db.prepare(`
    INSERT INTO external_movies (title, year, collection_type, tmdb_id, remote_id, created_at, updated_at)
    VALUES (@title, @year, @collection_type, @tmdb_id, @remote_id, @created_at, @updated_at)
  `).run({
    title: 'Externer Film', year: 2021, collection_type: 'Film',
    tmdb_id: null, remote_id: null, created_at: now, updated_at: now,
    ...overrides,
  })
  return Number(result.lastInsertRowid)
}

export function insertMovie(db: Database.Database, overrides: Record<string, unknown> = {}): number {
  const now = new Date().toISOString()
  const result = db.prepare(`
    INSERT INTO movies (
      title, year, collection_type, in_collection, is_deleted, is_boxset,
      runtime, rating, genre, is_watched, boxset_parent_id, created_at, updated_at
    ) VALUES (
      @title, @year, @collection_type, @in_collection, @is_deleted, @is_boxset,
      @runtime, @rating, @genre, @is_watched, @boxset_parent_id, @created_at, @updated_at
    )
  `).run({
    title: 'Test Film', year: 2020, collection_type: 'Film',
    in_collection: 1, is_deleted: 0, is_boxset: 0,
    runtime: null, rating: null, genre: null, is_watched: 0, boxset_parent_id: null,
    created_at: now, updated_at: now,
    ...overrides,
  })
  return Number(result.lastInsertRowid)
}
