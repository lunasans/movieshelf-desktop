import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { getDb } from '../database'

const ALLOWED_MOVIE_COLUMNS = new Set([
  'title', 'year', 'genre', 'director', 'runtime', 'rating', 'rating_age',
  'overview', 'cover_path', 'backdrop_path', 'actors_names', 'trailer_url',
  'collection_type', 'tag', 'tmdb_id', 'remote_id', 'synced_at',
  'created_at',
])

// ── Pure functions ────────────────────────────────────────────────────────────

export function listMovies(db: Database.Database, params: {
  page?: number; perPage?: number; q?: string; collectionType?: string; excludeType?: string
} = {}) {
  const { page = 1, perPage = 30, q, collectionType, excludeType } = params
  const offset = (page - 1) * perPage

  // List query: top-level items only, no boxset parents or children
  let listWhere  = 'is_deleted = 0 AND in_collection = 1 AND boxset_parent_id IS NULL AND (is_boxset IS NULL OR is_boxset = 0)'
  // Count query: all real films incl. boxset children, but not the parent containers
  let countWhere = 'is_deleted = 0 AND in_collection = 1 AND (is_boxset IS NULL OR is_boxset = 0)'
  const typeArgs: unknown[] = []

  if (collectionType) {
    const filter = ' AND collection_type = ?'
    listWhere  += filter
    countWhere += filter
    typeArgs.push(collectionType)
  } else if (excludeType) {
    const filter = ' AND (collection_type IS NULL OR collection_type != ?)'
    listWhere  += filter
    countWhere += filter
    typeArgs.push(excludeType)
  }

  if (q) {
    const like         = `%${q}%`
    const searchFilter = ' AND (title LIKE ? OR director LIKE ? OR genre LIKE ?)'
    const searchArgs   = [like, like, like]
    const rows = db.prepare(
      `SELECT * FROM movies WHERE ${listWhere}${searchFilter} ORDER BY title ASC LIMIT ? OFFSET ?`
    ).all(...typeArgs, ...searchArgs, perPage, offset)
    const total = (db.prepare(
      `SELECT COUNT(*) as count FROM movies WHERE ${countWhere}${searchFilter}`
    ).get(...typeArgs, ...searchArgs) as { count: number }).count
    return { data: rows, total, page, perPage }
  }

  const rows = db.prepare(
    `SELECT * FROM movies WHERE ${listWhere} ORDER BY title ASC LIMIT ? OFFSET ?`
  ).all(...typeArgs, perPage, offset)
  const total = (db.prepare(
    `SELECT COUNT(*) as count FROM movies WHERE ${countWhere}`
  ).get(...typeArgs) as { count: number }).count
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
  // of inserting a duplicate.
  if (data.remote_id != null && data.tmdb_id != null) {
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

  const result = db.prepare(`
    INSERT INTO movies (title, year, genre, director, runtime, rating, rating_age, overview,
      cover_path, backdrop_path, actors_names, trailer_url, collection_type, tag, tmdb_id, remote_id,
      is_boxset, boxset_parent_id, view_count, is_watched, in_collection, created_at, updated_at)
    VALUES (@title, @year, @genre, @director, @runtime, @rating, @rating_age, @overview,
      @cover_path, @backdrop_path, @actors_names, @trailer_url, @collection_type, @tag, @tmdb_id, @remote_id,
      @is_boxset, @boxset_parent_id, @view_count, @is_watched, @in_collection, @created_at, @updated_at)
    ON CONFLICT(remote_id) DO UPDATE SET
      title = EXCLUDED.title, year = EXCLUDED.year, genre = EXCLUDED.genre,
      director = EXCLUDED.director, runtime = EXCLUDED.runtime, rating = EXCLUDED.rating,
      rating_age = EXCLUDED.rating_age, overview = EXCLUDED.overview,
      cover_path = EXCLUDED.cover_path, backdrop_path = EXCLUDED.backdrop_path,
      actors_names = EXCLUDED.actors_names, trailer_url = EXCLUDED.trailer_url,
      collection_type = EXCLUDED.collection_type, tag = EXCLUDED.tag, tmdb_id = EXCLUDED.tmdb_id,
      is_boxset = EXCLUDED.is_boxset, boxset_parent_id = EXCLUDED.boxset_parent_id,
      view_count = EXCLUDED.view_count, is_watched = EXCLUDED.is_watched,
      in_collection = EXCLUDED.in_collection, updated_at = EXCLUDED.updated_at
    WHERE EXCLUDED.updated_at >= movies.updated_at
  `).run({
    title: null, year: null,
    genre: null, director: null, runtime: null, rating: null, rating_age: null,
    overview: null, cover_path: null, backdrop_path: null, actors_names: null,
    trailer_url: null, collection_type: 'Film', tag: null, tmdb_id: null, remote_id: null,
    is_boxset: 0, boxset_parent_id: null, view_count: 0, is_watched: 0, in_collection: 1,
    ...data,
    created_at: data.created_at || now, updated_at: data.updated_at || now,
  })

  if (data.remote_id != null) {
    db.prepare(
      'UPDATE movies SET is_boxset = ?, boxset_parent_id = ?, view_count = ?, is_watched = ?, created_at = COALESCE(?, created_at) WHERE remote_id = ?'
    ).run(data.is_boxset ?? 0, data.boxset_parent_id ?? null, data.view_count ?? 0, data.is_watched ?? 0, data.created_at ?? null, data.remote_id)
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
  ipcMain.handle('db:movies:clear',            (_e, c)    => clearMovies(db(), c))
}
