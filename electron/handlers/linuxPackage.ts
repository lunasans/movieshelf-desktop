import { ipcMain } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'

const run = promisify(execFile)

/** Host der eigenen Paketquelle. Taucht er in der Quellen-Tabelle auf, kommen
 *  Aktualisierungen über `apt upgrade` und nicht über den eigenen Updater. */
export const APT_HOST = 'apt.movieshelf.info'

const PACKAGE_NAME = 'movieshelf-desktop'

/**
 * Wertet die Ausgabe von `apt-cache policy <paket>` aus.
 *
 * Verwaltet heißt: das Paket ist installiert **und** stammt aus unserer Quelle.
 * Ein von Hand mit `dpkg -i` eingespieltes Paket führt in der Tabelle nur
 * `/var/lib/dpkg/status` — dort bleibt der eigene Updater zuständig.
 *
 * Als eigene Funktion, damit sie ohne apt und ohne Electron testbar ist.
 */
export function parseAptPolicy(output: string): boolean {
  if (!output.includes(APT_HOST)) return false
  // "Installed: (none)" heißt: die Quelle ist eingerichtet, das Paket kommt
  // aber woandersher. Dann gilt es nicht als verwaltet.
  return !/^\s*Installed:\s*\(none\)\s*$/m.test(output)
}

// Das Ergebnis ändert sich während der Laufzeit nicht, der Aufruf kostet aber
// einen Prozessstart – einmal ermitteln reicht.
let cached: boolean | null = null

export async function isAptManaged(): Promise<boolean> {
  if (process.platform !== 'linux') return false
  if (cached !== null) return cached
  try {
    // execFile statt exec: kein Shell-Aufruf, nichts zu maskieren.
    const { stdout } = await run('apt-cache', ['policy', PACKAGE_NAME], { timeout: 3000 })
    cached = parseAptPolicy(stdout)
  } catch {
    // Kein apt vorhanden (AppImage, andere Distribution, Windows) – dann bleibt
    // es beim eigenen Updater. Der Fehlerfall ist hier der sichere Fall.
    cached = false
  }
  return cached
}

export function registerLinuxPackageHandlers(): void {
  ipcMain.handle('update:is-apt-managed', () => isAptManaged())
}
