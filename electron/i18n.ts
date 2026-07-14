import type Database from 'better-sqlite3'
import { getSetting } from './handlers/settings'

// Mini-Übersetzung für den Main-Prozess (Tray, native Dialoge, Fenstertitel).
// Kein Framework: Strings werden zur Aufrufzeit anhand des `language`-Settings
// aufgelöst, damit ein Sprachwechsel ohne Neustart wirkt.
const messages = {
  de: {
    trayOpen: 'MovieShelf öffnen',
    trayQuit: 'Beenden',
    quitTitle: 'Nicht synchronisierte Änderungen',
    quitMessage: 'Du hast {count} Filme noch nicht synchronisiert.',
    quitDetail: 'Möchtest du jetzt synchronisieren, bevor du das Programm schließt?',
    quitSyncNow: 'Jetzt Synchronisieren',
    quitAnyway: 'Trotzdem Beenden',
    cancel: 'Abbrechen',
    backupSaveTitle: 'Backup speichern',
    backupRestoreOpenTitle: 'Backup wiederherstellen',
    backupRestoreConfirmTitle: 'Backup wiederherstellen',
    backupRestoreMessage: 'Aktuelle Sammlung wird überschrieben',
    backupRestoreDetail: 'Alle lokalen Filme, Schauspieler und Listen werden durch das Backup ersetzt. Fortfahren?',
    backupRestore: 'Wiederherstellen',
    oauthWindowTitle: 'MovieShelf Login',
  },
  en: {
    trayOpen: 'Open MovieShelf',
    trayQuit: 'Quit',
    quitTitle: 'Unsynced changes',
    quitMessage: 'You have {count} movies that are not synced yet.',
    quitDetail: 'Do you want to sync now before closing the app?',
    quitSyncNow: 'Sync now',
    quitAnyway: 'Quit anyway',
    cancel: 'Cancel',
    backupSaveTitle: 'Save backup',
    backupRestoreOpenTitle: 'Restore backup',
    backupRestoreConfirmTitle: 'Restore backup',
    backupRestoreMessage: 'Your current collection will be overwritten',
    backupRestoreDetail: 'All local movies, actors and lists will be replaced by the backup. Continue?',
    backupRestore: 'Restore',
    oauthWindowTitle: 'MovieShelf Login',
  },
} as const

export type MainMessageKey = keyof typeof messages.de

export function tMain(db: Database.Database, key: MainMessageKey, vars?: Record<string, string | number>): string {
  const lang: 'de' | 'en' = getSetting(db, 'language') === 'en' ? 'en' : 'de'
  let msg: string = messages[lang][key]
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replace(`{${k}}`, String(v))
    }
  }
  return msg
}
