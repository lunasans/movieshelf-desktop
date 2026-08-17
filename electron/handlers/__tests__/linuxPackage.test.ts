import { describe, it, expect } from 'vitest'
import { parseAptPolicy } from '../linuxPackage'

describe('parseAptPolicy', () => {
  it('erkennt eine Installation aus der eigenen Paketquelle', () => {
    const output = `movieshelf-desktop:
  Installed: 1.1.2
  Candidate: 1.1.3
  Version table:
     1.1.3 500
        500 https://apt.movieshelf.info stable/main amd64 Packages
 *** 1.1.2 100
        100 /var/lib/dpkg/status
`
    expect(parseAptPolicy(output)).toBe(true)
  })

  it('erkennt ein von Hand eingespieltes Paket', () => {
    // Genau der Fall "dpkg -i" oder "apt install ./datei.deb": das Paket ist da,
    // aber keine Quelle liefert Nachschub — der eigene Updater bleibt zuständig.
    const output = `movieshelf-desktop:
  Installed: 1.1.2
  Candidate: 1.1.2
  Version table:
 *** 1.1.2 100
        100 /var/lib/dpkg/status
`
    expect(parseAptPolicy(output)).toBe(false)
  })

  it('gilt nicht als verwaltet, solange das Paket nicht installiert ist', () => {
    // Quelle eingerichtet, App aber woandersher (AppImage, Handinstallation
    // unter anderem Namen). Sonst würde die App auf apt verweisen, und ein
    // "apt install --only-upgrade" liefe dort ins Leere.
    const output = `movieshelf-desktop:
  Installed: (none)
  Candidate: 1.1.3
  Version table:
     1.1.3 500
        500 https://apt.movieshelf.info stable/main amd64 Packages
`
    expect(parseAptPolicy(output)).toBe(false)
  })

  it('meldet nichts bei unbekanntem Paket', () => {
    expect(parseAptPolicy('N: Unable to locate package movieshelf-desktop')).toBe(false)
  })
})
