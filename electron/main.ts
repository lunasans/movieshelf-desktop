import { app, BrowserWindow, ipcMain, shell, protocol, net } from 'electron'
import { join } from 'path'
import { setupDatabase, getDb } from './database'
import { registerMovieHandlers } from './handlers/movies'
import { registerSettingsHandlers } from './handlers/settings'
import { registerMediaHandlers } from './handlers/media'

const isDev = !app.isPackaged || process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: join(__dirname, '../public/icon.png'),
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
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
  setupDatabase()
  registerMovieHandlers()
  registerSettingsHandlers()
  registerMediaHandlers()

  // Register local resource protocol
  protocol.handle('movie-resource', (request) => {
    const fileName = request.url.replace('movie-resource://', '')
    const filePath = join(app.getPath('userData'), 'covers', fileName)
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

ipcMain.handle('get-is-dev', () => isDev)
ipcMain.handle('app:get-version', () => app.getVersion())
