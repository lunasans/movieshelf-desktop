import { ipcMain, app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, createWriteStream, writeFileSync, unlinkSync } from 'fs'
import axios from 'axios'
import { getDb } from '../database'
import { getSetting } from './settings'

const COVERS_DIR = join(app.getPath('userData'), 'covers')

// Maximalgröße eines heruntergeladenen Bildes (Schutz gegen volllaufende Platte)
const MAX_IMAGE_BYTES = 15 * 1024 * 1024 // 15 MB

/** Konfigurierte Master-Server-URL als URL-Objekt – oder null, wenn keiner gesetzt ist. */
function getShelfUrl(): URL | null {
  try {
    const url = getSetting(getDb(), 'shelf_url')
    if (!url) return null
    return new URL(url)
  } catch {
    return null
  }
}

// Übliche Second-Level-Labels unter Länder-TLDs (co.uk, com.au, …) – dort sind
// zwei Labels keine registrierbare Domain, sondern öffentlicher Namensraum.
const PUBLIC_SECOND_LEVEL = new Set(['co', 'com', 'net', 'org', 'gov', 'edu', 'ac'])

/** Registrierbare Domain (vereinfachte Näherung: letzte zwei Labels, bei
 *  öffentlichen Second-Level-TLDs wie co.uk die letzten drei; IPv4 bleibt unverändert). */
export function baseDomain(host: string): string {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host
  const labels = host.split('.')
  if (labels.length <= 2) return host
  const tld = labels[labels.length - 1]
  const second = labels[labels.length - 2]
  const take = tld.length === 2 && PUBLIC_SECOND_LEVEL.has(second) ? 3 : 2
  return labels.slice(-take).join('.')
}

/**
 * Erlaubt sind Downloads vom Master-Server selbst ODER von einer Subdomain derselben
 * registrierbaren Domain – die Shelf liefert Bilder oft von einer eigenen Medien-Domain
 * (z. B. `medien.<domain>`). Fremde Hosts wie image.tmdb.org bleiben blockiert.
 */
export function isAllowedMediaHost(parsed: URL, shelf: URL): boolean {
  if (parsed.origin === shelf.origin) return true
  if (parsed.protocol !== shelf.protocol) return false
  return baseDomain(parsed.hostname) === baseDomain(shelf.hostname)
}

/**
 * Dateiname für ein Medium – erzwingt eine numerische ID und verhindert damit
 * Pfad-Traversal über manipulierte IPC-Argumente. Gibt null bei ungültiger ID zurück.
 */
export function mediaFileName(id: unknown, type: 'cover' | 'backdrop' | 'actor'): string | null {
  const safeId = Number(id)
  if (!Number.isInteger(safeId) || safeId < 0) return null
  if (type === 'backdrop') return `${safeId}_backdrop.jpg`
  if (type === 'actor')    return `actor_${safeId}.jpg`
  return `${safeId}.jpg`
}

export function registerMediaHandlers(): void {
  // Ensure directory exists
  if (!existsSync(COVERS_DIR)) {
    mkdirSync(COVERS_DIR, { recursive: true })
  }

  ipcMain.handle('media:download', async (_event, { url, id, type }: { url: string; id: number; type: 'cover' | 'backdrop' | 'actor' }) => {
    console.log(`[media:download] type=${type} id=${id} url=${url}`)
    if (!url) return { success: false, error: 'No URL provided' }

    // Downloads ausschließlich vom konfigurierten Master-Server zulassen
    // (kein TMDb / kein fremder Host).
    const shelfUrl = getShelfUrl()
    if (!shelfUrl) {
      return { success: false, error: 'Kein Master-Server konfiguriert.' }
    }
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return { success: false, error: 'Ungültige URL.' }
    }
    if (!isAllowedMediaHost(parsed, shelfUrl)) {
      console.warn(`[media:download] Abgelehnt – nur Master-Server/dessen Medien-Domain (${shelfUrl.origin}) erlaubt, war: ${parsed.origin}`)
      return { success: false, error: 'Download nur vom Master-Server (oder dessen Medien-Domain) erlaubt.' }
    }

    const fileName = mediaFileName(id, type)
    if (!fileName) {
      return { success: false, error: 'Ungültige ID.' }
    }

    const filePath = join(COVERS_DIR, fileName)
    console.log(`[media:download] Ziel: ${filePath}`)

    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        maxContentLength: MAX_IMAGE_BYTES,
        maxBodyLength: MAX_IMAGE_BYTES,
      })
      const writer = createWriteStream(filePath)
      response.data.pipe(writer)

      return new Promise((resolve) => {
        let settled = false
        // Bei Abbruch (Schreibfehler ODER abgerissener Download-Stream) keine
        // halbfertige Datei liegen lassen.
        const fail = (err: Error) => {
          if (settled) return
          settled = true
          console.error(`[media:download] ✗ Fehler: ${err.message}`)
          writer.close(() => {
            try { unlinkSync(filePath) } catch { /* Datei existiert ggf. nicht */ }
            resolve({ success: false, error: err.message })
          })
        }
        writer.on('finish', () => {
          if (settled) return
          settled = true
          console.log(`[media:download] ✓ gespeichert: ${filePath}`)
          resolve({ success: true, path: filePath })
        })
        writer.on('error', fail)
        response.data.on('error', fail)
      })
    } catch (error) {
      console.error(`[media:download] ✗ HTTP-Fehler: ${(error as Error).message}`)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('media:exists', (_event, { id, type }: { id: number; type: 'cover' | 'backdrop' | 'actor' }) => {
    const fileName = mediaFileName(id, type)
    if (!fileName) return false
    return existsSync(join(COVERS_DIR, fileName))
  })

  ipcMain.handle('media:upload', (_event, { data, id, type }: { data: ArrayBuffer; id: number; type: 'cover' | 'backdrop' }) => {
    try {
      const fileName = mediaFileName(id, type)
      if (!fileName) return { success: false, error: 'Ungültige ID.' }
      const filePath = join(COVERS_DIR, fileName)
      writeFileSync(filePath, Buffer.from(data))
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}
