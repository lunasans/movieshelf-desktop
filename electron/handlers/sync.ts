import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { getDb } from '../database'

// ── Pure functions ────────────────────────────────────────────────────────────

export function getDirtyMovies(db: Database.Database): unknown[] {
  return db.prepare(`
    SELECT * FROM movies
    WHERE remote_id IS NULL
       OR updated_at > synced_at
       OR is_deleted = 1
  `).all()
}

export function markSynced(db: Database.Database, params: {
  id: number; remote_id: number; synced_at: string
}): unknown {
  return db.prepare(
    'UPDATE movies SET remote_id = ?, synced_at = ?, updated_at = ?, is_deleted = 0 WHERE id = ?'
  ).run(params.remote_id, params.synced_at, params.synced_at, params.id)
}

export function hardDelete(db: Database.Database, id: number): unknown {
  return db.prepare('DELETE FROM movies WHERE id = ?').run(id)
}

// ── IPC registration ──────────────────────────────────────────────────────────

export function registerSyncHandlers(): void {
  const db = () => getDb()
  ipcMain.handle('db:sync:dirty',       ()         => getDirtyMovies(db()))
  ipcMain.handle('db:sync:mark-synced', (_e, p)    => markSynced(db(), p))
  ipcMain.handle('db:sync:hard-delete', (_e, id)   => hardDelete(db(), id))
}
