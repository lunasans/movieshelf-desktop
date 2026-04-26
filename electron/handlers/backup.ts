import { ipcMain, app, dialog } from 'electron'
import { join } from 'path'
import { readdirSync, existsSync, mkdirSync, copyFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import AdmZip from 'adm-zip'
import { getDb } from '../database'

const COVERS_DIR = join(app.getPath('userData'), 'covers')

const TABLES = ['movies', 'actors', 'film_actor', 'lists', 'list_movies', 'settings'] as const

export function registerBackupHandlers(): void {

  // ── Create backup ─────────────────────────────────────────────────────────

  ipcMain.handle('backup:create', async () => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Backup speichern',
      defaultPath: `movieshelf_backup_${new Date().toISOString().slice(0, 10)}.ms`,
      filters: [{ name: 'MovieShelf Backup', extensions: ['ms'] }],
    })

    if (canceled || !filePath) return { success: false, canceled: true }

    try {
      const db   = getDb()
      const zip  = new AdmZip()

      // 1. Export database tables to JSON
      const database: Record<string, unknown[]> = {}
      for (const table of TABLES) {
        try {
          database[table] = db.prepare(`SELECT * FROM ${table}`).all()
        } catch {
          database[table] = []
        }
      }
      zip.addFile('database.json', Buffer.from(JSON.stringify(database, null, 2), 'utf-8'))

      // 2. Manifest
      const movieCount = (database['movies'] as unknown[]).length
      const manifest = {
        version:    '1.0',
        app:        'MovieShelf Desktop',
        created_at: new Date().toISOString(),
        counts:     { movies: movieCount, actors: (database['actors'] as unknown[]).length },
      }
      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'))

      // 3. Bundle media files from covers directory
      if (existsSync(COVERS_DIR)) {
        const files = readdirSync(COVERS_DIR)
        for (const file of files) {
          const fullPath = join(COVERS_DIR, file)
          zip.addLocalFile(fullPath, 'media')
        }
      }

      zip.writeZip(filePath)

      return { success: true, path: filePath, movies: movieCount }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Restore backup ────────────────────────────────────────────────────────

  ipcMain.handle('backup:restore', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Backup wiederherstellen',
      filters: [{ name: 'MovieShelf Backup', extensions: ['ms'] }],
      properties: ['openFile'],
    })

    if (canceled || !filePaths[0]) return { success: false, canceled: true }

    const msPath = filePaths[0]

    // Confirm destructive action
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Wiederherstellen', 'Abbrechen'],
      defaultId: 1,
      cancelId: 1,
      title: 'Backup wiederherstellen',
      message: 'Aktuelle Sammlung wird überschrieben',
      detail: 'Alle lokalen Filme, Schauspieler und Listen werden durch das Backup ersetzt. Fortfahren?',
    })

    if (response !== 0) return { success: false, canceled: true }

    const tempDir = join(tmpdir(), `ms_restore_${randomUUID()}`)

    try {
      mkdirSync(tempDir, { recursive: true })

      const zip = new AdmZip(msPath)

      // Zip-Slip protection
      for (const entry of zip.getEntries()) {
        const name = entry.entryName
        if (name.includes('..') || name.startsWith('/') || name.startsWith('\\')) {
          throw new Error('Sicherheitsrisiko: Ungültige Pfade im Archiv.')
        }
      }

      zip.extractAllTo(tempDir, true)

      // Validate manifest
      const manifestPath = join(tempDir, 'manifest.json')
      if (!existsSync(manifestPath)) throw new Error('Ungültiges Backup: manifest.json fehlt.')

      const manifest = JSON.parse(require('fs').readFileSync(manifestPath, 'utf-8'))
      if (manifest.app !== 'MovieShelf Desktop') {
        throw new Error('Inkompatibles Backup-Format (kein MovieShelf Desktop Backup).')
      }

      const dbPath = join(tempDir, 'database.json')
      if (!existsSync(dbPath)) throw new Error('Ungültiges Backup: database.json fehlt.')

      const database: Record<string, Record<string, unknown>[]> = JSON.parse(
        require('fs').readFileSync(dbPath, 'utf-8')
      )

      // Restore database in a transaction
      const db = getDb()
      db.pragma('foreign_keys = OFF')

      const restore = db.transaction(() => {
        db.exec('DELETE FROM film_actor')
        db.exec('DELETE FROM list_movies')
        db.exec('DELETE FROM movies')
        db.exec('DELETE FROM actors')
        db.exec('DELETE FROM lists')

        insertRows(db, 'actors',    database['actors']    ?? [], ['id','remote_id','name','bio','birthday','place_of_birth','image_path','tmdb_id','created_at','updated_at'])
        insertRows(db, 'movies',    database['movies']    ?? [], ['id','title','year','genre','director','runtime','rating','rating_age','overview','cover_path','backdrop_path','actors_names','trailer_url','collection_type','tag','tmdb_id','remote_id','synced_at','is_deleted','is_boxset','boxset_parent_id','view_count','is_watched','in_collection','created_at','updated_at'])
        insertRows(db, 'film_actor',database['film_actor']?? [], ['film_id','actor_id','role','is_main_role'])
        insertRows(db, 'lists',     database['lists']     ?? [], ['id','name','remote_id','created_at','updated_at','synced_at'])
        insertRows(db, 'list_movies',database['list_movies']??[],['list_id','movie_id','added_at'])

        // Merge settings — keep existing sensitive keys intact
        const SKIP_KEYS = new Set(['shelf_token', 'shelf_url'])
        for (const row of database['settings'] ?? []) {
          if (SKIP_KEYS.has(row['key'] as string)) continue
          db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
            .run(row['key'], row['value'])
        }
      })

      restore()
      db.pragma('foreign_keys = ON')

      // Restore media files
      const mediaDir = join(tempDir, 'media')
      if (existsSync(mediaDir)) {
        mkdirSync(COVERS_DIR, { recursive: true })
        for (const file of readdirSync(mediaDir)) {
          copyFileSync(join(mediaDir, file), join(COVERS_DIR, file))
        }
      }

      rmSync(tempDir, { recursive: true, force: true })

      return {
        success: true,
        movies:  (database['movies'] ?? []).length,
        actors:  (database['actors'] ?? []).length,
      }
    } catch (err: any) {
      rmSync(tempDir, { recursive: true, force: true })
      return { success: false, error: err.message }
    }
  })
}

function insertRows(
  db: ReturnType<typeof getDb>,
  table: string,
  rows: Record<string, unknown>[],
  allowedCols: string[]
): void {
  if (!rows.length) return

  // Build insert from allowed columns that exist in the first row
  const cols = allowedCols.filter(c => Object.prototype.hasOwnProperty.call(rows[0], c))
  if (!cols.length) return

  const placeholders = cols.map(() => '?').join(', ')
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`
  )

  for (const row of rows) {
    stmt.run(cols.map(c => row[c] ?? null))
  }
}
