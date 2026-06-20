import { app, BrowserWindow, ipcMain, shell, protocol, net, session } from 'electron'
import { autoUpdater } from 'electron-updater'
import { globalAgent } from 'https'
globalAgent.setMaxListeners(30)
import { join, sep } from 'path'

// Globale Absicherung: nichts soll den Main-Process unbemerkt killen.
process.on('unhandledRejection', (reason) => {
  console.error('[main] Unhandled promise rejection:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[main] Uncaught exception:', err)
})
import { setupDatabase, getDb } from './database'
import { registerMovieHandlers } from './handlers/movies'
import { registerActorHandlers } from './handlers/actors'
import { registerSyncHandlers } from './handlers/sync'
import { registerSettingsHandlers } from './handlers/settings'
import { registerMediaHandlers } from './handlers/media'
import { registerListHandlers } from './handlers/lists'
import { registerStatsHandlers } from './handlers/stats'
import { registerOAuthHandlers } from './handlers/oauth'
import { registerBackupHandlers } from './handlers/backup'
import { registerSeasonHandlers } from './handlers/seasons'

const isDev = !app.isPackaged || process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null

// ── OAuth Deep-Link Handler ───────────────────────────────────────────────────

function handleDeepLink(url: string) {
  if (!url.startsWith('movieshelf://oauth/callback')) return
  try {
    const parsed = new URL(url)
    const code   = parsed.searchParams.get('code')
    const state  = parsed.searchParams.get('state')
    if (code) mainWindow?.webContents.send('oauth:callback', { code, state })
  } catch { /* ignore malformed URLs */ }
}

// Single-instance lock so deep links on Windows/Linux reach the running app
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
}

app.on('second-instance', (_event, argv) => {
  const deepLink = argv.find(a => a.startsWith('movieshelf://'))
  if (deepLink) handleDeepLink(deepLink)
  if (mainWindow) { mainWindow.show(); mainWindow.focus() }
})

// macOS deep link
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    frame: false,
    show: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
    },
    icon: join(__dirname, '../public/icon.png'),
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Navigation weg von der eigenen App unterbinden (extern öffnen statt im App-Fenster laden).
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const ownPrefix = isDev ? 'http://localhost:5173' : 'file://'
    if (!url.startsWith(ownPrefix)) {
      event.preventDefault()
      if (url.startsWith('https://') || url.startsWith('http://')) {
        shell.openExternal(url)
      }
    }
  })

  // Prompt for sync before closing
  mainWindow.on('close', (e) => {
    if ((app as any).isQuitting) return

    e.preventDefault()

    const db = getDb()
    
    // Check for dirty records
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM movies 
      WHERE remote_id IS NULL 
         OR updated_at > synced_at 
         OR is_deleted = 1
    `).get() as { count: number }

    const dirtyCount = result ? result.count : 0

    if (dirtyCount > 0) {
      const { dialog } = require('electron')
      dialog.showMessageBox(mainWindow!, {
        type: 'question',
        buttons: ['Jetzt Synchronisieren', 'Trotzdem Beenden', 'Abbrechen'],
        defaultId: 0,
        cancelId: 2,
        title: 'Nicht synchronisierte Änderungen',
        message: `Du hast ${dirtyCount} Filme noch nicht synchronisiert.`,
        detail: 'Möchtest du jetzt synchronisieren, bevor du das Programm schließt?'
      }).then((result: { response: number }) => {
        if (result.response === 0) {
          mainWindow!.webContents.send('navigate-to', '/sync')
        } else if (result.response === 1) {
          (app as any).isQuitting = true
          app.quit()
        }
      })
    } else {
      (app as any).isQuitting = true
      app.quit()
    }
  })
}

app.whenReady().then(() => {
  // Register custom protocol for OAuth deep links
  app.setAsDefaultProtocolClient('movieshelf')

  // Content-Security-Policy NUR für die eigenen App-Seiten (file://) setzen –
  // entfernte Inhalte in OAuth-/Trailer-Fenstern (https://) bleiben unberührt,
  // damit deren eigene Seiten nicht zerschossen werden.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (!details.url.startsWith('file://')) {
      callback({ responseHeaders: details.responseHeaders })
      return
    }
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com data:; " +
            "img-src 'self' data: blob: movie-resource: https: http:; " +
            "connect-src 'self' https: http:; " +
            "media-src 'self' https:; " +
            "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        ],
      },
    })
  })

  setupDatabase()
  registerMovieHandlers()
  registerActorHandlers()
  registerSyncHandlers()
  registerSettingsHandlers()
  registerMediaHandlers()
  registerListHandlers()
  registerStatsHandlers()
  registerOAuthHandlers()
  registerBackupHandlers()
  registerSeasonHandlers()

  // Register local resource protocol
  protocol.handle('movie-resource', (request) => {
    const coversDir = join(app.getPath('userData'), 'covers')
    const raw = request.url.slice('movie-resource://'.length)
    // Strip any path separators to prevent directory traversal
    const fileName = raw.replace(/[/\\]/g, '')
    const filePath = join(coversDir, fileName)
    // Ensure the resolved path stays inside the covers directory
    if (!filePath.startsWith(coversDir + sep)) {
      return new Response('Forbidden', { status: 403 })
    }
    const { existsSync } = require('fs') as typeof import('fs')
    if (!existsSync(filePath)) {
      console.warn(`[movie-resource] Datei nicht gefunden: ${filePath}`)
      return new Response('Not Found', { status: 404 })
    }
    return net.fetch('file://' + filePath)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => {
  if (mainWindow) {
    mainWindow.close()
  }
})

ipcMain.handle('trailer:open', (_event, url: string) => {
  // Only allow YouTube watch URLs
  let parsedUrl: URL
  try { parsedUrl = new URL(url) } catch { return }
  if (parsedUrl.protocol !== 'https:') return
  if (!/^(www\.)?youtube\.com$/.test(parsedUrl.hostname)) return
  if (!parsedUrl.pathname.startsWith('/watch')) return

  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  )

  // Popups (window.open) nicht im privilegierten Fenster öffnen, sondern extern.
  win.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    if (openUrl.startsWith('https://') || openUrl.startsWith('http://')) shell.openExternal(openUrl)
    return { action: 'deny' }
  })

  win.loadURL(url)

  win.webContents.on('before-input-event', (_e, input) => {
    if (input.key === 'Escape') win.close()
  })
})

ipcMain.handle('get-is-dev', () => isDev)
ipcMain.handle('app:get-version', () => app.getVersion())

// ── Auto-Updater (electron-updater) ──────────────────────────────────────────

autoUpdater.autoDownload = false

autoUpdater.on('download-progress', p => {
  mainWindow?.webContents.send('update:progress', Math.round(p.percent))
})

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update:ready')
})

autoUpdater.on('error', (err) => {
  console.error('[autoUpdater] error:', err)
  mainWindow?.webContents.send('update:error', String(err))
})

ipcMain.handle('update:check',    () => autoUpdater.checkForUpdates())
ipcMain.handle('update:download', async () => {
  await autoUpdater.checkForUpdates()
  return autoUpdater.downloadUpdate()
})
ipcMain.handle('update:install',  () => {
  ;(app as any).isQuitting = true
  autoUpdater.quitAndInstall()
})
