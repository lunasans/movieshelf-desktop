import { ipcMain } from 'electron'
import { getDb } from '../database'

export function registerMovieHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('db:movies:list', (_event, params: { page?: number; perPage?: number; q?: string } = {}) => {
    const { page = 1, perPage = 30, q } = params
    const offset = (page - 1) * perPage

    if (q) {
      const like = `%${q}%`
      const rows = db().prepare(`
        SELECT * FROM movies
        WHERE is_deleted = 0 AND (title LIKE ? OR director LIKE ? OR genre LIKE ?)
        ORDER BY title ASC LIMIT ? OFFSET ?
      `).all(like, like, like, perPage, offset)

      const total = (db().prepare(`
        SELECT COUNT(*) as count FROM movies
        WHERE is_deleted = 0 AND (title LIKE ? OR director LIKE ? OR genre LIKE ?)
      `).get(like, like, like) as { count: number }).count

      return { data: rows, total, page, perPage }
    }

    const rows = db().prepare('SELECT * FROM movies WHERE is_deleted = 0 ORDER BY title ASC LIMIT ? OFFSET ?').all(perPage, offset)
    const total = (db().prepare('SELECT COUNT(*) as count FROM movies WHERE is_deleted = 0').get() as { count: number }).count

    return { data: rows, total, page, perPage }
  })

  ipcMain.handle('db:movies:get', (_event, id: number) => {
    return db().prepare('SELECT * FROM movies WHERE id = ? AND is_deleted = 0').get(id)
  })

  ipcMain.handle('db:movies:create', (_event, data: Record<string, unknown>) => {
    const now = new Date().toISOString()
    const stmt = db().prepare(`
      INSERT INTO movies (title, year, genre, director, runtime, rating, rating_age, overview,
        cover_path, backdrop_path, actors_names, trailer_url, collection_type, tag, tmdb_id, remote_id, created_at, updated_at)
      VALUES (@title, @year, @genre, @director, @runtime, @rating, @rating_age, @overview,
        @cover_path, @backdrop_path, @actors_names, @trailer_url, @collection_type, @tag, @tmdb_id, @remote_id, @created_at, @updated_at)
      ON CONFLICT(remote_id) DO UPDATE SET
        title = EXCLUDED.title,
        year = EXCLUDED.year,
        genre = EXCLUDED.genre,
        director = EXCLUDED.director,
        runtime = EXCLUDED.runtime,
        rating = EXCLUDED.rating,
        rating_age = EXCLUDED.rating_age,
        overview = EXCLUDED.overview,
        cover_path = EXCLUDED.cover_path,
        backdrop_path = EXCLUDED.backdrop_path,
        actors_names = EXCLUDED.actors_names,
        trailer_url = EXCLUDED.trailer_url,
        collection_type = EXCLUDED.collection_type,
        tag = EXCLUDED.tag,
        tmdb_id = EXCLUDED.tmdb_id,
        updated_at = EXCLUDED.updated_at
      WHERE EXCLUDED.updated_at > movies.updated_at
    `)
    const result = stmt.run({ ...data, created_at: now, updated_at: data.updated_at || now })
    const id = result.lastInsertRowid
    return db().prepare('SELECT * FROM movies WHERE id = ?').get(id)
  })

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
    const stmt = db().prepare(`
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
    `)
    const defaults = {
      bio: null,
      birthday: null,
      place_of_birth: null,
      image_path: null,
      tmdb_id: null
    }

    stmt.run({ ...defaults, ...data, created_at: now, updated_at: now })
    
    const actor = db().prepare('SELECT id FROM actors WHERE remote_id = ?').get(data.remote_id) as { id: number }
    return actor?.id
  })

  ipcMain.handle('db:actors:link', (_event, { film_id, actor_id, role, is_main_role }: any) => {
    const stmt = db().prepare(`
      INSERT OR REPLACE INTO film_actor (film_id, actor_id, role, is_main_role)
      VALUES (?, ?, ?, ?)
    `)
    return stmt.run(film_id, actor_id, role, is_main_role ? 1 : 0)
  })

  ipcMain.handle('db:actors:get', (_event, id: number) => {
    return db().prepare('SELECT * FROM actors WHERE id = ?').get(id)
  })

  ipcMain.handle('db:actors:movies', (_event, actorId: number) => {
    return db().prepare(`
      SELECT m.* FROM movies m
      JOIN film_actor fa ON m.id = fa.film_id
      WHERE fa.actor_id = ?
      ORDER BY m.year DESC
    `).all(actorId)
  })

  ipcMain.handle('db:movies:update', (_event, id: number, data: Record<string, unknown>) => {
    const now = new Date().toISOString()
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    db().prepare(`UPDATE movies SET ${fields}, updated_at = @updated_at WHERE id = @id`)
      .run({ ...data, updated_at: now, id })
    return db().prepare('SELECT * FROM movies WHERE id = ?').get(id)
  })

  ipcMain.handle('db:movies:delete', (_event, id: number) => {
    const now = new Date().toISOString()
    db().prepare('UPDATE movies SET is_deleted = 1, updated_at = ? WHERE id = ?').run(now, id)
    return { success: true }
  })

  ipcMain.handle('db:movies:search', (_event, query: string) => {
    const like = `%${query}%`
    return db().prepare(`
      SELECT * FROM movies
      WHERE is_deleted = 0 AND (title LIKE ? OR director LIKE ? OR genre LIKE ?)
      ORDER BY title ASC LIMIT 50
    `).all(like, like, like)
  })

  // Sync Handlers
  ipcMain.handle('db:sync:dirty', () => {
    return db().prepare(`
      SELECT * FROM movies 
      WHERE remote_id IS NULL 
         OR updated_at > synced_at 
         OR is_deleted = 1
    `).all()
  })

  ipcMain.handle('db:sync:mark-synced', (_event, { id, remote_id, synced_at }) => {
    return db().prepare('UPDATE movies SET remote_id = ?, synced_at = ?, updated_at = ?, is_deleted = 0 WHERE id = ?')
      .run(remote_id, synced_at, synced_at, id)
  })

  ipcMain.handle('db:sync:hard-delete', (_event, id: number) => {
    return db().prepare('DELETE FROM movies WHERE id = ?').run(id)
  })

  ipcMain.handle('db:movies:clear', () => {
    db().prepare('DELETE FROM film_actor').run()
    db().prepare('DELETE FROM movies').run()
    db().prepare('DELETE FROM actors').run()
    return { success: true }
  })
}
