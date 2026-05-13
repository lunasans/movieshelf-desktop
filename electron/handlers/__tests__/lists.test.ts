import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb, insertMovie } from './testDb'
import { createMovie } from '../movies'
import {
  getLists, getList, createList, updateList, deleteList,
  addMovieToList, removeMovieFromList, getListsForMovie,
  getListSyncState, setListRemoteId, markListSynced, deleteListByRemoteId,
} from '../lists'

let db: Database.Database

beforeEach(() => { db = createTestDb() })

describe('createList', () => {
  it('erstellt eine Liste und gibt sie zurück', () => {
    const list = createList(db, 'Favoriten') as any
    expect(list.name).toBe('Favoriten')
    expect(list.id).toBeDefined()
    expect(list.created_at).toBeDefined()
  })
})

describe('getLists', () => {
  it('gibt Listen mit movie_count zurück', () => {
    const list = createList(db, 'Liste A') as any
    const movieId = insertMovie(db)
    addMovieToList(db, list.id, movieId)

    const lists = getLists(db) as any[]
    expect(lists).toHaveLength(1)
    expect(lists[0].movie_count).toBe(1)
  })

  it('sortiert alphabetisch', () => {
    createList(db, 'Z-Liste')
    createList(db, 'A-Liste')

    const lists = getLists(db) as any[]
    expect(lists[0].name).toBe('A-Liste')
    expect(lists[1].name).toBe('Z-Liste')
  })
})

describe('getList', () => {
  it('gibt Liste mit zugehörigen Filmen zurück', () => {
    const list = createList(db, 'Meine Liste') as any
    const movieId = insertMovie(db, { title: 'Inception' })
    addMovieToList(db, list.id, movieId)

    const result = getList(db, list.id) as any
    expect(result.name).toBe('Meine Liste')
    expect(result.movies).toHaveLength(1)
    expect(result.movies[0].title).toBe('Inception')
  })

  it('gibt null zurück wenn Liste nicht existiert', () => {
    expect(getList(db, 9999)).toBeNull()
  })

  it('schließt gelöschte Filme aus', () => {
    const list = createList(db, 'Liste') as any
    const movieId = insertMovie(db, { is_deleted: 1 })
    addMovieToList(db, list.id, movieId)

    const result = getList(db, list.id) as any
    expect(result.movies).toHaveLength(0)
  })
})

describe('updateList', () => {
  it('ändert den Namen der Liste', () => {
    const list = createList(db, 'Alt') as any
    updateList(db, list.id, 'Neu')

    const updated = getList(db, list.id) as any
    expect(updated.name).toBe('Neu')
  })
})

describe('deleteList', () => {
  it('löscht die Liste', () => {
    const list = createList(db, 'Zu löschen') as any
    deleteList(db, list.id)

    expect(getList(db, list.id)).toBeNull()
  })
})

describe('addMovieToList / removeMovieFromList', () => {
  it('verknüpft einen Film mit einer Liste', () => {
    const list = createList(db, 'Liste') as any
    const movieId = insertMovie(db)
    addMovieToList(db, list.id, movieId)

    expect(getListsForMovie(db, movieId)).toContain(list.id)
  })

  it('entfernt Film aus Liste; Film bleibt wenn in_collection=1', () => {
    const list = createList(db, 'Liste') as any
    const movieId = insertMovie(db, { in_collection: 1 })
    addMovieToList(db, list.id, movieId)
    removeMovieFromList(db, list.id, movieId)

    const still = db.prepare('SELECT id FROM movies WHERE id = ?').get(movieId)
    expect(still).toBeDefined()
  })

  it('löscht Film wenn in_collection=0 und nicht mehr in einer Liste', () => {
    const list = createList(db, 'Liste') as any
    const movieId = insertMovie(db, { in_collection: 0 })
    addMovieToList(db, list.id, movieId)
    removeMovieFromList(db, list.id, movieId)

    const gone = db.prepare('SELECT id FROM movies WHERE id = ?').get(movieId)
    expect(gone).toBeUndefined()
  })
})

describe('getListsForMovie', () => {
  it('gibt korrekte List-IDs zurück', () => {
    const listA = createList(db, 'A') as any
    const listB = createList(db, 'B') as any
    const movieId = insertMovie(db)
    addMovieToList(db, listA.id, movieId)
    addMovieToList(db, listB.id, movieId)

    const ids = getListsForMovie(db, movieId)
    expect(ids).toHaveLength(2)
    expect(ids).toContain(listA.id)
    expect(ids).toContain(listB.id)
  })
})

describe('getListSyncState', () => {
  it('enthält remote_ids der verknüpften Filme', () => {
    const list = createList(db, 'Sync-Liste') as any
    const movie = createMovie(db, { title: 'Mit Remote', remote_id: 42, in_collection: 1 }) as any
    addMovieToList(db, list.id, movie.id)

    const state = getListSyncState(db) as any[]
    const entry = state.find(s => s.id === list.id)
    expect(entry.movie_remote_ids).toContain(42)
  })

  it('schließt Filme ohne remote_id aus', () => {
    const list = createList(db, 'Liste') as any
    const movieId = insertMovie(db)
    addMovieToList(db, list.id, movieId)

    const state = getListSyncState(db) as any[]
    const entry = state.find(s => s.id === list.id)
    expect(entry.movie_remote_ids).toHaveLength(0)
  })
})

describe('setListRemoteId / markListSynced', () => {
  it('setzt remote_id und synced_at', () => {
    const list = createList(db, 'Remote') as any
    setListRemoteId(db, list.id, 99)

    const row = db.prepare('SELECT remote_id, synced_at FROM lists WHERE id = ?').get(list.id) as any
    expect(row.remote_id).toBe(99)
    expect(row.synced_at).toBeDefined()
  })

  it('markListSynced setzt synced_at', () => {
    const list = createList(db, 'Sync') as any
    markListSynced(db, list.id)

    const row = db.prepare('SELECT synced_at FROM lists WHERE id = ?').get(list.id) as any
    expect(row.synced_at).toBeDefined()
  })
})

describe('deleteListByRemoteId', () => {
  it('löscht Liste anhand remote_id', () => {
    const list = createList(db, 'Remote-Liste') as any
    setListRemoteId(db, list.id, 55)
    const result = deleteListByRemoteId(db, 55)

    expect(result.success).toBe(true)
    expect(getList(db, list.id)).toBeNull()
  })

  it('gibt success: false zurück wenn remote_id nicht gefunden', () => {
    expect(deleteListByRemoteId(db, 9999).success).toBe(false)
  })
})
