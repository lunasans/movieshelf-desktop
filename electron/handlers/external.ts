import { ipcMain } from 'electron'
import { getDb } from '../database'
import type Database from 'better-sqlite3'

type ExternalData = Record<string, unknown>

export function getExternalByRemoteId(db: Database.Database, remoteId: number) {
  return db.prepare('SELECT * FROM external_movies WHERE remote_id = ?').get(remoteId) ?? null
}

export function getExternal(db: Database.Database, id: number) {
  return db.prepare('SELECT * FROM external_movies WHERE id = ?').get(id) ?? null
}

export function getExternalByTmdbId(db: Database.Database, tmdbId: number) {
  return db.prepare('SELECT * FROM external_movies WHERE tmdb_id = ?').get(tmdbId) ?? null
}

export function createExternal(db: Database.Database, data: ExternalData) {
  const now = new Date().toISOString()
  const result = db.prepare(`
    INSERT INTO external_movies
      (remote_id, title, year, genre, director, runtime, rating, rating_age, overview,
       collection_type, cover_path, backdrop_path, trailer_url, tmdb_id, synced_at, created_at, updated_at)
    VALUES
      (@remote_id, @title, @year, @genre, @director, @runtime, @rating, @rating_age, @overview,
       @collection_type, @cover_path, @backdrop_path, @trailer_url, @tmdb_id, @synced_at, @created_at, @updated_at)
  `).run({
    remote_id: (data.remote_id as number) ?? null,
    title: (data.title as string) ?? '',
    year: (data.year as number) ?? null,
    genre: (data.genre as string) ?? null,
    director: (data.director as string) ?? null,
    runtime: (data.runtime as number) ?? null,
    rating: (data.rating as number) ?? null,
    rating_age: (data.rating_age as number) ?? null,
    overview: (data.overview as string) ?? null,
    collection_type: (data.collection_type as string) ?? null,
    cover_path: (data.cover_path as string) ?? null,
    backdrop_path: (data.backdrop_path as string) ?? null,
    trailer_url: (data.trailer_url as string) ?? null,
    tmdb_id: (data.tmdb_id as number) ?? null,
    synced_at: (data.synced_at as string) ?? null,
    created_at: (data.created_at as string) || now,
    updated_at: (data.updated_at as string) || now,
  })
  return db.prepare('SELECT * FROM external_movies WHERE id = ?').get(result.lastInsertRowid)
}

export function markExternalSynced(
  db: Database.Database,
  params: { id: number; remote_id: number; synced_at: string }
) {
  db.prepare('UPDATE external_movies SET remote_id = ?, synced_at = ? WHERE id = ?')
    .run(params.remote_id, params.synced_at, params.id)
  return { success: true }
}

export function updateExternal(db: Database.Database, id: number, data: ExternalData) {
  const allowed = ['title', 'year', 'genre', 'director', 'runtime', 'rating', 'rating_age',
    'overview', 'collection_type', 'cover_path', 'backdrop_path', 'trailer_url', 'tmdb_id']
  const sets: string[] = []
  const values: unknown[] = []
  for (const key of allowed) {
    if (key in data) { sets.push(`${key} = ?`); values.push((data as Record<string, unknown>)[key]) }
  }
  if (sets.length === 0) return { success: false }
  sets.push("updated_at = ?"); values.push(new Date().toISOString())
  values.push(id)
  db.prepare(`UPDATE external_movies SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  return { success: true }
}

export function deleteExternal(db: Database.Database, id: number) {
  db.prepare("DELETE FROM list_items WHERE item_type = 'external' AND item_id = ?").run(id)
  db.prepare('DELETE FROM external_movies WHERE id = ?').run(id)
  return { success: true }
}

export function registerExternalHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('db:external:get-by-remote-id', (_e, remoteId: number) => getExternalByRemoteId(db(), remoteId))
  ipcMain.handle('db:external:get-by-tmdb-id', (_e, tmdbId: number) => getExternalByTmdbId(db(), tmdbId))
  ipcMain.handle('db:external:get', (_e, id: number) => getExternal(db(), id))
  ipcMain.handle('db:external:create', (_e, data: ExternalData) => createExternal(db(), data))
  ipcMain.handle('db:external:update', (_e, id: number, data: ExternalData) => updateExternal(db(), id, data))
  ipcMain.handle('db:external:mark-synced', (_e, params: { id: number; remote_id: number; synced_at: string }) => markExternalSynced(db(), params))
  ipcMain.handle('db:external:delete', (_e, id: number) => deleteExternal(db(), id))
}
