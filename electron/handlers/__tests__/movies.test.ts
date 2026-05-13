import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb, insertMovie } from './testDb'
import {
  listMovies, countMovies, recentMovies, createMovie, updateMovie,
  deleteMovie, searchMovies, checkTmdbIds, deleteMovieByRemoteId, allRemoteIds,
  getMovie, getMovieByRemoteId, getMovieChildren, clearMovies,
  randomMovie, toggleWatched, bulkDelete, bulkUpdateTag, importMovies,
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

describe('getMovie', () => {
  it('findet Film nach id', () => {
    const id = insertMovie(db, { title: 'Fundfilm' })
    const movie = getMovie(db, id) as any
    expect(movie.title).toBe('Fundfilm')
  })

  it('fällt auf remote_id zurück wenn id keinen Treffer liefert', () => {
    createMovie(db, { title: 'Per Remote', remote_id: 77 })
    const movie = getMovie(db, 77) as any
    expect(movie.title).toBe('Per Remote')
  })

  it('gibt undefined zurück wenn Film gelöscht', () => {
    const id = insertMovie(db, { is_deleted: 1 })
    expect(getMovie(db, id)).toBeUndefined()
  })
})

describe('getMovieByRemoteId', () => {
  it('findet Film anhand remote_id', () => {
    createMovie(db, { title: 'Fernfilm', remote_id: 42 })
    const movie = getMovieByRemoteId(db, 42) as any
    expect(movie.title).toBe('Fernfilm')
  })

  it('gibt null zurück wenn remote_id nicht gefunden', () => {
    expect(getMovieByRemoteId(db, 9999)).toBeNull()
  })
})

describe('getMovieChildren', () => {
  it('gibt Kinder eines Boxsets zurück', () => {
    const boxset = insertMovie(db, { title: 'Boxset', is_boxset: 1 })
    insertMovie(db, { title: 'Kind 1', boxset_parent_id: boxset })
    insertMovie(db, { title: 'Kind 2', boxset_parent_id: boxset })

    const children = getMovieChildren(db, boxset) as any[]
    expect(children).toHaveLength(2)
  })

  it('schließt gelöschte Kinder aus', () => {
    const boxset = insertMovie(db, { title: 'Boxset', is_boxset: 1 })
    insertMovie(db, { title: 'Aktiv', boxset_parent_id: boxset })
    insertMovie(db, { title: 'Gelöscht', boxset_parent_id: boxset, is_deleted: 1 })

    const children = getMovieChildren(db, boxset) as any[]
    expect(children).toHaveLength(1)
    expect(children[0].title).toBe('Aktiv')
  })
})

describe('clearMovies', () => {
  it('gibt success: false zurück ohne Bestätigung', () => {
    insertMovie(db)
    const result = clearMovies(db)
    expect(result.success).toBe(false)
    expect(db.prepare('SELECT COUNT(*) as c FROM movies').get() as any).toMatchObject({ c: 1 })
  })

  it('löscht alle Filme, Schauspieler und Verknüpfungen mit confirmed=true', () => {
    insertMovie(db)
    const result = clearMovies(db, true)
    expect(result.success).toBe(true)
    expect((db.prepare('SELECT COUNT(*) as c FROM movies').get() as any).c).toBe(0)
    expect((db.prepare('SELECT COUNT(*) as c FROM actors').get() as any).c).toBe(0)
    expect((db.prepare('SELECT COUNT(*) as c FROM film_actor').get() as any).c).toBe(0)
  })
})

describe('listMovies — sortBy / sortDir / genres', () => {
  it('sortiert nach year ASC', () => {
    insertMovie(db, { title: 'Neu', year: 2022 })
    insertMovie(db, { title: 'Alt', year: 2010 })

    const { data } = listMovies(db, { sortBy: 'year', sortDir: 'ASC' })
    expect((data[0] as any).year).toBe(2010)
    expect((data[1] as any).year).toBe(2022)
  })

  it('sortiert nach rating DESC', () => {
    insertMovie(db, { title: 'Hoch', rating: 9.0 })
    insertMovie(db, { title: 'Niedrig', rating: 5.0 })

    const { data } = listMovies(db, { sortBy: 'rating', sortDir: 'DESC' })
    expect((data[0] as any).rating).toBe(9.0)
  })

  it('filtert nach einzelnem Genre (LIKE)', () => {
    insertMovie(db, { title: 'Actionfilm', genre: 'Action, Thriller' })
    insertMovie(db, { title: 'Komödie', genre: 'Comedy' })

    const { data } = listMovies(db, { genres: ['Action'] })
    expect(data).toHaveLength(1)
    expect((data[0] as any).title).toBe('Actionfilm')
  })

  it('filtert nach mehreren Genres (Schnittmenge)', () => {
    insertMovie(db, { title: 'Beide', genre: 'Action, Drama' })
    insertMovie(db, { title: 'Nur Action', genre: 'Action' })

    const { data } = listMovies(db, { genres: ['Action', 'Drama'] })
    expect(data).toHaveLength(1)
    expect((data[0] as any).title).toBe('Beide')
  })

  it('fällt auf title ASC zurück bei ungültigem sortBy', () => {
    insertMovie(db, { title: 'Zebra' })
    insertMovie(db, { title: 'Apfel' })

    const { data } = listMovies(db, { sortBy: 'DROP TABLE' as any })
    expect((data[0] as any).title).toBe('Apfel')
  })
})

describe('randomMovie', () => {
  it('gibt einen Film zurück wenn DB nicht leer', () => {
    insertMovie(db, { title: 'Einziger Film' })
    const movie = randomMovie(db) as any
    expect(movie).not.toBeNull()
    expect(movie.title).toBe('Einziger Film')
  })

  it('gibt null zurück bei leerer DB', () => {
    expect(randomMovie(db)).toBeNull()
  })

  it('filtert nach collectionType', () => {
    insertMovie(db, { title: 'Film', collection_type: 'Film' })
    insertMovie(db, { title: 'Serie', collection_type: 'Serie' })

    const movie = randomMovie(db, { collectionType: 'Serie' }) as any
    expect(movie.title).toBe('Serie')
  })

  it('filtert nach Genre', () => {
    insertMovie(db, { title: 'Action', genre: 'Action' })
    insertMovie(db, { title: 'Drama', genre: 'Drama' })

    const movie = randomMovie(db, { genre: 'Drama' }) as any
    expect(movie.title).toBe('Drama')
  })
})

describe('toggleWatched', () => {
  it('setzt is_watched von 0 auf 1', () => {
    const id = insertMovie(db, { is_watched: 0 })
    const result = toggleWatched(db, id)
    expect(result.is_watched).toBe(true)
  })

  it('setzt is_watched von 1 auf 0', () => {
    const id = insertMovie(db, { is_watched: 1 })
    const result = toggleWatched(db, id)
    expect(result.is_watched).toBe(false)
  })
})

describe('bulkDelete', () => {
  it('soft-deleted alle übergebenen IDs', () => {
    const id1 = insertMovie(db, { title: 'A' })
    const id2 = insertMovie(db, { title: 'B' })
    insertMovie(db, { title: 'C' })

    const result = bulkDelete(db, [id1, id2])
    expect(result.deleted).toBe(2)

    const remaining = db.prepare('SELECT COUNT(*) as c FROM movies WHERE is_deleted = 0').get() as any
    expect(remaining.c).toBe(1)
  })

  it('gibt deleted: 0 für leere Liste zurück', () => {
    expect(bulkDelete(db, [])).toEqual({ deleted: 0 })
  })
})

describe('bulkUpdateTag', () => {
  it('setzt tag für alle übergebenen IDs', () => {
    const id1 = insertMovie(db, { title: 'A' })
    const id2 = insertMovie(db, { title: 'B' })

    const result = bulkUpdateTag(db, [id1, id2], 'Favorit')
    expect(result.updated).toBe(2)

    const movies = db.prepare('SELECT tag FROM movies WHERE id IN (?, ?)').all(id1, id2) as any[]
    expect(movies.every(m => m.tag === 'Favorit')).toBe(true)
  })

  it('gibt updated: 0 für leere Liste zurück', () => {
    expect(bulkUpdateTag(db, [], 'x')).toEqual({ updated: 0 })
  })
})

describe('importMovies', () => {
  it('importiert neue Filme', () => {
    const result = importMovies(db, [
      { title: 'Erster', year: 2020 },
      { title: 'Zweiter', year: 2021 },
      { title: 'Dritter', year: 2022 },
    ])
    expect(result.imported).toBe(3)
    expect(result.skipped).toBe(0)
  })

  it('überspringt Duplikate (gleicher title + year)', () => {
    insertMovie(db, { title: 'Bereits vorhanden', year: 2019 })

    const result = importMovies(db, [
      { title: 'Bereits vorhanden', year: 2019 },
      { title: 'Neu', year: 2023 },
    ])
    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(1)
  })

  it('überspringt Zeilen ohne Titel', () => {
    const result = importMovies(db, [{ title: '' }, { title: 'Gültig' }] as any)
    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(1)
  })

  it('setzt is_watched korrekt', () => {
    importMovies(db, [{ title: 'Gesehen', year: 2020, is_watched: true }])
    const movie = db.prepare("SELECT is_watched FROM movies WHERE title = 'Gesehen'").get() as any
    expect(movie.is_watched).toBe(1)
  })
})
