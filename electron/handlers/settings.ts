import { ipcMain } from 'electron'
import { getDb } from '../database'
import type Database from 'better-sqlite3'

const ALLOWED_SETTINGS_KEYS = new Set(['mode', 'theme', 'shelf_url', 'shelf_token', 'tmdb_api_key', 'last_sync_at'])

export function getSetting(db: Database.Database, key: string): string | null {
  if (!ALLOWED_SETTINGS_KEYS.has(key)) return null
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(db: Database.Database, key: string, value: unknown): boolean {
  if (!ALLOWED_SETTINGS_KEYS.has(key)) return false
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value))
  return true
}

export function getAllSettings(db: Database.Database): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export function registerSettingsHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('settings:get', (_event, key: string) => getSetting(db(), key))
  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => setSetting(db(), key, value))
  ipcMain.handle('settings:getAll', () => getAllSettings(db()))
}
