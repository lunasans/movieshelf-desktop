import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb } from './testDb'
import { setSetting } from '../settings'
import { tMain } from '../../i18n'

let db: Database.Database

beforeEach(() => { db = createTestDb() })

describe('tMain', () => {
  it('fällt ohne gesetzte Sprache auf Deutsch zurück', () => {
    expect(tMain(db, 'trayQuit')).toBe('Beenden')
  })

  it('liefert Englisch wenn language=en gesetzt ist', () => {
    setSetting(db, 'language', 'en')
    expect(tMain(db, 'trayQuit')).toBe('Quit')
  })

  it('fällt bei unbekanntem Sprachwert auf Deutsch zurück', () => {
    setSetting(db, 'language', 'fr')
    expect(tMain(db, 'trayQuit')).toBe('Beenden')
  })

  it('interpoliert Variablen', () => {
    expect(tMain(db, 'quitMessage', { count: 3 })).toBe('Du hast 3 Filme noch nicht synchronisiert.')
    setSetting(db, 'language', 'en')
    expect(tMain(db, 'quitMessage', { count: 3 })).toBe('You have 3 movies that are not synced yet.')
  })
})
