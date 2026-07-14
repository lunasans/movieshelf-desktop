import { ipcMain, app, dialog } from 'electron'
import { join } from 'path'
import { readdirSync, existsSync, mkdirSync, copyFileSync, rmSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import AdmZip from 'adm-zip'
import { getDb } from '../database'
import { tMain } from '../i18n'
import { ALLOWED_SETTINGS_KEYS, SENSITIVE_KEYS } from './settings'
import type Database from 'better-sqlite3'

const COVERS_DIR = join(app.getPath('userData'), 'covers')

const TABLES = ['movies', 'actors', 'film_actor', 'lists', 'external_movies', 'list_items', 'settings'] as const

export function createBackupZip(db: Database.Database, zipPath: string, coversDir: string): { movies: number } {
  const zip = new AdmZip()

  const database: Record<string, unknown[]> = {}
  for (const table of TABLES) {
    try {
      database[table] = db.prepare(`SELECT * FROM ${table}`).all()
    } catch {
      database[table] = []
    }
  }

  // Secrets (Token, API-Keys) gehören nicht in eine Backup-Datei, die Nutzer
  // weitergeben oder in Cloud-Speicher legen – ohne safeStorage lägen sie dort
  // sogar im Klartext.
  database['settings'] = (database['settings'] as { key: string }[])
    .filter(row => !SENSITIVE_KEYS.has(row.key))

  zip.addFile('database.json', Buffer.from(JSON.stringify(database, null, 2), 'utf-8'))

  const movieCount = (database['movies'] as unknown[]).length
  const manifest = {
    version:    '1.0',
    app:        'MovieShelf Desktop',
    created_at: new Date().toISOString(),
    counts:     { movies: movieCount, actors: (database['actors'] as unknown[]).length },
  }
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'))

  if (existsSync(coversDir)) {
    const files = readdirSync(coversDir)
    for (const file of files) {
      zip.addLocalFile(join(coversDir, file), 'media')
    }
  }

  zip.writeZip(zipPath)
  return { movies: movieCount }
}

export function restoreFromZip(db: Database.Database, zipPath: string, coversDir: string): { movies: number; actors: number } {
  const zip = new AdmZip(zipPath)

  for (const entry of zip.getEntries()) {
    const name = entry.entryName
    if (name.includes('..') || name.startsWith('/') || name.startsWith('\\')) {
      throw new Error('Sicherheitsrisiko: Ungültige Pfade im Archiv.')
    }
  }

  const tempDir = join(tmpdir(), `ms_restore_${randomUUID()}`)
  mkdirSync(tempDir, { recursive: true })

  try {
    zip.extractAllTo(tempDir, true)

    const manifestPath = join(tempDir, 'manifest.json')
    if (!existsSync(manifestPath)) throw new Error('Ungültiges Backup: manifest.json fehlt.')

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    if (manifest.app !== 'MovieShelf Desktop') {
      throw new Error('Inkompatibles Backup-Format (kein MovieShelf Desktop Backup).')
    }

    const dbPath = join(tempDir, 'database.json')
    if (!existsSync(dbPath)) throw new Error('Ungültiges Backup: database.json fehlt.')

    const database: Record<string, Record<string, unknown>[]> = JSON.parse(readFileSync(dbPath, 'utf-8'))

    db.pragma('foreign_keys = OFF')

    try {
      const restore = db.transaction(() => {
        db.exec('DELETE FROM list_items')
        db.exec('DELETE FROM film_actor')
        db.exec('DELETE FROM external_movies')
        db.exec('DELETE FROM movies')
        db.exec('DELETE FROM actors')
        db.exec('DELETE FROM lists')

        insertRows(db, 'actors',     database['actors']     ?? [], ['id','remote_id','name','bio','birthday','place_of_birth','image_path','tmdb_id','created_at','updated_at'])
        insertRows(db, 'movies',     database['movies']     ?? [], ['id','title','year','genre','director','runtime','rating','rating_age','overview','cover_path','backdrop_path','actors_names','trailer_url','collection_type','tag','tmdb_id','remote_id','synced_at','is_deleted','is_boxset','boxset_parent_id','view_count','is_watched','in_collection','collection_no','created_at','updated_at'])
        insertRows(db, 'film_actor', database['film_actor'] ?? [], ['film_id','actor_id','role','is_main_role'])
        insertRows(db, 'lists',      database['lists']      ?? [], ['id','name','remote_id','created_at','updated_at','synced_at'])
        insertRows(db, 'external_movies', database['external_movies'] ?? [], ['id','remote_id','title','year','genre','director','runtime','rating','rating_age','overview','collection_type','cover_path','backdrop_path','trailer_url','tmdb_id','synced_at','created_at','updated_at'])
        insertRows(db, 'list_items', database['list_items'] ?? [], ['list_id','item_type','item_id','added_at'])

        // Nur bekannte Settings-Keys übernehmen (Allowlist wie im Settings-Handler);
        // Server-Verbindung (Token/URL) der laufenden Installation nie überschreiben.
        const SKIP_KEYS = new Set(['shelf_token', 'shelf_url'])
        for (const row of database['settings'] ?? []) {
          const key = row['key'] as string
          if (SKIP_KEYS.has(key) || !ALLOWED_SETTINGS_KEYS.has(key)) continue
          db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, row['value'])
        }
      })

      restore()

      const mediaDir = join(tempDir, 'media')
      if (existsSync(mediaDir)) {
        mkdirSync(coversDir, { recursive: true })
        for (const file of readdirSync(mediaDir)) {
          copyFileSync(join(mediaDir, file), join(coversDir, file))
        }
      }

      return {
        movies: (database['movies'] ?? []).length,
        actors: (database['actors'] ?? []).length,
      }
    } finally {
      db.pragma('foreign_keys = ON')
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

export function registerBackupHandlers(): void {
  ipcMain.handle('backup:create', async () => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: tMain(getDb(), 'backupSaveTitle'),
      defaultPath: `movieshelf_backup_${new Date().toISOString().slice(0, 10)}.ms`,
      filters: [{ name: 'MovieShelf Backup', extensions: ['ms'] }],
    })

    if (canceled || !filePath) return { success: false, canceled: true }

    try {
      const result = createBackupZip(getDb(), filePath, COVERS_DIR)
      return { success: true, path: filePath, movies: result.movies }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('backup:restore', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: tMain(getDb(), 'backupRestoreOpenTitle'),
      filters: [{ name: 'MovieShelf Backup', extensions: ['ms'] }],
      properties: ['openFile'],
    })

    if (canceled || !filePaths[0]) return { success: false, canceled: true }

    const { response } = await dialog.showMessageBox({
      type: 'warning',
      buttons: [tMain(getDb(), 'backupRestore'), tMain(getDb(), 'cancel')],
      defaultId: 1,
      cancelId: 1,
      title: tMain(getDb(), 'backupRestoreConfirmTitle'),
      message: tMain(getDb(), 'backupRestoreMessage'),
      detail: tMain(getDb(), 'backupRestoreDetail'),
    })

    if (response !== 0) return { success: false, canceled: true }

    try {
      const result = restoreFromZip(getDb(), filePaths[0], COVERS_DIR)
      return { success: true, ...result }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}

function insertRows(
  db: Database.Database,
  table: string,
  rows: Record<string, unknown>[],
  allowedCols: string[]
): void {
  if (!rows.length) return

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
