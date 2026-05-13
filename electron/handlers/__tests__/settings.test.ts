import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb } from './testDb'
import { getSetting, setSetting, getAllSettings } from '../settings'

let db: Database.Database

beforeEach(() => { db = createTestDb() })

describe('getSetting', () => {
  it('gibt Wert für erlaubten Key zurück', () => {
    // 'mode' existiert als Migration-Default mit 'standalone'
    expect(getSetting(db, 'mode')).toBe('standalone')
  })

  it('gibt null für nicht-erlaubten Key zurück', () => {
    expect(getSetting(db, 'evil_key')).toBeNull()
  })

  it('gibt null zurück wenn Key nicht gesetzt', () => {
    expect(getSetting(db, 'theme')).toBeNull()
  })
})

describe('setSetting', () => {
  it('speichert erlaubten Key und gibt true zurück', () => {
    const result = setSetting(db, 'theme', 'dark')
    expect(result).toBe(true)
    const row = db.prepare("SELECT value FROM settings WHERE key = 'theme'").get() as any
    expect(row.value).toBe('dark')
  })

  it('lehnt nicht-erlaubten Key ab und gibt false zurück', () => {
    const result = setSetting(db, 'evil_key', 'pwned')
    expect(result).toBe(false)
    const row = db.prepare("SELECT * FROM settings WHERE key = 'evil_key'").get()
    expect(row).toBeUndefined()
  })

  it('überschreibt vorhandenen Wert', () => {
    setSetting(db, 'mode', 'standalone')
    setSetting(db, 'mode', 'online')
    expect(getSetting(db, 'mode')).toBe('online')
  })
})

describe('getAllSettings', () => {
  it('gibt alle gespeicherten Settings zurück', () => {
    setSetting(db, 'mode', 'standalone')
    setSetting(db, 'theme', 'dark')

    const all = getAllSettings(db)
    expect(all['mode']).toBe('standalone')
    expect(all['theme']).toBe('dark')
  })

  it('enthält Migration-Defaults (mode, shelf_url, shelf_token)', () => {
    const all = getAllSettings(db)
    expect(all).toHaveProperty('mode')
    expect(all).toHaveProperty('shelf_url')
    expect(all).toHaveProperty('shelf_token')
  })
})
