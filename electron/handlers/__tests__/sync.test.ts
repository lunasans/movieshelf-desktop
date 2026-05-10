import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb, insertMovie } from './testDb'
import { getDirtyMovies, markSynced, hardDelete } from '../sync'

let db: Database.Database

beforeEach(() => { db = createTestDb() })

describe('getDirtyMovies', () => {
  it('gibt Filme ohne remote_id zurück', () => {
    insertMovie(db, { title: 'Neu lokal' })
    expect((getDirtyMovies(db) as any[]).some(m => m.title === 'Neu lokal')).toBe(true)
  })

  it('gibt Filme zurück die nach synced_at geändert wurden', () => {
    const id = insertMovie(db, {
      title: 'Geändert',
      remote_id: 1,
      synced_at: '2020-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    })
    db.prepare('UPDATE movies SET remote_id = 1, synced_at = ?, updated_at = ? WHERE id = ?')
      .run('2020-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', id)

    const dirty = getDirtyMovies(db) as any[]
    expect(dirty.some(m => m.id === id)).toBe(true)
  })

  it('gibt gelöschte Filme zurück (is_deleted = 1)', () => {
    const id = insertMovie(db, { is_deleted: 1, remote_id: 2 })
    db.prepare('UPDATE movies SET remote_id = 2, is_deleted = 1 WHERE id = ?').run(id)

    const dirty = getDirtyMovies(db) as any[]
    expect(dirty.some(m => m.id === id)).toBe(true)
  })

  it('gibt synchronisierte, unveränderte Filme NICHT zurück', () => {
    const ts = '2024-01-01T00:00:00.000Z'
    const id = insertMovie(db)
    db.prepare('UPDATE movies SET remote_id = 99, synced_at = ?, updated_at = ? WHERE id = ?')
      .run(ts, ts, id)

    const dirty = getDirtyMovies(db) as any[]
    expect(dirty.some(m => m.id === id)).toBe(false)
  })
})

describe('markSynced', () => {
  it('setzt remote_id und synced_at', () => {
    const id = insertMovie(db)
    const ts = new Date().toISOString()

    markSynced(db, { id, remote_id: 55, synced_at: ts })

    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id) as any
    expect(movie.remote_id).toBe(55)
    expect(movie.synced_at).toBe(ts)
    expect(movie.is_deleted).toBe(0)
  })
})

describe('hardDelete', () => {
  it('löscht den Film dauerhaft aus der DB', () => {
    const id = insertMovie(db)
    hardDelete(db, id)

    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id)
    expect(movie).toBeUndefined()
  })
})
