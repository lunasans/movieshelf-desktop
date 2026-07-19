import { app, BrowserWindow, ipcMain, shell, protocol, net, session, Tray, Menu, nativeImage } from 'electron'
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
import { initLogger, getLogs, clearLogs, getLogFilePath } from './logger'
import { setupDatabase, getDb } from './database'
import { registerMovieHandlers } from './handlers/movies'
import { registerActorHandlers } from './handlers/actors'
import { registerSyncHandlers } from './handlers/sync'
import { registerSettingsHandlers, getSetting } from './handlers/settings'
import { tMain } from './i18n'
import { registerMediaHandlers } from './handlers/media'
import { registerListHandlers } from './handlers/lists'
import { registerExternalHandlers } from './handlers/external'
import { registerStatsHandlers } from './handlers/stats'
import { registerOAuthHandlers } from './handlers/oauth'
import { registerBackupHandlers } from './handlers/backup'
import { registerSeasonHandlers } from './handlers/seasons'

const isDev = !app.isPackaged || process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

// Beim Autostart über das Login-Item wird die App mit `--hidden` gestartet
// (siehe app:set-autostart). Dann nur ins Tray, ohne Fenster anzuzeigen.
const startHidden = process.argv.includes('--hidden')

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

  mainWindow.once('ready-to-show', () => {
    if (!startHidden) mainWindow?.show()
  })

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

  // Schließen (X) beendet die App nicht, sondern minimiert sie ins Tray.
  // Tatsächlich beendet wird nur über das Tray-Menü „Beenden" (→ quitApp).
  mainWindow.on('close', (e) => {
    if ((app as any).isQuitting) return
    e.preventDefault()
    mainWindow?.hide()
  })
}

// ── Tray ───────────────────────────────────────────────────────────────────────

function showMainWindow() {
  if (!mainWindow) { createWindow(); return }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function buildTrayMenu() {
  const db = getDb()
  return Menu.buildFromTemplate([
    { label: tMain(db, 'trayOpen'), click: () => showMainWindow() },
    { type: 'separator' },
    { label: tMain(db, 'trayQuit'), click: () => quitApp() },
  ])
}

function createTray() {
  if (tray) return
  const icon = nativeImage.createFromPath(join(__dirname, '../public/icon.png'))
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('MovieShelf')
  tray.setContextMenu(buildTrayMenu())
  tray.on('click', () => showMainWindow())
  tray.on('double-click', () => showMainWindow())
}

// Echtes Beenden inkl. Abfrage nicht synchronisierter Änderungen.
function quitApp() {
  if ((app as any).isQuitting) return

  const db = getDb()

  // Nur im Online-Modus fragen: im Standalone-Betrieb hat kein Film eine
  // remote_id – die Abfrage würde sonst bei jedem Beenden erscheinen,
  // obwohl es gar keinen Server gibt, mit dem man synchronisieren könnte.
  const mode = getSetting(db, 'mode')
  if (mode !== 'online') {
    (app as any).isQuitting = true
    app.quit()
    return
  }

  const result = db.prepare(`
    SELECT COUNT(*) as count FROM movies
    WHERE remote_id IS NULL
       OR updated_at > synced_at
       OR is_deleted = 1
  `).get() as { count: number }

  const dirtyCount = result ? result.count : 0

  if (dirtyCount > 0) {
    const { dialog } = require('electron')
    showMainWindow()
    dialog.showMessageBox(mainWindow!, {
      type: 'question',
      buttons: [tMain(db, 'quitSyncNow'), tMain(db, 'quitAnyway'), tMain(db, 'cancel')],
      defaultId: 0,
      cancelId: 2,
      title: tMain(db, 'quitTitle'),
      message: tMain(db, 'quitMessage', { count: dirtyCount }),
      detail: tMain(db, 'quitDetail')
    }).then((res: { response: number }) => {
      if (res.response === 0) {
        mainWindow!.webContents.send('navigate-to', '/sync')
      } else if (res.response === 1) {
        (app as any).isQuitting = true
        app.quit()
      }
    })
  } else {
    (app as any).isQuitting = true
    app.quit()
  }
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

  initLogger()
  setupDatabase()
  registerMovieHandlers()
  registerActorHandlers()
  registerSyncHandlers()
  registerSettingsHandlers((key) => {
    // Tray-Menü live in der neuen Sprache aufbauen (kein Neustart nötig)
    if (key === 'language') tray?.setContextMenu(buildTrayMenu())
  })
  registerMediaHandlers()
  registerListHandlers()
  registerExternalHandlers()
  registerStatsHandlers()
  registerOAuthHandlers()
  registerBackupHandlers()
  registerSeasonHandlers()

  // Register local resource protocol
  protocol.handle('movie-resource', (request) => {
    const coversDir = join(app.getPath('userData'), 'covers')
    let raw = request.url.slice('movie-resource://'.length).replace(/\/+$/, '')
    // Prozent-Kodierung zuerst auflösen – sonst schlüpfen %2F/%5C an der
    // Separator-Prüfung vorbei und werden später beim file://-Fetch dekodiert.
    try {
      raw = decodeURIComponent(raw)
    } catch {
      return new Response('Bad Request', { status: 400 })
    }
    // Nur einfache Dateinamen zulassen (kein Pfad, keine Traversal-Sequenzen)
    if (!/^[\w.\- ]+$/.test(raw) || raw.includes('..')) {
      return new Response('Forbidden', { status: 403 })
    }
    const filePath = join(coversDir, raw)
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
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Window controls: immer das Fenster des Absenders steuern — sonst schließt
// z. B. das X im Statistik-Popup das Hauptfenster. Das Hauptfenster behält
// sein Close-to-Tray-Verhalten über seinen eigenen 'close'-Handler.
ipcMain.on('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize()
})
ipcMain.on('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return
  if (win.isMaximized()) {
    win.unmaximize()
  } else {
    win.maximize()
  }
})
ipcMain.on('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close()
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

  // Navigation im Trailer-Fenster auf YouTube (inkl. Consent-Seiten) begrenzen –
  // alles andere im Standardbrowser öffnen, wie im Hauptfenster.
  win.webContents.on('will-navigate', (e, navUrl) => {
    let parsed: URL
    try { parsed = new URL(navUrl) } catch { e.preventDefault(); return }
    const allowed = parsed.protocol === 'https:' && /(^|\.)(youtube\.com|google\.com)$/.test(parsed.hostname)
    if (!allowed) {
      e.preventDefault()
      if (navUrl.startsWith('https://') || navUrl.startsWith('http://')) shell.openExternal(navUrl)
    }
  })

  win.loadURL(url)

  win.webContents.on('before-input-event', (_e, input) => {
    if (input.key === 'Escape') win.close()
  })
})

ipcMain.handle('get-is-dev', () => isDev)
ipcMain.handle('app:get-version', () => app.getVersion())

// ── Protokolle ────────────────────────────────────────────────────────────────
ipcMain.handle('logs:get', () => getLogs())
ipcMain.handle('logs:clear', () => { clearLogs(); return true })
ipcMain.handle('logs:open-folder', () => {
  const path = getLogFilePath()
  if (path) shell.showItemInFolder(path)
})

// ── Autostart (Login Item) ───────────────────────────────────────────────────
// Nutzt das Betriebssystem (Windows-Registry/macOS Login Items), nicht NSIS.
ipcMain.handle('app:get-autostart', () => app.getLoginItemSettings().openAtLogin)

ipcMain.handle('app:set-autostart', (_event, enabled: boolean) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    // Beim Login leise ins Tray starten (von createWindow/ready-to-show ausgewertet).
    args: enabled ? ['--hidden'] : [],
  })
  return app.getLoginItemSettings().openAtLogin
})

// ── Auto-Updater (electron-updater) ──────────────────────────────────────────

autoUpdater.autoDownload = false

// Differential-Download (Blockmap-Patching) abschalten: Wenn die `.blockmap`
// nicht exakt zur veröffentlichten `.exe` passt (z. B. durch frühere doppelte
// Build-Pipelines), liefert das Patchen am Ende eine andere SHA512 → der Download
// läuft auf 100 % und bricht dann mit einem Prüfsummen-Fehler ab. Voller Download
// ist robuster und nur unwesentlich größer.
autoUpdater.disableDifferentialDownload = true

// Logger in Datei (userData/updater.log) – damit Update-Fehler in der
// Produktion diagnostizierbar sind und nicht nur auf der unsichtbaren Konsole landen.
const updaterLog = (level: string, msg: unknown) => {
  const text = msg instanceof Error ? (msg.stack || msg.message) : (typeof msg === 'string' ? msg : JSON.stringify(msg))
  try {
    require('fs').appendFileSync(
      join(app.getPath('userData'), 'updater.log'),
      `[${new Date().toISOString()}] [${level}] ${text}\n`,
    )
  } catch { /* Log-Fehler ignorieren */ }
  console.log('[autoUpdater]', level, text)
}
autoUpdater.logger = {
  info:  (m: unknown) => updaterLog('info', m),
  warn:  (m: unknown) => updaterLog('warn', m),
  error: (m: unknown) => updaterLog('error', m),
  debug: () => { /* zu gesprächig – weglassen */ },
} as never

autoUpdater.on('download-progress', p => {
  mainWindow?.webContents.send('update:progress', Math.round(p.percent))
})

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update:ready')
})

autoUpdater.on('error', (err) => {
  updaterLog('error', err)
  mainWindow?.webContents.send('update:error', String(err?.message || err))
})

ipcMain.handle('update:check',    () => autoUpdater.checkForUpdates())
ipcMain.handle('update:download', async () => {
  await autoUpdater.checkForUpdates()
  return autoUpdater.downloadUpdate()
})
ipcMain.handle('update:install',  () => {
  ;(app as any).isQuitting = true
  // setImmediate: erst die IPC-Antwort an den Renderer flushen, dann herunterfahren –
  // sonst kann quitAndInstall den Aufruf abwürgen, bevor er beim Renderer ankommt.
  // Explizite Argumente: isSilent=false → NSIS-Setup-Dialog erscheint zuverlässig,
  // isForceRunAfter=true → App startet nach dem Update automatisch neu.
  setImmediate(() => {
    try {
      autoUpdater.quitAndInstall(false, true)
    } catch (e) {
      updaterLog('error', `quitAndInstall failed: ${e instanceof Error ? e.stack : String(e)}`)
      mainWindow?.webContents.send('update:error', `Installation konnte nicht gestartet werden: ${String(e)}`)
    }
  })
})
