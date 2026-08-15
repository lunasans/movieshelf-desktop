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
 * Offene Bewertungen — analog zum Gesehen-Stand.
 *
 * `IS NOT` statt `!=`, weil beide Seiten NULL sein können: eine gelöschte
 * Bewertung (user_rating = NULL) gegen einen übertragenen Wert muss als
 * Unterschied zählen, und `NULL != 3` wäre in SQL nicht wahr, sondern NULL.
 */
export function getPendingUserRatings(db: Database.Database): {
  id: number; remote_id: number; title: string; user_rating: number | null
}[] {
  return db.prepare(`
    SELECT id, remote_id, title, user_rating FROM movies
    WHERE is_deleted = 0 AND remote_id IS NOT NULL
      AND user_rating IS NOT synced_user_rating
  `).all() as { id: number; remote_id: number; title: string; user_rating: number | null }[]
}

export function markUserRatingSynced(db: Database.Database, id: number, rating: number | null): void {
  db.prepare('UPDATE movies SET synced_user_rating = ? WHERE id = ?').run(rating, id)
}

/**
 * Offene Folgen-Markierungen. Nur Folgen mit remote_id lassen sich übertragen —
 * rein lokal aus TMDb importierte kennt die Shelf nicht.
 */
export function getPendingEpisodesWatched(db: Database.Database): {
  id: number; remote_id: number; title: string | null; is_watched: number
}[] {
  return db.prepare(`
    SELECT e.id, e.remote_id, e.title, e.is_watched
    FROM episodes e
    WHERE e.remote_id IS NOT NULL
      AND COALESCE(e.is_watched, 0) IS NOT COALESCE(e.synced_watched, 0)
  `).all() as { id: number; remote_id: number; title: string | null; is_watched: number }[]
}

export function markEpisodeWatchedSynced(db: Database.Database, id: number, isWatched: boolean): void {
  db.prepare('UPDATE episodes SET synced_watched = ? WHERE id = ?').run(isWatched ? 1 : 0, id)
}

// Die Gegenrichtung - Serverstand übernehmen - braucht hier nichts: der Pull
// läuft vollständig über createMovie(), das "gesehen" mitschreibt.

// ── IPC registration ──────────────────────────────────────────────────────────

export function registerSyncHandlers(): void {
  const db = () => getDb()
  ipcMain.handle('db:sync:dirty',              ()      => getDirtyMovies(db()))
  ipcMain.handle('db:sync:mark-synced',        (_e, p) => markSynced(db(), p))
  ipcMain.handle('db:sync:hard-delete',        (_e, id) => hardDelete(db(), id))
  ipcMain.handle('db:sync:pending-watched',    ()      => getPendingWatched(db()))
  ipcMain.handle('db:sync:mark-watched-synced', (_e, p) => markWatchedSynced(db(), p.id, p.isWatched))
  ipcMain.handle('db:sync:pending-user-ratings', ()     => getPendingUserRatings(db()))
  ipcMain.handle('db:sync:mark-user-rating-synced', (_e, p) => markUserRatingSynced(db(), p.id, p.rating))
  ipcMain.handle('db:sync:pending-episodes-watched', () => getPendingEpisodesWatched(db()))
  ipcMain.handle('db:sync:mark-episode-watched-synced', (_e, p) => markEpisodeWatchedSynced(db(), p.id, p.isWatched))
}
