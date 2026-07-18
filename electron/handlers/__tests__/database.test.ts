import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type Database from 'better-sqlite3'
import { applyMigrations } from '../../database'
import { createTestDb, insertMovie } from './testDb'

describe('collection_type-Normalisierung (Film | Serie, Medium im Tag)', () => {
  let db: Database.Database

  beforeEach(() => { db = createTestDb() })
  afterEach(() => { db.close() })

  function typeAndTag(id: number) {
    return db.prepare('SELECT collection_type, tag FROM movies WHERE id = ?').get(id) as {
      collection_type: string | null
      tag: string | null
    }
  }

  it('rettet Format-Werte in leere Tags und normalisiert auf Film', () => {
    const id = insertMovie(db, { collection_type: 'Blu-ray' })
    applyMigrations(db)
    expect(typeAndTag(id)).toEqual({ collection_type: 'Film', tag: 'BluRay' })
  })

  it('überschreibt einen vorhandenen Tag nicht', () => {
    const id = insertMovie(db, { collection_type: 'DVD' })
    db.prepare('UPDATE movies SET tag = ? WHERE id = ?').run('4K', id)
    applyMigrations(db)
    expect(typeAndTag(id)).toEqual({ collection_type: 'Film', tag: '4K' })
  })

  it('normalisiert Nicht-Format-Typen ohne Tag-Änderung', () => {
    const doku = insertMovie(db, { collection_type: 'Dokumentation' })
    const kurz = insertMovie(db, { collection_type: 'Kurzfilm' })
    applyMigrations(db)
    expect(typeAndTag(doku)).toEqual({ collection_type: 'Film', tag: null })
    expect(typeAndTag(kurz)).toEqual({ collection_type: 'Film', tag: null })
  })

  it('lässt Film, Serie und NULL unverändert', () => {
    const film = insertMovie(db, { collection_type: 'Film' })
    const serie = insertMovie(db, { collection_type: 'Serie' })
    const leer = insertMovie(db, { collection_type: null })
    applyMigrations(db)
    expect(typeAndTag(film).collection_type).toBe('Film')
    expect(typeAndTag(serie).collection_type).toBe('Serie')
    expect(typeAndTag(leer).collection_type).toBeNull()
  })
})
