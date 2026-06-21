import { ipcMain, app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, createWriteStream, writeFileSync } from 'fs'
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

/** Registrierbare Domain (vereinfachte Näherung: letzte zwei Labels; IPv4 bleibt unverändert). */
function baseDomain(host: string): string {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host
  const labels = host.split('.')
  return labels.length <= 2 ? host : labels.slice(-2).join('.')
}

/**
 * Erlaubt sind Downloads vom Master-Server selbst ODER von einer Subdomain derselben
 * registrierbaren Domain – die Shelf liefert Bilder oft von einer eigenen Medien-Domain
 * (z. B. `medien.<domain>`). Fremde Hosts wie image.tmdb.org bleiben blockiert.
 */
function isAllowedMediaHost(parsed: URL, shelf: URL): boolean {
  if (parsed.origin === shelf.origin) return true
  if (parsed.protocol !== shelf.protocol) return false
  return baseDomain(parsed.hostname) === baseDomain(shelf.hostname)
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

    // ID strikt numerisch erzwingen (verhindert Pfad-Traversal im Dateinamen)
    const safeId = Number(id)
    if (!Number.isInteger(safeId) || safeId < 0) {
      return { success: false, error: 'Ungültige ID.' }
    }

    let fileName = `${safeId}.jpg`
    if (type === 'backdrop') fileName = `${safeId}_backdrop.jpg`
    if (type === 'actor')    fileName = `actor_${safeId}.jpg`

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
        writer.on('finish', () => { console.log(`[media:download] ✓ gespeichert: ${filePath}`); resolve({ success: true, path: filePath }) })
        writer.on('error',  (err) => { console.error(`[media:download] ✗ Schreibfehler: ${err.message}`); resolve({ success: false, error: err.message }) })
      })
    } catch (error) {
      console.error(`[media:download] ✗ HTTP-Fehler: ${(error as Error).message}`)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('media:exists', (_event, { id, type }: { id: number; type: 'cover' | 'backdrop' | 'actor' }) => {
    let fileName = `${id}.jpg`
    if (type === 'backdrop') fileName = `${id}_backdrop.jpg`
    if (type === 'actor') fileName = `actor_${id}.jpg`

    const filePath = join(COVERS_DIR, fileName)
    return existsSync(filePath)
  })

  ipcMain.handle('media:upload', (_event, { data, id, type }: { data: ArrayBuffer; id: number; type: 'cover' | 'backdrop' }) => {
    try {
      const fileName = type === 'backdrop' ? `${id}_backdrop.jpg` : `${id}.jpg`
      const filePath = join(COVERS_DIR, fileName)
      writeFileSync(filePath, Buffer.from(data))
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}
