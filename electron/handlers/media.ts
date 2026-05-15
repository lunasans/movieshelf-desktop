import { ipcMain, app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, createWriteStream, writeFileSync } from 'fs'
import axios from 'axios'

const COVERS_DIR = join(app.getPath('userData'), 'covers')

export function registerMediaHandlers(): void {
  // Ensure directory exists
  if (!existsSync(COVERS_DIR)) {
    mkdirSync(COVERS_DIR, { recursive: true })
  }

  ipcMain.handle('media:download', async (_event, { url, id, type }: { url: string; id: number; type: 'cover' | 'backdrop' | 'actor' }) => {
    console.log(`[media:download] type=${type} id=${id} url=${url}`)
    if (!url) return { success: false, error: 'No URL provided' }
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:') throw new Error('not https')
    } catch (e) {
      console.warn(`[media:download] URL-Prüfung fehlgeschlagen: ${(e as Error).message} – url=${url}`)
      return { success: false, error: 'Nur HTTPS-URLs erlaubt.' }
    }

    let fileName = `${id}.jpg`
    if (type === 'backdrop') fileName = `${id}_backdrop.jpg`
    if (type === 'actor')    fileName = `actor_${id}.jpg`

    const filePath = join(COVERS_DIR, fileName)
    console.log(`[media:download] Ziel: ${filePath}`)

    try {
      const response = await axios({ url, method: 'GET', responseType: 'stream' })
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
