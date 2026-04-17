import { ipcMain, app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, createWriteStream } from 'fs'
import axios from 'axios'

const COVERS_DIR = join(app.getPath('userData'), 'covers')

export function registerMediaHandlers(): void {
  // Ensure directory exists
  if (!existsSync(COVERS_DIR)) {
    mkdirSync(COVERS_DIR, { recursive: true })
  }

  ipcMain.handle('media:download', async (_event, { url, id, type }: { url: string; id: number; type: 'cover' | 'backdrop' | 'actor' }) => {
    if (!url) return { success: false, error: 'No URL provided' }
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:') throw new Error()
    } catch {
      return { success: false, error: 'Nur HTTPS-URLs erlaubt.' }
    }
    
    let fileName = `${id}.jpg`
    if (type === 'backdrop') fileName = `${id}_backdrop.jpg`
    if (type === 'actor') fileName = `actor_${id}.jpg`
    
    const filePath = join(COVERS_DIR, fileName)
    
    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
      })

      const writer = createWriteStream(filePath)
      response.data.pipe(writer)

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve({ success: true, path: filePath }))
        writer.on('error', (err) => resolve({ success: false, error: err.message }))
      })
    } catch (error) {
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
}
