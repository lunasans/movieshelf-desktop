import { ipcMain } from 'electron'
import { getDb } from '../database'
import type Database from 'better-sqlite3'

export function getLists(db: Database.Database) {
  return db.prepare(`
    SELECT l.*,
      (SELECT COUNT(*) FROM list_items li WHERE li.list_id = l.id) AS movie_count
    FROM lists l
    ORDER BY l.name ASC
  `).all()
}

/** Liste inkl. gemischter Items (Sammlungs- + externe Filme), je mit item_type. */
export function getList(db: Database.Database, id: number) {
  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(id)
  if (!list) return null

  const movies = db.prepare(`
    SELECT m.*, 'movie' AS item_type, li.added_at AS list_added_at
    FROM movies m
    JOIN list_items li ON li.item_id = m.id AND li.item_type = 'movie'
    WHERE li.list_id = ? AND m.is_deleted = 0
  `).all(id) as any[]

  const external = db.prepare(`
    SELECT e.*, 'external' AS item_type, li.added_at AS list_added_at
    FROM external_movies e
    JOIN list_items li ON li.item_id = e.id AND li.item_type = 'external'
    WHERE li.list_id = ?
  `).all(id) as any[]

  const items = [...movies, ...external].sort(
    (a, b) => String(a.list_added_at ?? '').localeCompare(String(b.list_added_at ?? ''))
  )

  return { ...(list as object), items }
}

export function createList(db: Database.Database, name: string) {
  const now = new Date().toISOString()
  const result = db.prepare(
    'INSERT INTO lists (name, created_at, updated_at) VALUES (?, ?, ?)'
  ).run(name.trim(), now, now)
  return db.prepare('SELECT * FROM lists WHERE id = ?').get(result.lastInsertRowid)
}

export function updateList(db: Database.Database, id: number, name: string) {
  const now = new Date().toISOString()
  db.prepare('UPDATE lists SET name = ?, updated_at = ? WHERE id = ?').run(name.trim(), now, id)
  return db.prepare('SELECT * FROM lists WHERE id = ?').get(id)
}

export function deleteList(db: Database.Database, id: number) {
  db.prepare('DELETE FROM lists WHERE id = ?').run(id) // list_items cascaden via FK
  return { success: true }
}

/** Sync-Zustand: pro Liste die Items als {type, remote_id} (nur Items mit remote_id). */
export function getListSyncState(db: Database.Database) {
  const lists = db.prepare('SELECT * FROM lists').all() as any[]
  return lists.map(list => {
    const movieItems = db.prepare(`
      SELECT m.remote_id FROM movies m
      JOIN list_items li ON li.item_id = m.id AND li.item_type = 'movie'
      WHERE li.list_id = ? AND m.remote_id IS NOT NULL
    `).all(list.id) as { remote_id: number }[]

    const extItems = db.prepare(`
      SELECT e.remote_id FROM external_movies e
      JOIN list_items li ON li.item_id = e.id AND li.item_type = 'external'
      WHERE li.list_id = ? AND e.remote_id IS NOT NULL
    `).all(list.id) as { remote_id: number }[]

    return {
      id: list.id,
      name: list.name,
      remote_id: list.remote_id ?? null,
      synced_at: list.synced_at ?? null,
      updated_at: list.updated_at,
      items: [
        ...movieItems.map(m => ({ type: 'movie', remote_id: m.remote_id })),
        ...extItems.map(e => ({ type: 'external', remote_id: e.remote_id })),
      ],
    }
  })
}

export function setListRemoteId(db: Database.Database, id: number, remoteId: number) {
  const now = new Date().toISOString()
  db.prepare('UPDATE lists SET remote_id = ?, synced_at = ? WHERE id = ?').run(remoteId, now, id)
  return { success: true }
}

export function markListSynced(db: Database.Database, id: number) {
  const now = new Date().toISOString()
  db.prepare('UPDATE lists SET synced_at = ? WHERE id = ?').run(now, id)
  return { success: true }
}

export function deleteListByRemoteId(db: Database.Database, remoteId: number) {
  const list = db.prepare('SELECT id FROM lists WHERE remote_id = ?').get(remoteId) as { id: number } | undefined
  if (!list) return { success: false }
  db.prepare('DELETE FROM lists WHERE id = ?').run(list.id)
  return { success: true }
}

export function addItemToList(db: Database.Database, listId: number, itemType: 'movie' | 'external', itemId: number) {
  const now = new Date().toISOString()
  db.prepare(
    'INSERT OR IGNORE INTO list_items (list_id, item_type, item_id, added_at) VALUES (?, ?, ?, ?)'
  ).run(listId, itemType, itemId, now)
  db.prepare('UPDATE lists SET updated_at = ? WHERE id = ?').run(now, listId)
  return { success: true }
}

export function removeItemFromList(db: Database.Database, listId: number, itemType: 'movie' | 'external', itemId: number) {
  db.prepare('DELETE FROM list_items WHERE list_id = ? AND item_type = ? AND item_id = ?')
    .run(listId, itemType, itemId)

  // Externen Film löschen, wenn er in keiner Liste mehr ist.
  if (itemType === 'external') {
    const remaining = (db.prepare(
      "SELECT COUNT(*) AS count FROM list_items WHERE item_type = 'external' AND item_id = ?"
    ).get(itemId) as { count: number }).count
    if (remaining === 0) {
      db.prepare('DELETE FROM external_movies WHERE id = ?').run(itemId)
    }
  }
  return { success: true }
}

export function getListsForItem(db: Database.Database, itemType: 'movie' | 'external', itemId: number) {
  const rows = db.prepare(
    'SELECT list_id FROM list_items WHERE item_type = ? AND item_id = ?'
  ).all(itemType, itemId) as { list_id: number }[]
  return rows.map(r => r.list_id)
}

export function registerListHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('db:lists:list', () => getLists(db()))
  ipcMain.handle('db:lists:get', (_event, id: number) => getList(db(), id))
  ipcMain.handle('db:lists:create', (_event, name: string) => createList(db(), name))
  ipcMain.handle('db:lists:update', (_event, id: number, name: string) => updateList(db(), id, name))
  ipcMain.handle('db:lists:delete', (_event, id: number) => deleteList(db(), id))
  ipcMain.handle('db:lists:sync-state', () => getListSyncState(db()))
  ipcMain.handle('db:lists:set-remote-id', (_event, id: number, remoteId: number) => setListRemoteId(db(), id, remoteId))
  ipcMain.handle('db:lists:mark-synced', (_event, id: number) => markListSynced(db(), id))
  ipcMain.handle('db:lists:delete-by-remote-id', (_event, remoteId: number) => deleteListByRemoteId(db(), remoteId))
  ipcMain.handle('db:lists:add-item', (_event, listId: number, itemType: 'movie' | 'external', itemId: number) => addItemToList(db(), listId, itemType, itemId))
  ipcMain.handle('db:lists:remove-item', (_event, listId: number, itemType: 'movie' | 'external', itemId: number) => removeItemFromList(db(), listId, itemType, itemId))
  ipcMain.handle('db:lists:for-item', (_event, itemType: 'movie' | 'external', itemId: number) => getListsForItem(db(), itemType, itemId))
}
