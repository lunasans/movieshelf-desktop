# MovieShelf Desktop

Filmsammlung lokal verwalten – und optional mit deiner MovieShelf-Instanz synchronisieren.

Eine Desktop-App für alle, die ihre physische DVD-/Blu-ray-Sammlung im Blick behalten wollen: Filme und Serien erfassen, Metadaten und Cover automatisch von TMDb ziehen, nach Regalstandort und Zustand sortieren, Listen bauen und auswerten.

[![Website](https://img.shields.io/badge/Website-movieshelf.info-blue)](https://movieshelf.info)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-yellow)](https://buymeacoffee.com/adminzdr)

---

## Zwei Betriebsarten

MovieShelf läuft wahlweise komplett offline oder angebunden an eine MovieShelf-Web-Instanz. Die Wahl triffst du beim ersten Start und kannst sie jederzeit in den Einstellungen ändern.

| | **Standalone** | **Online** |
|---|---|---|
| Datenhaltung | lokale SQLite-Datei | MovieShelf-Web-API |
| Internet nötig | nur für TMDb und Cover | ja |
| Sync | – | manuell unter `/sync`, mit Konfliktauflösung |

Im Standalone-Modus verlassen deine Daten den Rechner nicht. Die Datenbank liegt als einzelne Datei unter dem Benutzerdatenverzeichnis und lässt sich per Backup als `.ms`-Archiv (Datenbank plus Cover) exportieren und wieder einspielen.

## Funktionen

- **Filme und Serien** mit Cover, Backdrop, Laufzeit, Genres, Bewertung und Trailer
- **Serien-Details** – Staffeln und Episoden
- **Boxsets** – Sammlungen mit untergeordneten Filmen abbilden
- **TMDb-Import** – suchen, Formular vorbefüllen lassen, Bilder herunterladen
- **Jellyfin-Import** – Bibliotheken vom eigenen Jellyfin-Server übernehmen, samt Staffeln, Episoden, Covern, Besetzung, Trailern und Gesehen-Status; auf Wunsch mit TMDb abgeglichen
- **Schauspieler** mit Rollen, Hauptrollen-Kennzeichnung und eigener Detailseite
- **Physische Sammlung** – Edition, Regalstandort, Kaufdatum und Zustand
- **Listen** – eigene Zusammenstellungen quer durch die Sammlung
- **Statistiken** – Genres, Laufzeit-Verteilung, häufigste Schauspieler, Jahre; auch als eigenes Fenster
- **Zufallsauswahl**, wenn du dich nicht entscheiden kannst
- **Massenbearbeitung** mehrerer Titel auf einmal
- **Hell/Dunkel/System**-Design, Deutsch und Englisch
- **Automatische Updates** mit Signaturprüfung

## Installation

### Windows

Über winget:

```powershell
winget install Lunasans.MovieShelf
```

Oder den signierten Installer aus den [Releases](https://github.com/lunasans/movieshelf-desktop/releases) laden.

### Linux

Das `.deb`-Paket aus den [Releases](https://github.com/lunasans/movieshelf-desktop/releases):

```bash
sudo dpkg -i movieshelf-desktop_*_amd64.deb
```

Ein Flatpak-Manifest liegt unter [`flatpak/info.movieshelf.desktop.yml`](flatpak/info.movieshelf.desktop.yml).

## Entwicklung

Vorausgesetzt sind Node.js 22 und npm.

```bash
git clone https://github.com/lunasans/movieshelf-desktop.git
cd movieshelf-desktop
npm install
npm run dev
```

`npm run dev` startet nur den Vite-Dev-Server für das Renderer-Frontend, ohne Electron-Shell.

### Weitere Befehle

| Befehl | Zweck |
|---|---|
| `npm run build` | Typprüfung und Produktions-Build |
| `npm run electron:build` | Installer für die aktuelle Plattform bauen |
| `npm test` | Unit-Tests der IPC-Handler (vitest) |
| `npm run test:e2e` | End-to-End-Tests (Playwright, benötigt gebaute App) |

Läuft `npm test` mit einem `NODE_MODULE_VERSION`-Fehler auf, wurde `better-sqlite3` zuletzt gegen Electron gebaut. `npm rebuild better-sqlite3` stellt die Node-Variante wieder her.

### Aufbau

Electron 41 mit Vue 3, TypeScript, Vite, Pinia, Tailwind CSS und better-sqlite3.

```
electron/
  main.ts          Fenster, Protokolle, Auto-Updater
  preload.ts       window.electron – die einzige Brücke zum Renderer
  database.ts      SQLite-Schema und Migrationen
  handlers/        IPC-Handler je Domäne
src/
  views/           Seiten
  components/      nach Domäne gegliedert
  stores/          Pinia
  composables/     API-Client, TMDb-Suche, Sync-Engine
```

Renderer und Hauptprozess reden ausschließlich über die in `preload.ts` freigegebene Oberfläche miteinander. Eine neue Fähigkeit beginnt immer dort.

## Konfiguration

Für den TMDb-Import brauchst du einen eigenen API-Schlüssel von [themoviedb.org](https://www.themoviedb.org/settings/api); eingetragen wird er in den Einstellungen. Für den Online-Modus kommen die URL deiner MovieShelf-Instanz und ein Zugriffstoken dazu.

Der Jellyfin-Import fragt nach Server-Adresse, Benutzername und Passwort; die Anmeldung wird als Token verschlüsselt abgelegt. Im Online-Modus schreibt er in die lokale Datenbank – die übernommenen Titel erscheinen in der Sammlung erst nach einem Abgleich unter `/sync`.

## Mitmachen

Fehlerberichte und Vorschläge sind willkommen – bitte über die [Issues](https://github.com/lunasans/movieshelf-desktop/issues). Sicherheitslücken bitte nicht öffentlich melden, sondern wie in [SECURITY.md](SECURITY.md) beschrieben.

## Unterstützen

MovieShelf Desktop ist kostenlos und quelloffen. Wer die Weiterentwicklung unterstützen möchte, kann das über [Buy Me a Coffee](https://buymeacoffee.com/adminzdr) tun – der Link findet sich auch in der App unter *Einstellungen → Info*.

## Lizenz

[MIT](LICENSE) – Rene Neuhaus
