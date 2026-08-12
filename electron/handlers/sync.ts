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

/**
 * Filme, deren Gesehen-Markierung noch nicht bei der Shelf ist.
 *
 * Eigener Schritt neben [getDirtyMovies], weil "gesehen" am Benutzer hängt und
 * nicht am Film: es hat einen eigenen Endpunkt und steht in keinem der Felder,
 * die der Push überträgt. Ohne diese Abfrage blieb die Markierung für immer
 * auf diesem Rechner.
 *
 * `IS NOT` statt `!=`, damit auch der Wechsel von "unbekannt" auf gesetzt
 * erkannt wird — in SQL fällt jeder Vergleich mit NULL sonst durch.
 */
export function getPendingWatched(db: Database.Database): { id: number; remote_id: number; title: string; is_watched: number }[] {
  return db.prepare(`
    SELECT id, remote_id, title, is_watched FROM movies
    WHERE is_deleted = 0 AND remote_id IS NOT NULL
      AND COALESCE(is_watched, 0) IS NOT COALESCE(synced_watched, 0)
  `).all() as { id: number; remote_id: number; title: string; is_watched: number }[]
}

/** Den von der Shelf bestätigten Stand festhalten — ohne updated_at zu rühren. */
export function markWatchedSynced(db: Database.Database, id: number, isWatched: boolean): void {
  db.prepare('UPDATE movies SET synced_watched = ? WHERE id = ?').run(isWatched ? 1 : 0, id)
}

/**
 * Serverstand übernehmen: beides gleichsetzen, damit nichts mehr aussteht.
 * Wird beim Pull für Zeilen benutzt, die der Server bestimmt.
 */
export function applyWatchedFromServer(db: Database.Database, id: number, isWatched: boolean): void {
  db.prepare('UPDATE movies SET is_watched = ?, synced_watched = ? WHERE id = ?')
    .run(isWatched ? 1 : 0, isWatched ? 1 : 0, id)
}

// ── IPC registration ──────────────────────────────────────────────────────────

export function registerSyncHandlers(): void {
  const db = () => getDb()
  ipcMain.handle('db:sync:dirty',              ()      => getDirtyMovies(db()))
  ipcMain.handle('db:sync:mark-synced',        (_e, p) => markSynced(db(), p))
  ipcMain.handle('db:sync:hard-delete',        (_e, id) => hardDelete(db(), id))
  ipcMain.handle('db:sync:pending-watched',    ()      => getPendingWatched(db()))
  ipcMain.handle('db:sync:mark-watched-synced', (_e, p) => markWatchedSynced(db(), p.id, p.isWatched))
}
