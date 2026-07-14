import { ipcMain, BrowserWindow, shell } from 'electron'
import { getDb } from '../database'
import { tMain } from '../i18n'

export function registerOAuthHandlers() {
  let oauthWindow: BrowserWindow | null = null

  ipcMain.handle('oauth:open-browser', async (event, url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return
    } catch { return }

    // Fenster merken, das den Login angestoßen hat – der Callback muss dorthin
    // zurück, nicht in ein beliebiges anderes Fenster (Trailer-/Stats-Popup).
    const requester = BrowserWindow.fromWebContents(event.sender)

    if (oauthWindow && !oauthWindow.isDestroyed()) {
      oauthWindow.close()
    }

    oauthWindow = new BrowserWindow({
      width: 520,
      height: 700,
      title: tMain(getDb(), 'oauthWindowTitle'),
      autoHideMenuBar: true,
      show: false,
      backgroundColor: '#ffffff',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    oauthWindow.once('ready-to-show', () => oauthWindow?.show())

    // Popups aus dem Login-Fenster nicht privilegiert öffnen, sondern extern.
    oauthWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
      if (openUrl.startsWith('https://') || openUrl.startsWith('http://')) shell.openExternal(openUrl)
      return { action: 'deny' }
    })

    oauthWindow.loadURL(url)

    // HTTP-302-Redirect vom Server auf movieshelf:// abfangen
    oauthWindow.webContents.on('will-redirect', (_e, redirectUrl) => {
      if (!redirectUrl.startsWith('movieshelf://oauth/callback')) return
      try {
        const cb      = new URL(redirectUrl)
        const code    = cb.searchParams.get('code')
        const state   = cb.searchParams.get('state')
        const target  = requester && !requester.isDestroyed()
          ? requester
          : BrowserWindow.getAllWindows().find(w => w !== oauthWindow)
        if (code && target) {
          target.webContents.send('oauth:callback', { code, state })
        }
      } catch { /* ignore */ }
      oauthWindow?.close()
      oauthWindow = null
    })

    oauthWindow.on('closed', () => { oauthWindow = null })
  })
}
