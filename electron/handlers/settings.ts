import { ipcMain, safeStorage } from 'electron'
import { getDb } from '../database'
import type Database from 'better-sqlite3'

export const ALLOWED_SETTINGS_KEYS = new Set([
  'mode', 'theme', 'shelf_url', 'shelf_token', 'tmdb_api_key', 'last_sync_at', 'language',
  'jellyfin_url', 'jellyfin_user', 'jellyfin_token', 'jellyfin_user_id',
  'jellyfin_device_id', 'jellyfin_libraries', 'jellyfin_last_import_at',
  // Zählung aktiver Installationen (Opt-in, Vorgabe aus). Die Kennung ist
  // absichtlich nicht in SENSITIVE_KEYS: sie ist zufaellig und ohne Bezug zu
  // Person oder Konto, verschlüsseln wäre Aufwand ohne Schutzgewinn — und
  // eine nicht entschlüsselbare Kennung würde beim Zurückspielen eines
  // Backups still zu einer zweiten Installation.
  'stats_enabled', 'stats_install_id',
])

export const SENSITIVE_KEYS = new Set(['shelf_token', 'tmdb_api_key', 'jellyfin_token'])
const ENC_PREFIX = 'enc:v1:'

function decryptIfNeeded(raw: string | null): string | null {
  if (raw == null) return null
  if (!raw.startsWith(ENC_PREFIX)) return raw
  try {
    const b64 = raw.slice(ENC_PREFIX.length)
    return safeStorage.decryptString(Buffer.from(b64, 'base64'))
  } catch {
    return null
  }
}

export function getSetting(db: Database.Database, key: string): string | null {
  if (!ALLOWED_SETTINGS_KEYS.has(key)) return null
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return decryptIfNeeded(row?.value ?? null)
}

export function setSetting(db: Database.Database, key: string, value: unknown): boolean {
  if (!ALLOWED_SETTINGS_KEYS.has(key)) return false
  const str = String(value)
  let stored = str
  if (SENSITIVE_KEYS.has(key) && str !== '' && safeStorage.isEncryptionAvailable()) {
    stored = ENC_PREFIX + safeStorage.encryptString(str).toString('base64')
  }
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, stored)
  return true
}

export function getAllSettings(db: Database.Database): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  return Object.fromEntries(rows.map(r => [r.key, decryptIfNeeded(r.value) ?? '']))
}

export function registerSettingsHandlers(onSettingChanged?: (key: string) => void): void {
  const db = () => getDb()

  ipcMain.handle('settings:get', (_event, key: string) => getSetting(db(), key))
  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
    const ok = setSetting(db(), key, value)
    if (ok) onSettingChanged?.(key)
    return ok
  })
  ipcMain.handle('settings:getAll', () => getAllSettings(db()))
}
