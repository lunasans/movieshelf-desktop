import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb, insertMovie, insertExternal } from './testDb'
import { createMovie } from '../movies'
import {
  getLists, getList, createList, updateList, deleteList,
  addItemToList, removeItemFromList, getListsForItem,
  getListSyncState, setListRemoteId, markListSynced, deleteListByRemoteId,
  clearListTombstones,
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
    addItemToList(db, list.id, 'movie', movieId)

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
  it('gibt Liste mit gemischten Items (movie + external) zurück', () => {
    const list = createList(db, 'Meine Liste') as any
    const movieId = insertMovie(db, { title: 'Inception' })
    const extId = insertExternal(db, { title: 'Dune (Wunsch)' })
    addItemToList(db, list.id, 'movie', movieId)
    addItemToList(db, list.id, 'external', extId)

    const result = getList(db, list.id) as any
    expect(result.name).toBe('Meine Liste')
    expect(result.items).toHaveLength(2)
    const movie = result.items.find((i: any) => i.item_type === 'movie')
    const external = result.items.find((i: any) => i.item_type === 'external')
    expect(movie.title).toBe('Inception')
    expect(external.title).toBe('Dune (Wunsch)')
  })

  it('gibt null zurück wenn Liste nicht existiert', () => {
    expect(getList(db, 9999)).toBeNull()
  })

  it('schließt gelöschte Sammlungsfilme aus', () => {
    const list = createList(db, 'Liste') as any
    const movieId = insertMovie(db, { is_deleted: 1 })
    addItemToList(db, list.id, 'movie', movieId)

    const result = getList(db, list.id) as any
    expect(result.items).toHaveLength(0)
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

  it('räumt externe Filme auf, die nur in dieser Liste waren', () => {
    const list = createList(db, 'Einzige Liste') as any
    const extId = insertExternal(db)
    addItemToList(db, list.id, 'external', extId)
    deleteList(db, list.id)

    const gone = db.prepare('SELECT id FROM external_movies WHERE id = ?').get(extId)
    expect(gone).toBeUndefined()
  })

  it('lässt externe Filme bestehen, die noch in anderen Listen sind', () => {
    const listA = createList(db, 'A') as any
    const listB = createList(db, 'B') as any
    const extId = insertExternal(db)
    addItemToList(db, listA.id, 'external', extId)
    addItemToList(db, listB.id, 'external', extId)
    deleteList(db, listA.id)

    const still = db.prepare('SELECT id FROM external_movies WHERE id = ?').get(extId)
    expect(still).toBeDefined()
  })

  it('lässt Sammlungsfilme unangetastet', () => {
    const list = createList(db, 'Liste') as any
    const movieId = insertMovie(db)
    addItemToList(db, list.id, 'movie', movieId)
    deleteList(db, list.id)

    const still = db.prepare('SELECT id FROM movies WHERE id = ?').get(movieId)
    expect(still).toBeDefined()
  })
})

describe('addItemToList / removeItemFromList', () => {
  it('verknüpft einen Sammlungsfilm mit einer Liste', () => {
    const list = createList(db, 'Liste') as any
    const movieId = insertMovie(db)
    addItemToList(db, list.id, 'movie', movieId)

    expect(getListsForItem(db, 'movie', movieId)).toContain(list.id)
  })

  it('Sammlungsfilm bleibt erhalten, wenn er aus der Liste entfernt wird', () => {
    const list = createList(db, 'Liste') as any
    const movieId = insertMovie(db)
    addItemToList(db, list.id, 'movie', movieId)
    removeItemFromList(db, list.id, 'movie', movieId)

    const still = db.prepare('SELECT id FROM movies WHERE id = ?').get(movieId)
    expect(still).toBeDefined()
  })

  it('externer Film wird gelöscht, wenn er in keiner Liste mehr ist', () => {
    const list = createList(db, 'Liste') as any
    const extId = insertExternal(db)
    addItemToList(db, list.id, 'external', extId)
    removeItemFromList(db, list.id, 'external', extId)

    const gone = db.prepare('SELECT id FROM external_movies WHERE id = ?').get(extId)
    expect(gone).toBeUndefined()
  })

  it('Entfernen aktualisiert updated_at der Liste (wie Hinzufügen)', () => {
    const list = createList(db, 'Liste') as any
    const movieId = insertMovie(db)
    addItemToList(db, list.id, 'movie', movieId)
    db.prepare("UPDATE lists SET updated_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(list.id)

    removeItemFromList(db, list.id, 'movie', movieId)

    const row = db.prepare('SELECT updated_at FROM lists WHERE id = ?').get(list.id) as any
    expect(row.updated_at > '2020-01-01T00:00:00.000Z').toBe(true)
  })

  it('externer Film bleibt, solange er noch in einer anderen Liste ist', () => {
    const listA = createList(db, 'A') as any
    const listB = createList(db, 'B') as any
    const extId = insertExternal(db)
    addItemToList(db, listA.id, 'external', extId)
    addItemToList(db, listB.id, 'external', extId)
    removeItemFromList(db, listA.id, 'external', extId)

    const still = db.prepare('SELECT id FROM external_movies WHERE id = ?').get(extId)
    expect(still).toBeDefined()
  })
})

describe('Tombstones (lokale Listen-Entfernungen für den Sync merken)', () => {
  it('Entfernen eines synchronisierten Items legt einen Tombstone an', () => {
    const list = createList(db, 'Liste') as any
    const movie = createMovie(db, { title: 'Sync-Film', remote_id: 42, in_collection: 1 }) as any
    addItemToList(db, list.id, 'movie', movie.id)
    removeItemFromList(db, list.id, 'movie', movie.id)

    const state = getListSyncState(db) as any[]
    const entry = state.find(s => s.id === list.id)
    expect(entry.tombstones).toContainEqual({ type: 'movie', remote_id: 42 })
  })

  it('Items ohne remote_id erzeugen keinen Tombstone', () => {
    const list = createList(db, 'Liste') as any
    const movieId = insertMovie(db)
    addItemToList(db, list.id, 'movie', movieId)
    removeItemFromList(db, list.id, 'movie', movieId)

    const state = getListSyncState(db) as any[]
    expect(state.find(s => s.id === list.id).tombstones).toHaveLength(0)
  })

  it('externe Filme: Tombstone überlebt den Orphan-Cleanup', () => {
    const list = createList(db, 'Liste') as any
    const extId = insertExternal(db, { remote_id: 77 })
    addItemToList(db, list.id, 'external', extId)
    removeItemFromList(db, list.id, 'external', extId) // löscht auch external_movies-Zeile

    const state = getListSyncState(db) as any[]
    expect(state.find(s => s.id === list.id).tombstones).toContainEqual({ type: 'external', remote_id: 77 })
  })

  it('erneutes Hinzufügen hebt den Tombstone auf', () => {
    const list = createList(db, 'Liste') as any
    const movie = createMovie(db, { title: 'Film', remote_id: 42, in_collection: 1 }) as any
    addItemToList(db, list.id, 'movie', movie.id)
    removeItemFromList(db, list.id, 'movie', movie.id)
    addItemToList(db, list.id, 'movie', movie.id)

    const state = getListSyncState(db) as any[]
    expect(state.find(s => s.id === list.id).tombstones).toHaveLength(0)
  })

  it('clearListTombstones löscht die Merker der Liste (nach Push)', () => {
    const list = createList(db, 'Liste') as any
    const movie = createMovie(db, { title: 'Film', remote_id: 42, in_collection: 1 }) as any
    addItemToList(db, list.id, 'movie', movie.id)
    removeItemFromList(db, list.id, 'movie', movie.id)

    clearListTombstones(db, list.id)

    const state = getListSyncState(db) as any[]
    expect(state.find(s => s.id === list.id).tombstones).toHaveLength(0)
  })

  it('Löschen der Liste räumt ihre Tombstones mit ab (FK-Cascade)', () => {
    const list = createList(db, 'Liste') as any
    const movie = createMovie(db, { title: 'Film', remote_id: 42, in_collection: 1 }) as any
    addItemToList(db, list.id, 'movie', movie.id)
    removeItemFromList(db, list.id, 'movie', movie.id)
    deleteList(db, list.id)

    const rows = db.prepare('SELECT * FROM list_item_tombstones').all()
    expect(rows).toHaveLength(0)
  })
})

describe('getListsForItem', () => {
  it('gibt korrekte List-IDs zurück', () => {
    const listA = createList(db, 'A') as any
    const listB = createList(db, 'B') as any
    const movieId = insertMovie(db)
    addItemToList(db, listA.id, 'movie', movieId)
    addItemToList(db, listB.id, 'movie', movieId)

    const ids = getListsForItem(db, 'movie', movieId)
    expect(ids).toHaveLength(2)
    expect(ids).toContain(listA.id)
    expect(ids).toContain(listB.id)
  })
})

describe('getListSyncState', () => {
  it('enthält Items mit remote_id (movie + external)', () => {
    const list = createList(db, 'Sync-Liste') as any
    const movie = createMovie(db, { title: 'Mit Remote', remote_id: 42, in_collection: 1 }) as any
    const extId = insertExternal(db, { remote_id: 77 })
    addItemToList(db, list.id, 'movie', movie.id)
    addItemToList(db, list.id, 'external', extId)

    const state = getListSyncState(db) as any[]
    const entry = state.find(s => s.id === list.id)
    expect(entry.items).toContainEqual({ type: 'movie', remote_id: 42 })
    expect(entry.items).toContainEqual({ type: 'external', remote_id: 77 })
  })

  it('schließt Items ohne remote_id aus', () => {
    const list = createList(db, 'Liste') as any
    const movieId = insertMovie(db)
    addItemToList(db, list.id, 'movie', movieId)

    const state = getListSyncState(db) as any[]
    const entry = state.find(s => s.id === list.id)
    expect(entry.items).toHaveLength(0)
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
