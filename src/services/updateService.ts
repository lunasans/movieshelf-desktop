import axios from 'axios'
import { useSettingsStore } from '@/stores/settings'

const CHANGELOG_URL = 'https://raw.githubusercontent.com/lunasans/movieshelf-desktop/main/CHANGELOG.md'

export function useUpdateService() {
  const settings = useSettingsStore()

  const UPDATE_URL = 'https://movieshelf.info/api/desktop-version'

  async function checkForUpdates() {
    try {
      const platform = navigator.platform.toLowerCase().includes('linux') ? 'linux' : 'win'

      // Die Abfrage selbst ist technisch nötig und wird nicht gezählt. Nur
      // wer die Zählung eingeschaltet hat, schickt zusätzlich eine Kennung —
      // ohne sie hält die Shelf nichts fest. Die Version fährt im selben
      // Zug mit, sonst wäre nur die Anzahl bekannt und nicht, welche Ausgaben
      // überhaupt noch draußen sind.
      const parameter = new URLSearchParams({ platform })
      if (settings.statsEnabled && settings.statsInstallId) {
        parameter.set('stats', settings.statsInstallId)
        parameter.set('version', settings.appVersion)
      }

      const response = await axios.get(`${UPDATE_URL}?${parameter}`)
      const raw = response.data
      const remoteVersion = (raw.version as string).replace(/^v/, '')
      const { url, sha256, manual } = raw

      settings.newestVersion = remoteVersion
      settings.updateUrl     = url
        ? (url.startsWith('http') ? url : `https://movieshelf.info${url.startsWith('/') ? '' : '/'}${url}`)
        : ''
      settings.updateSha256  = sha256 ?? ''
      settings.updateManual  = manual === true

      if (remoteVersion !== settings.appVersion) {
        settings.updateAvailable = compareVersions(remoteVersion, settings.appVersion) > 0
      } else {
        settings.updateAvailable = false
      }

      if (settings.updateAvailable) {
        settings.updateChangelog = await fetchChangelog(remoteVersion)
      }

      // Tray spiegelt den Status: gepunktetes Icon, Tooltip und Menue-Eintrag
      // sind auch sichtbar, wenn das Fenster geschlossen im Tray liegt.
      notifyTray(settings.updateAvailable ? remoteVersion : null)

      return settings.updateAvailable
    } catch (error) {
      console.error('Update-Check fehlgeschlagen:', error)
      return false
    }
  }

  // Das Stats-Popup läuft im selben Renderer-Bundle, hat aber kein Tray —
  // der Aufruf ist trotzdem harmlos. Fehler hier duerfen den Check nicht kippen.
  function notifyTray(version: string | null) {
    window.electron?.tray?.setUpdate(version).catch(() => { /* Tray-Update ist optional */ })
  }

  async function fetchChangelog(version: string): Promise<string> {
    try {
      const { data } = await axios.get(CHANGELOG_URL)
      return extractVersionSection(data, version)
    } catch {
      return ''
    }
  }

  function extractVersionSection(markdown: string, version: string): string {
    const lines = markdown.split('\n').map(l => l.replace(/\r$/, ''))
    const startPattern = new RegExp(`^##\\s+\\[${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`)
    let inSection = false
    const result: string[] = []

    for (const line of lines) {
      if (startPattern.test(line)) {
        inSection = true
        continue // skip the version headline itself
      }
      if (inSection) {
        if (/^##\s+\[/.test(line)) break // next version starts
        result.push(line)
      }
    }

    // Trim leading/trailing blank lines
    while (result.length && !result[0].trim()) result.shift()
    while (result.length && !result[result.length - 1].trim()) result.pop()
    return result.join('\n')
  }

  /**
   * Vergleicht zwei Versionen. Ein Zusatz hinter dem Bindestrich (`1.1.1-linux`,
   * Testpakete) gilt als Vorabversion und damit als älter als dieselbe Nummer
   * ohne Zusatz. Ohne die Trennung wäre `Number('1-linux')` gleich `NaN`, jeder
   * Vergleich damit `false` — und die App meldete "aktuell", obwohl es ein
   * Update gab.
   */
  function compareVersions(v1: string, v2: string) {
    const parse = (version: string) => {
      const [core, pre] = version.split('-')
      const numbers = core.split('.').map(n => parseInt(n, 10) || 0)
      return { numbers, isPrerelease: !!pre }
    }
    const a = parse(v1)
    const b = parse(v2)

    for (let i = 0; i < 3; i++) {
      const left  = a.numbers[i] ?? 0
      const right = b.numbers[i] ?? 0
      if (left > right) return 1
      if (left < right) return -1
    }

    if (a.isPrerelease === b.isPrerelease) return 0
    return a.isPrerelease ? -1 : 1
  }

  return { checkForUpdates }
}
