import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { existsSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'fs'
import AdmZip from 'adm-zip'
import type Database from 'better-sqlite3'
import { createTestDb, insertMovie, insertActor } from './testDb'
import { createBackupZip, restoreFromZip } from '../backup'

let db: Database.Database
let tempZip: string
let tempDir: string
const noCovers = join(tmpdir(), 'ms_test_covers_none')

beforeEach(() => {
  db = createTestDb()
  tempDir = mkdtempSync(join(tmpdir(), 'ms_backup_test_'))
  tempZip = join(tempDir, `test_backup_${randomUUID()}.ms`)
})

afterEach(() => {
  try { rmSync(tempDir, { recursive: true, force: true }) } catch { /* ignorieren wenn nicht erstellt */ }
})

describe('createBackupZip', () => {
  it('schreibt ZIP mit database.json und manifest.json', () => {
    insertMovie(db, { title: 'Dune' })
    createBackupZip(db, tempZip, noCovers)

    expect(existsSync(tempZip)).toBe(true)
    const zip = new AdmZip(tempZip)
    const entryNames = zip.getEntries().map(e => e.entryName)
    expect(entryNames).toContain('database.json')
    expect(entryNames).toContain('manifest.json')
  })

  it('manifest enthält korrekte App-Kennung und Filmanzahl', () => {
    insertMovie(db, { title: 'Film 1' })
    insertMovie(db, { title: 'Film 2' })
    const result = createBackupZip(db, tempZip, noCovers)

    expect(result.movies).toBe(2)

    const zip = new AdmZip(tempZip)
    const manifest = JSON.parse(zip.readAsText('manifest.json'))
    expect(manifest.app).toBe('MovieShelf Desktop')
    expect(manifest.counts.movies).toBe(2)
    expect(manifest.version).toBe('1.0')
  })

  it('exportiert keine Secrets (shelf_token, tmdb_api_key)', () => {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('shelf_token', 'geheim')").run()
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('tmdb_api_key', 'api-geheim')").run()
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', 'dark')").run()
    createBackupZip(db, tempZip, noCovers)

    const zip = new AdmZip(tempZip)
    const database = JSON.parse(zip.readAsText('database.json'))
    const keys = (database.settings as { key: string }[]).map(r => r.key)
    expect(keys).not.toContain('shelf_token')
    expect(keys).not.toContain('tmdb_api_key')
    expect(keys).toContain('theme')
  })

  it('database.json enthält die Filmdaten', () => {
    insertMovie(db, { title: 'Inception' })
    createBackupZip(db, tempZip, noCovers)

    const zip = new AdmZip(tempZip)
    const database = JSON.parse(zip.readAsText('database.json'))
    expect(database.movies).toHaveLength(1)
    expect(database.movies[0].title).toBe('Inception')
  })
})

describe('restoreFromZip', () => {
  it('stellt Filme und Schauspieler wieder her (Roundtrip)', () => {
    insertMovie(db, { title: 'Der Pate' })
    insertActor(db, { name: 'Marlon Brando' })
    createBackupZip(db, tempZip, noCovers)

    const freshDb = createTestDb()
    const result = restoreFromZip(freshDb, tempZip, noCovers)

    expect(result.movies).toBe(1)
    expect(result.actors).toBe(1)

    const movies = freshDb.prepare('SELECT * FROM movies').all() as any[]
    expect(movies[0].title).toBe('Der Pate')

    const actors = freshDb.prepare('SELECT * FROM actors').all() as any[]
    expect(actors[0].name).toBe('Marlon Brando')
  })

  it('SKIP_KEYS: shelf_token und shelf_url aus Backup werden ignoriert', () => {
    // Migrations legen shelf_token und shelf_url bereits an — OR REPLACE verwenden
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('shelf_token', 'backup_token')").run()
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('shelf_url', 'https://backup.example.com')").run()
    createBackupZip(db, tempZip, noCovers)

    const freshDb = createTestDb()
    freshDb.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('shelf_token', 'live_token')").run()
    freshDb.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('shelf_url', 'https://live.example.com')").run()

    restoreFromZip(freshDb, tempZip, noCovers)

    const token = freshDb.prepare("SELECT value FROM settings WHERE key = 'shelf_token'").get() as any
    const url   = freshDb.prepare("SELECT value FROM settings WHERE key = 'shelf_url'").get() as any
    expect(token.value).toBe('live_token')
    expect(url.value).toBe('https://live.example.com')
  })

  it('ignoriert unbekannte Settings-Keys aus dem Backup (Allowlist)', () => {
    insertMovie(db, { title: 'Dummy' })
    createBackupZip(db, tempZip, noCovers)

    // database.json im Archiv um einen fremden Settings-Key erweitern
    const zip = new AdmZip(tempZip)
    const database = JSON.parse(zip.readAsText('database.json'))
    database.settings.push({ key: 'boese_einstellung', value: 'x' })
    database.settings.push({ key: 'theme', value: 'dark' })
    zip.updateFile('database.json', Buffer.from(JSON.stringify(database)))
    zip.writeZip(tempZip)

    const freshDb = createTestDb()
    restoreFromZip(freshDb, tempZip, noCovers)

    const evil  = freshDb.prepare("SELECT value FROM settings WHERE key = 'boese_einstellung'").get()
    const theme = freshDb.prepare("SELECT value FROM settings WHERE key = 'theme'").get() as any
    expect(evil).toBeUndefined()
    expect(theme.value).toBe('dark')
  })

  it('nach Restore sind keine alten Daten mehr vorhanden', () => {
    insertMovie(db, { title: 'Im Backup' })
    createBackupZip(db, tempZip, noCovers)

    const freshDb = createTestDb()
    insertMovie(freshDb, { title: 'Alt-Daten' })
    restoreFromZip(freshDb, tempZip, noCovers)

    const movies = freshDb.prepare('SELECT title FROM movies').all() as any[]
    expect(movies.map(m => m.title)).not.toContain('Alt-Daten')
    expect(movies.map(m => m.title)).toContain('Im Backup')
  })

  it('wirft wenn manifest.json fehlt', () => {
    const zip = new AdmZip()
    zip.addFile('database.json', Buffer.from('{}'))
    zip.writeZip(tempZip)

    expect(() => restoreFromZip(db, tempZip, noCovers)).toThrow('manifest.json fehlt')
  })

  it('wirft bei falschem manifest.app', () => {
    const zip = new AdmZip()
    zip.addFile('manifest.json', Buffer.from(JSON.stringify({ app: 'FremdeApp', version: '1.0' })))
    zip.addFile('database.json', Buffer.from('{}'))
    zip.writeZip(tempZip)

    expect(() => restoreFromZip(db, tempZip, noCovers)).toThrow('Inkompatibles Backup-Format')
  })

  it('wirft bei Pfad-Traversal-Eintrag im Archiv (../a.txt)', () => {
    // AdmZip normalisiert Pfade beim Schreiben — ZIP mit Traversal via Buffer-Patch erzeugen
    // 'evil.txt' (8 Bytes) wird 1:1 durch '../a.txt' (8 Bytes) ersetzt, damit Längenfelder stimmen
    const zip = new AdmZip()
    zip.addFile('evil.txt', Buffer.from('pwned'))
    const buf = zip.toBuffer()
    const patched = Buffer.from(buf)
    const search = Buffer.from('evil.txt')
    const replace = Buffer.from('../a.txt')
    let idx = patched.indexOf(search)
    while (idx !== -1) {
      replace.copy(patched, idx)
      idx = patched.indexOf(search, idx + replace.length)
    }
    writeFileSync(tempZip, patched)

    expect(() => restoreFromZip(db, tempZip, noCovers)).toThrow('Sicherheitsrisiko')
  })
})
