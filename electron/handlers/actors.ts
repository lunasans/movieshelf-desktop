import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { getDb } from '../database'

// ── Pure functions ────────────────────────────────────────────────────────────

export function getActorsForMovie(db: Database.Database, movieId: number): unknown[] {
  return db.prepare(`
    SELECT a.*, fa.role, fa.is_main_role FROM actors a
    JOIN film_actor fa ON a.id = fa.actor_id
    WHERE fa.film_id = ?
    ORDER BY fa.is_main_role DESC, a.name ASC
  `).all(movieId)
}

export function upsertActor(db: Database.Database, data: Record<string, unknown>): number | undefined {
  const now = new Date().toISOString()
  const result = db.prepare(`
    INSERT INTO actors (remote_id, name, bio, birthday, place_of_birth, image_path, tmdb_id, created_at, updated_at)
    VALUES (@remote_id, @name, @bio, @birthday, @place_of_birth, @image_path, @tmdb_id, @created_at, @updated_at)
    ON CONFLICT(remote_id) DO UPDATE SET
      name = EXCLUDED.name,
      bio = EXCLUDED.bio,
      birthday = EXCLUDED.birthday,
      place_of_birth = EXCLUDED.place_of_birth,
      image_path = EXCLUDED.image_path,
      tmdb_id = EXCLUDED.tmdb_id,
      updated_at = EXCLUDED.updated_at
  `).run({
    bio: null, birthday: null, place_of_birth: null, image_path: null, tmdb_id: null,
    ...data, created_at: now, updated_at: now,
  })

  if (data.remote_id != null) {
    const actor = db.prepare('SELECT id FROM actors WHERE remote_id = ?').get(data.remote_id) as { id: number }
    return actor?.id
  }
  return result.lastInsertRowid ? Number(result.lastInsertRowid) : undefined
}

export function linkActor(db: Database.Database, params: {
  film_id: number; actor_id: number; role?: string; is_main_role?: boolean
}): unknown {
  return db.prepare(
    'INSERT OR REPLACE INTO film_actor (film_id, actor_id, role, is_main_role) VALUES (?, ?, ?, ?)'
  ).run(params.film_id, params.actor_id, params.role ?? null, params.is_main_role ? 1 : 0)
}

export function getActor(db: Database.Database, id: number): unknown {
  return db.prepare('SELECT * FROM actors WHERE id = ?').get(id)
}

export function getMoviesForActor(db: Database.Database, actorId: number): unknown[] {
  return db.prepare(`
    SELECT m.* FROM movies m
    JOIN film_actor fa ON m.id = fa.film_id
    WHERE fa.actor_id = ? AND m.is_deleted = 0 AND m.in_collection = 1
    ORDER BY m.year DESC
  `).all(actorId)
}

// ── IPC registration ──────────────────────────────────────────────────────────

export function registerActorHandlers(): void {
  const db = () => getDb()
  ipcMain.handle('db:movies:actors', (_e, movieId) => getActorsForMovie(db(), movieId))
  ipcMain.handle('db:actors:upsert', (_e, data)    => upsertActor(db(), data))
  ipcMain.handle('db:actors:link',   (_e, params)  => linkActor(db(), params))
  ipcMain.handle('db:actors:get',    (_e, id)      => getActor(db(), id))
  ipcMain.handle('db:actors:movies', (_e, actorId) => getMoviesForActor(db(), actorId))
}
