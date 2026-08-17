# Plan: Linux-Auslieferung über APT-Quelle und Flathub

Stand: 17.08.2026. Ausgangslage: Der Release-Workflow baut ein `.deb`, hängt es
ans GitHub-Release und meldet es an movieshelf.info. Aktualisiert wird aus der
App heraus über einen eigenen Updater — der scheitert je nach Desktop an der
Rechteabfrage (siehe #125). Beide Wege unten nehmen dem Updater diese Aufgabe ab.

---

> **Stand 17.08.2026:** Teil A ist in `packaging/apt/` umgesetzt — allerdings in
> anderer Bauform als unten geplant. SSH erreicht den Server nur über VPN und
> der Site-Benutzer hat kein sudo, also fällt der Weg „Actions schiebt hin" aus:
> Der Server **holt** sich das Release per Cron-Job, alles läuft unter `$HOME`.
> Die Schritte A1–A4 unten sind damit überholt, A5 (Erkennung in der App) ist
> gebaut. Maßgeblich ist [packaging/apt/README.md](../packaging/apt/README.md).

## Teil A — Eigene APT-Quelle (`apt.movieshelf.info`)

Ziel: `sudo apt install movieshelf-desktop`, danach kommen Updates über
`apt upgrade` wie bei jedem anderen Paket. Kein Rechte-Dialog aus der App heraus.

### A1. Signaturschlüssel
- [ ] GPG-Schlüsselpaar erzeugen (RSA 4096, ohne Ablaufdatum oder mit 5 Jahren),
      ausschließlich zum Signieren der Paketquelle
- [ ] Privaten Schlüssel als GitHub-Secret `APT_GPG_PRIVATE_KEY` hinterlegen,
      Passphrase als `APT_GPG_PASSPHRASE`
- [ ] Öffentlichen Schlüssel als `movieshelf.gpg` (dearmored) auf dem Server
      ablegen — Nutzer legen ihn nach `/etc/apt/keyrings/`

### A2. Repository-Struktur auf dem Server
Hetzner 162.55.214.77, Auslieferung über movieshelf.info (Cloudflare davor —
statische Dateien, Caching ist erwünscht; `InRelease` mit kurzer TTL).

- [ ] Verzeichnis `/var/www/apt.movieshelf.info/` anlegen, per nginx ausliefern
- [ ] Subdomain `apt.movieshelf.info` in Cloudflare anlegen
- [ ] Aufbau flach halten (`aptly` mit einer Distribution `stable`,
      Komponente `main`, Architektur `amd64`)

### A3. Veröffentlichung aus dem Release-Workflow
- [ ] Neuer Job `apt` in `release.yml`, hängt an `build-linux`
- [ ] Läuft nur bei regulären Tags (kein `-linux`/`-win`), analog zum
      winget-Job — Testpakete gehören nicht in die Quelle
- [ ] Schritte: Artefakt laden → GPG-Schlüssel importieren → `aptly repo add`
      → `aptly publish update` → per rsync/SSH auf den Server
- [ ] SSH-Deploy-Key als Secret `APT_DEPLOY_KEY`

### A4. Dokumentation
- [ ] README und movieshelf.info: Einrichtungsblock

      ```bash
      curl -fsSL https://apt.movieshelf.info/movieshelf.gpg | sudo tee /etc/apt/keyrings/movieshelf.gpg > /dev/null
      echo "deb [signed-by=/etc/apt/keyrings/movieshelf.gpg] https://apt.movieshelf.info stable main" | sudo tee /etc/apt/sources.list.d/movieshelf.list
      sudo apt update && sudo apt install movieshelf-desktop
      ```

### A5. Updater anpassen
- [ ] Erkennen, ob die Installation aus der Paketquelle stammt
      (`apt-cache policy movieshelf-desktop` nennt dann `apt.movieshelf.info`)
- [ ] In dem Fall keinen Download anbieten, sondern auf `apt upgrade` verweisen —
      sonst konkurrieren zwei Update-Wege um dieselbe Installation

**Aufwand:** ein Arbeitstag, davon die Hälfte Server und Schlüssel.
**Risiko:** gering, unabhängig von Dritten. Der Schlüssel muss sicher liegen —
geht er verloren, müssen alle Nutzer die Quelle neu einrichten.

---

## Teil B — Flathub

Ziel: Sichtbarkeit in GNOME Software und KDE Discover, Updates über die
Software-Verwaltung des Systems.

### B1. Lokal bauen
- [ ] `"flatpak"` als zusätzliches Ziel unter `build.linux.target` in
      `package.json`
- [ ] Probebau, App im Sandkasten starten

### B2. Sandbox-Berechtigungen klären (der eigentliche Knackpunkt)
- [ ] `--share=network` für Shelf-Abgleich, TMDb und den Jellyfin-Server im LAN
- [ ] `--filesystem=home` oder gezielter für Backup-Export/-Import (`.ms`-Dateien)
- [ ] Prüfen, was der Trailer-Player und `movie-resource://` im Sandkasten brauchen
- [ ] Autostart im Sandkasten läuft über das XDG-Background-Portal, nicht über
      `~/.config/autostart` — der Schalter braucht dort einen eigenen Weg
- [ ] In-App-Updater im Flatpak abschalten: Aktualisierung macht Flatpak selbst

### B3. AppStream-Metadaten
- [ ] `info.movieshelf.desktop.metainfo.xml`: Beschreibung, Kategorien,
      Bildschirmfotos (Flathub verlangt mindestens eines), Lizenz
- [ ] `<releases>`-Abschnitt je Version — lässt sich aus CHANGELOG.en.md erzeugen,
      ähnlich wie `packaging/winget/release-notes.py`

### B4. Einreichung
- [ ] Manifest `info.movieshelf.desktop.yml` (Quelle: das gebaute `.deb` oder ein
      tar.gz mit fester SHA256)
- [ ] PR gegen `flathub/flathub`, Review abwarten (erfahrungsgemäß Tage bis Wochen)
- [ ] Nach Aufnahme: Aktualisierung je Release über einen PR im eigenen
      Flathub-Repository — automatisierbar, aber erst nach der Aufnahme

**Aufwand:** zwei bis drei Tage, plus Wartezeit im Review.
**Risiko:** mittel. Die Sandbox-Fragen (Jellyfin im LAN, Backup-Dateien,
Autostart) sind echte Änderungen an der App, kein reines Verpacken.

---

## Reihenfolge

1. **Teil A zuerst.** Nutzt allen, die heute schon das `.deb` haben, hängt von
   niemandem ab und macht den fragilen In-App-Updater unter Linux überflüssig.
2. **Teil B danach**, wenn Sichtbarkeit das Ziel ist. Vorher B2 klären — wenn
   der Jellyfin-Import oder das Backup im Sandkasten nicht sauber laufen, ist
   Flathub eher Schaden als Nutzen.

## Offen / zu entscheiden

- Soll die APT-Quelle auch die Testpakete (`-linux`) führen, etwa als eigene
  Distribution `testing`? Dann könntest du Tests künftig per `apt` einspielen
  statt per `wget` + `dpkg`.
- Snap zusätzlich? Gleicher Nutzen wie Flathub, weniger Review-Hürden, aber
  ein weiterer Kanal, den jemand pflegen muss.
