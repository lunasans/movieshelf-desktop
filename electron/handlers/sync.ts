import { ipcMain } from 'electron'
import { getDb } from '../database'

export function registerSyncHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('db:sync:dirty', () => {
    return db().prepare(`
      SELECT * FROM movies
      WHERE remote_id IS NULL
         OR updated_at > synced_at
         OR is_deleted = 1
    `).all()
  })

  ipcMain.handle('db:sync:mark-synced', (_event, { id, remote_id, synced_at }) => {
    return db().prepare(
      'UPDATE movies SET remote_id = ?, synced_at = ?, updated_at = ?, is_deleted = 0 WHERE id = ?'
    ).run(remote_id, synced_at, synced_at, id)
  })

  ipcMain.handle('db:sync:hard-delete', (_event, id: number) => {
    return db().prepare('DELETE FROM movies WHERE id = ?').run(id)
  })
}
