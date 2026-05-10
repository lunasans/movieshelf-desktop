import { ipcMain } from 'electron'
import { getDb } from '../database'

export function registerActorHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('db:movies:actors', (_event, movieId: number) => {
    return db().prepare(`
      SELECT a.*, fa.role, fa.is_main_role FROM actors a
      JOIN film_actor fa ON a.id = fa.actor_id
      WHERE fa.film_id = ?
      ORDER BY fa.is_main_role DESC, a.name ASC
    `).all(movieId)
  })

  ipcMain.handle('db:actors:upsert', (_event, data: any) => {
    const now = new Date().toISOString()
    const result = db().prepare(`
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
      const actor = db().prepare('SELECT id FROM actors WHERE remote_id = ?').get(data.remote_id) as { id: number }
      return actor?.id
    }
    return result.lastInsertRowid ? Number(result.lastInsertRowid) : undefined
  })

  ipcMain.handle('db:actors:link', (_event, { film_id, actor_id, role, is_main_role }: any) => {
    return db().prepare(
      'INSERT OR REPLACE INTO film_actor (film_id, actor_id, role, is_main_role) VALUES (?, ?, ?, ?)'
    ).run(film_id, actor_id, role, is_main_role ? 1 : 0)
  })

  ipcMain.handle('db:actors:get', (_event, id: number) => {
    return db().prepare('SELECT * FROM actors WHERE id = ?').get(id)
  })

  ipcMain.handle('db:actors:movies', (_event, actorId: number) => {
    return db().prepare(`
      SELECT m.* FROM movies m
      JOIN film_actor fa ON m.id = fa.film_id
      WHERE fa.actor_id = ? AND m.is_deleted = 0 AND m.in_collection = 1
      ORDER BY m.year DESC
    `).all(actorId)
  })
}
