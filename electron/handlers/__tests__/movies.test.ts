import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb, insertMovie } from './testDb'
import {
  listMovies, countMovies, recentMovies, createMovie, updateMovie,
  deleteMovie, searchMovies, checkTmdbIds, deleteMovieByRemoteId, allRemoteIds,
} from '../movies'

let db: Database.Database

beforeEach(() => { db = createTestDb() })

describe('listMovies', () => {
  it('gibt nur nicht-gelöschte In-Collection-Filme zurück', () => {
    insertMovie(db, { title: 'Sichtbar' })
    insertMovie(db, { title: 'Gelöscht', is_deleted: 1 })
    insertMovie(db, { title: 'Nicht in Sammlung', in_collection: 0 })

    const { data, total } = listMovies(db)
    expect(total).toBe(1)
    expect((data[0] as any).title).toBe('Sichtbar')
  })

  it('paginiert korrekt', () => {
    for (let i = 1; i <= 5; i++) insertMovie(db, { title: `Film ${i}` })

    const page1 = listMovies(db, { page: 1, perPage: 2 })
    const page2 = listMovies(db, { page: 2, perPage: 2 })
    expect(page1.data).toHaveLength(2)
    expect(page2.data).toHaveLength(2)
    expect(page1.total).toBe(5)
  })

  it('filtert nach collection_type', () => {
    insertMovie(db, { title: 'Film A', collection_type: 'Film' })
    insertMovie(db, { title: 'Serie A', collection_type: 'Serie' })

    const { data } = listMovies(db, { collectionType: 'Serie' })
    expect(data).toHaveLength(1)
    expect((data[0] as any).title).toBe('Serie A')
  })

  it('sucht nach Titel', () => {
    insertMovie(db, { title: 'Matrix' })
    insertMovie(db, { title: 'Inception' })

    const { data } = listMovies(db, { q: 'mat' })
    expect(data).toHaveLength(1)
    expect((data[0] as any).title).toBe('Matrix')
  })
})

describe('countMovies', () => {
  it('zählt nur reale Filme (kein Boxset-Parent, nicht gelöscht)', () => {
    insertMovie(db)
    insertMovie(db, { is_deleted: 1 })
    insertMovie(db, { is_boxset: 1 })

    expect(countMovies(db)).toBe(1)
  })
})

describe('recentMovies', () => {
  it('gibt die neuesten Filme zurück', () => {
    insertMovie(db, { title: 'Alt', created_at: '2020-01-01T00:00:00.000Z', updated_at: '2020-01-01T00:00:00.000Z' })
    insertMovie(db, { title: 'Neu', created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' })

    const result = recentMovies(db, 1) as any[]
    expect(result[0].title).toBe('Neu')
  })
})

describe('createMovie', () => {
  it('legt einen neuen Film an', () => {
    const movie = createMovie(db, { title: 'Dune', year: 2021 }) as any
    expect(movie.title).toBe('Dune')
    expect(movie.year).toBe(2021)
    expect(movie.id).toBeDefined()
  })

  it('upserted bei vorhandenem remote_id (ON CONFLICT)', () => {
    createMovie(db, { title: 'Original', remote_id: 42, updated_at: '2020-01-01T00:00:00.000Z' })
    createMovie(db, { title: 'Update', remote_id: 42, updated_at: '2021-01-01T00:00:00.000Z' })

    const all = db.prepare('SELECT * FROM movies WHERE remote_id = 42').all() as any[]
    expect(all).toHaveLength(1)
    expect(all[0].title).toBe('Update')
  })

  it('merged lokalen Film mit gleichem tmdb_id beim ersten Sync', () => {
    const local = createMovie(db, { title: 'Lokal', tmdb_id: 99 }) as any
    createMovie(db, { title: 'Vom Server', tmdb_id: 99, remote_id: 10 })

    const merged = db.prepare('SELECT * FROM movies WHERE id = ?').get(local.id) as any
    expect(merged.remote_id).toBe(10)
    expect(merged.title).toBe('Vom Server')

    const total = db.prepare('SELECT COUNT(*) as c FROM movies').get() as any
    expect(total.c).toBe(1)
  })
})

describe('updateMovie', () => {
  it('aktualisiert erlaubte Felder', () => {
    const id = insertMovie(db, { title: 'Alt' })
    updateMovie(db, id, { title: 'Neu', year: 2023 })

    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id) as any
    expect(movie.title).toBe('Neu')
    expect(movie.year).toBe(2023)
  })

  it('ignoriert nicht-erlaubte Felder (SQL-Injection-Schutz)', () => {
    const id = insertMovie(db)
    updateMovie(db, id, { id: 9999, is_deleted: 1 } as any)

    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id) as any
    expect(movie.id).toBe(id)
    expect(movie.is_deleted).toBe(0)
  })
})

describe('deleteMovie', () => {
  it('setzt is_deleted = 1 (Soft Delete)', () => {
    const id = insertMovie(db)
    deleteMovie(db, id)

    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id) as any
    expect(movie.is_deleted).toBe(1)
  })
})

describe('searchMovies', () => {
  it('findet nach Titel', () => {
    insertMovie(db, { title: 'Der Pate' })
    insertMovie(db, { title: 'Blade Runner' })

    const result = searchMovies(db, 'pate') as any[]
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Der Pate')
  })
})

describe('checkTmdbIds', () => {
  it('gibt nur existierende tmdb_ids zurück', () => {
    db.prepare("INSERT INTO movies (title, tmdb_id, in_collection, is_deleted, is_boxset, created_at, updated_at) VALUES ('X', 111, 1, 0, 0, datetime('now'), datetime('now'))").run()

    const found = checkTmdbIds(db, [111, 222, 333])
    expect(found).toEqual([111])
  })

  it('gibt leeres Array für leere Eingabe zurück', () => {
    expect(checkTmdbIds(db, [])).toEqual([])
  })
})

describe('deleteMovieByRemoteId', () => {
  it('soft-deleted den Film', () => {
    createMovie(db, { title: 'Zu löschen', remote_id: 77 })
    const result = deleteMovieByRemoteId(db, 77)

    expect(result.success).toBe(true)
    expect(result.localId).toBeDefined()

    const movie = db.prepare('SELECT * FROM movies WHERE remote_id = 77').get() as any
    expect(movie.is_deleted).toBe(1)
  })

  it('gibt success: false zurück wenn nicht gefunden', () => {
    expect(deleteMovieByRemoteId(db, 9999).success).toBe(false)
  })
})

describe('allRemoteIds', () => {
  it('gibt nur Filme mit remote_id zurück', () => {
    createMovie(db, { title: 'Mit Remote', remote_id: 5 })
    insertMovie(db, { title: 'Ohne Remote' })

    const ids = allRemoteIds(db)
    expect(ids).toHaveLength(1)
    expect(ids[0].remote_id).toBe(5)
  })
})
