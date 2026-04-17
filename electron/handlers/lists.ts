import { ipcMain } from 'electron'
import { getDb } from '../database'

export function registerListHandlers(): void {
  const db = () => getDb()

  // All lists with movie count
  ipcMain.handle('db:lists:list', () => {
    return db().prepare(`
      SELECT l.*, COUNT(lm.movie_id) as movie_count
      FROM lists l
      LEFT JOIN list_movies lm ON l.id = lm.list_id
      GROUP BY l.id
      ORDER BY l.name ASC
    `).all()
  })

  // Single list with its movies
  ipcMain.handle('db:lists:get', (_event, id: number) => {
    const list = db().prepare('SELECT * FROM lists WHERE id = ?').get(id)
    if (!list) return null
    const movies = db().prepare(`
      SELECT m.* FROM movies m
      JOIN list_movies lm ON m.id = lm.movie_id
      WHERE lm.list_id = ? AND m.is_deleted = 0
      ORDER BY m.title ASC
    `).all(id)
    return { ...(list as object), movies }
  })

  ipcMain.handle('db:lists:create', (_event, name: string) => {
    const now = new Date().toISOString()
    const result = db().prepare(
      'INSERT INTO lists (name, created_at, updated_at) VALUES (?, ?, ?)'
    ).run(name.trim(), now, now)
    return db().prepare('SELECT * FROM lists WHERE id = ?').get(result.lastInsertRowid)
  })

  ipcMain.handle('db:lists:update', (_event, id: number, name: string) => {
    const now = new Date().toISOString()
    db().prepare('UPDATE lists SET name = ?, updated_at = ? WHERE id = ?').run(name.trim(), now, id)
    return db().prepare('SELECT * FROM lists WHERE id = ?').get(id)
  })

  ipcMain.handle('db:lists:delete', (_event, id: number) => {
    db().prepare('DELETE FROM lists WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('db:lists:add-movie', (_event, listId: number, movieId: number) => {
    const now = new Date().toISOString()
    db().prepare(
      'INSERT OR IGNORE INTO list_movies (list_id, movie_id, added_at) VALUES (?, ?, ?)'
    ).run(listId, movieId, now)
    db().prepare('UPDATE lists SET updated_at = ? WHERE id = ?').run(now, listId)
    return { success: true }
  })

  ipcMain.handle('db:lists:remove-movie', (_event, listId: number, movieId: number) => {
    db().prepare('DELETE FROM list_movies WHERE list_id = ? AND movie_id = ?').run(listId, movieId)
    return { success: true }
  })

  // Returns list IDs that contain a given movie
  ipcMain.handle('db:lists:for-movie', (_event, movieId: number) => {
    const rows = db().prepare(
      'SELECT list_id FROM list_movies WHERE movie_id = ?'
    ).all(movieId) as { list_id: number }[]
    return rows.map(r => r.list_id)
  })
}
