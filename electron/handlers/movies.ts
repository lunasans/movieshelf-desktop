import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { getDb } from '../database'

const ALLOWED_MOVIE_COLUMNS = new Set([
  'title', 'year', 'genre', 'director', 'runtime', 'rating', 'rating_age',
  'overview', 'cover_path', 'backdrop_path', 'actors_names', 'trailer_url',
  'collection_type', 'tag', 'tmdb_id', 'remote_id', 'synced_at',
  'edition', 'region_code', 'disc_location', 'purchase_date', 'purchase_price', 'condition',
  'created_at',
])

// ── Pure functions ────────────────────────────────────────────────────────────

const ALLOWED_SORT = new Set(['title', 'year', 'runtime', 'rating', 'created_at'])

export function listMovies(db: Database.Database, params: {
  page?: number; perPage?: number; q?: string; collectionType?: string; excludeType?: string
  sortBy?: 'title' | 'year' | 'runtime' | 'rating' | 'created_at'
  sortDir?: 'ASC' | 'DESC'
  genres?: string[]
} = {}) {
  const { page = 1, perPage = 30, q, collectionType, excludeType, sortBy, sortDir, genres } = params
  const offset = (page - 1) * perPage

  const col = ALLOWED_SORT.has(sortBy as string) ? sortBy : 'title'
  const dir = sortDir === 'DESC' ? 'DESC' : 'ASC'

  // Without search: top-level only (standalone films + boxset parents, children hidden).
  // With search: include boxset children so individual parts appear in results.
  const topLevelOnly = q ? '' : ' AND boxset_parent_id IS NULL'
  let listWhere  = `is_deleted = 0 AND in_collection = 1${topLevelOnly}`
  let countWhere = `is_deleted = 0 AND in_collection = 1${topLevelOnly}`
  const listArgs: unknown[] = []
  const countArgs: unknown[] = []

  if (collectionType) {
    const filter = ' AND collection_type = ?'
    listWhere  += filter
    countWhere += filter
    listArgs.push(collectionType)
    countArgs.push(collectionType)
  } else if (excludeType) {
    const filter = ' AND (collection_type IS NULL OR collection_type != ?)'
    listWhere  += filter
    countWhere += filter
    listArgs.push(excludeType)
    countArgs.push(excludeType)
  }

  if (genres && genres.length > 0) {
    for (const g of genres) {
      const filter = ' AND genre LIKE ?'
      listWhere  += filter
      countWhere += filter
      listArgs.push(`%${g}%`)
      countArgs.push(`%${g}%`)
    }
  }

  if (q) {
    const like         = `%${q}%`
    const searchFilter = ' AND (title LIKE ? OR director LIKE ? OR genre LIKE ?)'
    listWhere  += searchFilter
    countWhere += searchFilter
    listArgs.push(like, like, like)
    countArgs.push(like, like, like)
  }

  const rows = db.prepare(
    `SELECT * FROM movies WHERE ${listWhere} ORDER BY ${col} ${dir} LIMIT ? OFFSET ?`
  ).all(...listArgs, perPage, offset)
  const total = (db.prepare(
    `SELECT COUNT(*) as count FROM movies WHERE ${countWhere}`
  ).get(...countArgs) as { count: number }).count
  return { data: rows, total, page, perPage }
}

export function countMovies(db: Database.Database): number {
  return (db.prepare(
    'SELECT COUNT(*) as count FROM movies WHERE is_deleted = 0 AND is_boxset = 0 AND in_collection = 1'
  ).get() as { count: number }).count
}

export function recentMovies(db: Database.Database, limit = 10): unknown[] {
  return db.prepare(
    'SELECT * FROM movies WHERE is_deleted = 0 AND is_boxset = 0 AND in_collection = 1 ORDER BY created_at DESC LIMIT ?'
  ).all(limit)
}

export function getMovieChildren(db: Database.Database, movieId: number): unknown[] {
  const movie = db.prepare('SELECT remote_id FROM movies WHERE id = ?').get(movieId) as { remote_id: number | null } | undefined
  const candidates: number[] = [movieId]
  if (movie?.remote_id != null) candidates.push(movie.remote_id)
  const placeholders = candidates.map(() => '?').join(', ')
  return db.prepare(
    `SELECT * FROM movies WHERE boxset_parent_id IN (${placeholders}) AND is_deleted = 0 AND in_collection = 1 ORDER BY title ASC`
  ).all(...candidates)
}

export function getMovie(db: Database.Database, id: number): unknown {
  return db.prepare('SELECT * FROM movies WHERE id = ? AND is_deleted = 0').get(id)
      ?? db.prepare('SELECT * FROM movies WHERE remote_id = ? AND is_deleted = 0').get(id)
}

export function getMovieByRemoteId(db: Database.Database, remoteId: number): Record<string, unknown> | null {
  return (db.prepare('SELECT * FROM movies WHERE remote_id = ? AND is_deleted = 0').get(remoteId) as Record<string, unknown>) ?? null
}

export function createMovie(db: Database.Database, data: Record<string, unknown>): unknown {
  const now = new Date().toISOString()

  // If the incoming record has both remote_id and tmdb_id, check whether a local-only
  // film with the same tmdb_id exists (remote_id IS NULL). If so, merge into it instead
  // of inserting a duplicate. Skip this if a row with the remote_id already exists —
  // the INSERT ... ON CONFLICT below handles that case.
  if (data.remote_id != null && data.tmdb_id != null) {
    const alreadySynced = db.prepare('SELECT id FROM movies WHERE remote_id = ?').get(data.remote_id)

    if (!alreadySynced) {
      const orphans = db.prepare(
        'SELECT id FROM movies WHERE tmdb_id = ? AND remote_id IS NULL AND is_deleted = 0 ORDER BY id ASC'
      ).all(data.tmdb_id) as { id: number }[]

      if (orphans.length > 0) {
        const orphan = orphans[0]
        db.prepare(`
          UPDATE movies SET
            remote_id = @remote_id, title = @title, year = @year, genre = @genre,
            director = @director, runtime = @runtime, rating = @rating, rating_age = @rating_age,
            overview = @overview, cover_path = @cover_path, backdrop_path = @backdrop_path,
            actors_names = @actors_names, trailer_url = @trailer_url,
            collection_type = @collection_type, tag = @tag,
            is_boxset = @is_boxset, boxset_parent_id = @boxset_parent_id, updated_at = @updated_at
          WHERE id = @id
        `).run({
          title: null, year: null, genre: null, director: null, runtime: null,
          rating: null, rating_age: null, overview: null, cover_path: null, backdrop_path: null,
          actors_names: null, trailer_url: null, collection_type: 'Film', tag: null,
          is_boxset: 0, boxset_parent_id: null,
          ...data, updated_at: data.updated_at || now, id: orphan.id,
        })
        for (let i = 1; i < orphans.length; i++) {
          db.prepare('DELETE FROM film_actor WHERE film_id = ?').run(orphans[i].id)
          db.prepare('DELETE FROM movies WHERE id = ?').run(orphans[i].id)
        }
        return db.prepare('SELECT * FROM movies WHERE id = ?').get(orphan.id)
      }
    }
  }

  // Lückenlose Sammlungsnummer: Server-Wert bevorzugen, sonst lokal fortschreiben.
  const nextCollectionNo = (db.prepare(
    'SELECT COALESCE(MAX(collection_no), 0) + 1 AS n FROM movies'
  ).get() as { n: number }).n

  const result = db.prepare(`
    INSERT INTO movies (title, year, genre, director, runtime, rating, rating_age, overview,
      cover_path, backdrop_path, actors_names, trailer_url, collection_type, tag, tmdb_id, remote_id,
      edition, region_code, disc_location, purchase_date, purchase_price, condition,
      is_boxset, boxset_parent_id, view_count, is_watched, in_collection, collection_no, created_at, updated_at)
    VALUES (@title, @year, @genre, @director, @runtime, @rating, @rating_age, @overview,
      @cover_path, @backdrop_path, @actors_names, @trailer_url, @collection_type, @tag, @tmdb_id, @remote_id,
      @edition, @region_code, @disc_location, @purchase_date, @purchase_price, @condition,
      @is_boxset, @boxset_parent_id, @view_count, @is_watched, @in_collection, @collection_no, @created_at, @updated_at)
    ON CONFLICT(remote_id) DO UPDATE SET
      title = EXCLUDED.title, year = EXCLUDED.year, genre = EXCLUDED.genre,
      director = EXCLUDED.director, runtime = EXCLUDED.runtime, rating = EXCLUDED.rating,
      rating_age = EXCLUDED.rating_age, overview = EXCLUDED.overview,
      cover_path = EXCLUDED.cover_path, backdrop_path = EXCLUDED.backdrop_path,
      actors_names = EXCLUDED.actors_names, trailer_url = EXCLUDED.trailer_url,
      collection_type = EXCLUDED.collection_type, tag = EXCLUDED.tag, tmdb_id = EXCLUDED.tmdb_id,
      edition = EXCLUDED.edition, region_code = EXCLUDED.region_code,
      disc_location = EXCLUDED.disc_location, purchase_date = EXCLUDED.purchase_date,
      purchase_price = EXCLUDED.purchase_price, condition = EXCLUDED.condition,
      is_boxset = EXCLUDED.is_boxset, boxset_parent_id = EXCLUDED.boxset_parent_id,
      view_count = EXCLUDED.view_count, is_watched = EXCLUDED.is_watched,
      in_collection = EXCLUDED.in_collection,
      collection_no = COALESCE(EXCLUDED.collection_no, movies.collection_no),
      updated_at = EXCLUDED.updated_at
    WHERE EXCLUDED.updated_at >= movies.updated_at
  `).run({
    title: null, year: null,
    genre: null, director: null, runtime: null, rating: null, rating_age: null,
    overview: null, cover_path: null, backdrop_path: null, actors_names: null,
    trailer_url: null, collection_type: 'Film', tag: null, tmdb_id: null, remote_id: null,
    edition: null, region_code: null, disc_location: null, purchase_date: null, purchase_price: null, condition: null,
    is_boxset: 0, boxset_parent_id: null, view_count: 0, is_watched: 0, in_collection: 1,
    collection_no: nextCollectionNo,
    ...data,
    created_at: data.created_at || now, updated_at: data.updated_at || now,
  })

  if (data.remote_id != null) {
    // Gleicher „lokal neuer gewinnt"-Guard wie im Upsert: sonst überschreibt der
    // Pull hier is_watched/view_count am Konflikt-Guard vorbei mit Server-Werten.
    db.prepare(
      'UPDATE movies SET is_boxset = ?, boxset_parent_id = ?, view_count = ?, is_watched = ?, created_at = COALESCE(?, created_at) WHERE remote_id = ? AND updated_at <= ?'
    ).run(data.is_boxset ?? 0, data.boxset_parent_id ?? null, data.view_count ?? 0, data.is_watched ?? 0, data.created_at ?? null, data.remote_id, data.updated_at || now)
    return db.prepare('SELECT * FROM movies WHERE remote_id = ?').get(data.remote_id)
  }
  return db.prepare('SELECT * FROM movies WHERE id = ?').get(result.lastInsertRowid)
}

export function updateMovie(db: Database.Database, id: number, data: Record<string, unknown>): unknown {
  const now = new Date().toISOString()
  const safeKeys = Object.keys(data).filter(k => ALLOWED_MOVIE_COLUMNS.has(k))
  if (safeKeys.length === 0) return db.prepare('SELECT * FROM movies WHERE id = ?').get(id)
  const fields   = safeKeys.map(k => `${k} = @${k}`).join(', ')
  const safeData = Object.fromEntries(safeKeys.map(k => [k, data[k]]))
  db.prepare(`UPDATE movies SET ${fields}, updated_at = @updated_at WHERE id = @id`)
    .run({ ...safeData, updated_at: now, id })
  return db.prepare('SELECT * FROM movies WHERE id = ?').get(id)
}

export function deleteMovie(db: Database.Database, id: number): { success: boolean } {
  db.prepare('UPDATE movies SET is_deleted = 1, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id)
  return { success: true }
}

export function searchMovies(db: Database.Database, query: string): unknown[] {
  const like = `%${query}%`
  return db.prepare(`
    SELECT * FROM movies
    WHERE is_deleted = 0 AND in_collection = 1 AND (title LIKE ? OR director LIKE ? OR genre LIKE ?)
    ORDER BY title ASC LIMIT 50
  `).all(like, like, like)
}

export function checkTmdbIds(db: Database.Database, tmdbIds: number[]): number[] {
  if (!Array.isArray(tmdbIds) || tmdbIds.length === 0) return []
  const placeholders = tmdbIds.map(() => '?').join(', ')
  const rows = db.prepare(
    `SELECT tmdb_id FROM movies WHERE is_deleted = 0 AND in_collection = 1 AND tmdb_id IN (${placeholders})`
  ).all(...tmdbIds) as { tmdb_id: number }[]
  return rows.map(r => r.tmdb_id)
}

export function deleteMovieByRemoteId(db: Database.Database, remoteId: number): { success: boolean; localId?: number } {
  const row = db.prepare('SELECT id FROM movies WHERE remote_id = ? AND is_deleted = 0').get(remoteId) as { id: number } | undefined
  if (!row) return { success: false }
  db.prepare('UPDATE movies SET is_deleted = 1, updated_at = ? WHERE id = ?').run(new Date().toISOString(), row.id)
  return { success: true, localId: row.id }
}

export function allRemoteIds(db: Database.Database): { id: number; remote_id: number }[] {
  return db.prepare(
    'SELECT id, remote_id FROM movies WHERE is_deleted = 0 AND remote_id IS NOT NULL AND in_collection = 1'
  ).all() as { id: number; remote_id: number }[]
}

export function clearMovies(db: Database.Database, confirmed?: boolean): { success: boolean; error?: string } {
  if (!confirmed) return { success: false, error: 'Bestätigung erforderlich.' }
  db.prepare('DELETE FROM film_actor').run()
  db.prepare('DELETE FROM movies').run()
  db.prepare('DELETE FROM actors').run()
  return { success: true }
}

export function randomMovie(db: Database.Database, filters?: { collectionType?: string; genre?: string }): unknown {
  let where = 'is_deleted = 0 AND in_collection = 1 AND (is_boxset IS NULL OR is_boxset = 0)'
  const args: unknown[] = []
  if (filters?.collectionType) {
    where += ' AND collection_type = ?'
    args.push(filters.collectionType)
  }
  if (filters?.genre) {
    where += ' AND genre LIKE ?'
    args.push(`%${filters.genre}%`)
  }
  return db.prepare(`SELECT * FROM movies WHERE ${where} ORDER BY RANDOM() LIMIT 1`).get(...args) ?? null
}

export function toggleWatched(db: Database.Database, id: number): { is_watched: boolean } {
  db.prepare('UPDATE movies SET is_watched = 1 - is_watched, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), id)
  const row = db.prepare('SELECT is_watched FROM movies WHERE id = ?').get(id) as { is_watched: number }
  return { is_watched: row.is_watched === 1 }
}

export function bulkDelete(db: Database.Database, ids: number[]): { deleted: number } {
  if (!Array.isArray(ids) || ids.length === 0) return { deleted: 0 }
  const placeholders = ids.map(() => '?').join(', ')
  const result = db.prepare(
    `UPDATE movies SET is_deleted = 1, updated_at = ? WHERE id IN (${placeholders})`
  ).run(new Date().toISOString(), ...ids)
  return { deleted: result.changes }
}

export function bulkUpdateTag(db: Database.Database, ids: number[], tag: string): { updated: number } {
  if (!Array.isArray(ids) || ids.length === 0) return { updated: 0 }
  const placeholders = ids.map(() => '?').join(', ')
  const result = db.prepare(
    `UPDATE movies SET tag = ?, updated_at = ? WHERE id IN (${placeholders})`
  ).run(tag, new Date().toISOString(), ...ids)
  return { updated: result.changes }
}

export interface ImportRow {
  title: string
  year?: number
  rating?: number
  tag?: string
  is_watched?: boolean
}

export function importMovies(db: Database.Database, rows: ImportRow[]): { imported: number; skipped: number } {
  let imported = 0, skipped = 0
  const now = new Date().toISOString()

  for (const row of rows) {
    if (!row.title) { skipped++; continue }

    const existing = db.prepare(
      'SELECT id FROM movies WHERE title = ? AND year IS ? AND is_deleted = 0'
    ).get(row.title, row.year ?? null) as { id: number } | undefined

    if (existing) { skipped++; continue }

    db.prepare(`
      INSERT INTO movies (title, year, rating, tag, is_watched, in_collection, is_deleted, is_boxset, created_at, updated_at)
      VALUES (@title, @year, @rating, @tag, @is_watched, 1, 0, 0, @created_at, @updated_at)
    `).run({
      title: row.title,
      year: row.year ?? null,
      rating: row.rating ?? null,
      tag: row.tag ?? null,
      is_watched: row.is_watched ? 1 : 0,
      created_at: now,
      updated_at: now,
    })
    imported++
  }

  return { imported, skipped }
}

// ── IPC registration ──────────────────────────────────────────────────────────

export function registerMovieHandlers(): void {
  const db = () => getDb()
  ipcMain.handle('db:movies:list',             (_e, p)    => listMovies(db(), p))
  ipcMain.handle('db:movies:count',            ()         => countMovies(db()))
  ipcMain.handle('db:movies:recent',           (_e, l)    => recentMovies(db(), l))
  ipcMain.handle('db:movies:children',         (_e, id)   => getMovieChildren(db(), id))
  ipcMain.handle('db:movies:get',              (_e, id)   => getMovie(db(), id))
  ipcMain.handle('db:movies:get-by-remote-id', (_e, id)   => getMovieByRemoteId(db(), id))
  ipcMain.handle('db:movies:create',           (_e, data) => createMovie(db(), data))
  ipcMain.handle('db:movies:update',           (_e, id, d)=> updateMovie(db(), id, d))
  ipcMain.handle('db:movies:delete',           (_e, id)   => deleteMovie(db(), id))
  ipcMain.handle('db:movies:search',           (_e, q)    => searchMovies(db(), q))
  ipcMain.handle('db:movies:check-tmdb-ids',   (_e, ids)  => checkTmdbIds(db(), ids))
  ipcMain.handle('db:movies:delete-by-remote-id', (_e, id) => deleteMovieByRemoteId(db(), id))
  ipcMain.handle('db:movies:all-remote-ids',   ()         => allRemoteIds(db()))
  ipcMain.handle('db:movies:clear',            (_e, c)        => clearMovies(db(), c))
  ipcMain.handle('db:movies:random',           (_e, f)        => randomMovie(db(), f))
  ipcMain.handle('db:movies:toggle-watched',   (_e, id)       => toggleWatched(db(), id))
  ipcMain.handle('db:movies:bulk-delete',      (_e, ids)      => bulkDelete(db(), ids))
  ipcMain.handle('db:movies:bulk-tag',         (_e, ids, tag) => bulkUpdateTag(db(), ids, tag))
  ipcMain.handle('db:movies:import',           (_e, rows)     => importMovies(db(), rows))
}
