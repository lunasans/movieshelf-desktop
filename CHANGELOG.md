# Changelog – MovieShelf Desktop

## [0.9.1] – 2026-05-14

### Behoben

- **Update-Download bleibt auf 0%**: `autoUpdater.quitAndInstall()` wurde aufgerufen ohne dass `downloadUpdate()` vorher ausgeführt wurde (`autoDownload = false`). Neuer IPC-Handler `update:download` ruft `checkForUpdates()` + `downloadUpdate()` in Sequenz auf; `installUpdate()` startet jetzt den Download, und ein `onReady`-Listener löst danach automatisch `quitAndInstall()` aus

---

## [0.9.0] – 2026-05-14

### Hinzugefügt

- **Serien-Import mit Staffelauswahl**: TMDb-Suche unterstützt jetzt den Modus „Serie" (Toggle Film / Serie über der Suchleiste). Beim Importieren einer Serie lädt die App die verfügbaren Staffeln von TMDb und zeigt eine Auswahl-Checkbox-Liste im Import-Modal – Staffeln 0 (Specials) werden automatisch ausgeblendet. Mit „Alle / Keine" können alle Staffeln in einem Klick selektiert werden. Nach dem Bestätigen werden alle gewählten Staffeln inkl. ihrer Folgen (Nummer, Titel, Beschreibung) direkt in die lokale Datenbank geschrieben
- **Schauspieler im Bearbeitungsformular**: Film-Bearbeiten-Ansicht zeigt jetzt eine Schauspieler-Sektion mit Avatar, Rollenname und Hauptrolle-Badge. Über „Hinzufügen" öffnet sich ein Modal mit zwei Modi:
  - *Lokal*: Debounced-Suche über alle bereits in der Datenbank vorhandenen Schauspieler
  - *TMDb*: Personensuche via `/search/person` mit Profilbild-Vorschau und automatischem Download beim Hinzufügen
  - Beide Modi erlauben die Angabe eines Rollennamen und des Hauptrolle-Flags vor dem Speichern
  - Schauspieler können per X-Button direkt aus dem Film entfernt werden

### Geändert

- `useTmdbSearch.ts`: `searchMode`-State (`'movie' | 'tv'`), normalisierter TV-Result-Shape, TV-Detail-Fetch mit `/tv/{id}?append_to_response=credits,videos,content_ratings`, Season/Episode-Import-Schleife in `confirmImport()`
- `TmdbImportModal.vue`: neues Staffelauswahl-Panel (nur wenn `collection_type === 'Serie'`), `selectedSeasons` als v-model-Prop
- `TmdbSearchView.vue`: Film/Serie Toggle-Buttons, Suchfeld-Placeholder passt sich dem Modus an

### Neu: Backend-Funktionen (`electron/handlers/actors.ts`)

| Funktion | IPC-Kanal |
|---|---|
| `searchActors(db, query)` | `db:actors:search` |
| `unlinkActor(db, filmId, actorId)` | `db:actors:unlink` |

- `upsertActor` dedupliziert jetzt nach `tmdb_id` wenn keine `remote_id` vorhanden ist (verhindert Duplikate beim manuellen TMDb-Import)

---

## [0.8.0] – 2026-05-13

### Hinzugefügt

- **Sortierung & erweiterte Filter**: Filmübersicht sortierbar nach Titel, Jahr, Bewertung, Laufzeit oder Hinzufügedatum (auf- und absteigend). Genre-Chips filtern die Liste per AND-Verknüpfung
- **Virtuelles Scrolling**: Filmgitter rendert nur sichtbare Zeilen via `@tanstack/vue-virtual` – performant auch bei 500+ Filmen im Speicher
- **Zufälliger Film (Random Picker)**: Würfel-Button öffnet Modal mit zufälligem Film aus der aktuellen Sammlung inkl. „Neu würfeln" und Direktlink zum Detail
- **Watchlist-Toggle**: Auge-Icon auf jeder Filmkarte setzt `is_watched` um. Gesehene Filme erhalten ein grünes Badge
- **Bulk-Aktionen**: Mehrfachauswahl-Modus mit Checkbox pro Karte. Floating `BulkActionBar` ermöglicht Sammel-Löschen und Tag-Vergabe für alle markierten Filme
- **Onboarding-Wizard**: Dreistufiger Einrichtungsassistent (`/onboarding`) beim ersten Start ohne TMDb-Key und leerer Sammlung. Kann übersprungen werden und erscheint nicht erneut
- **Keyboard-Navigation**: Globale Shortcuts – `/` fokussiert die Suche, `Escape` hebt den Fokus auf, `r` navigiert zur Filmübersicht. Automatisch deaktiviert wenn ein Eingabefeld fokussiert ist
- **CSV / Letterboxd-Import**: Dateiauswahl in Einstellungen → Backup. Parst Letterboxd-CSV (`Name, Year, Rating, Tags, Watched Date`), konvertiert die 0.5–5-Sterne-Skala auf 1–10, überspringt Duplikate per Titel + Jahr
- **Auto-Updater**: `electron-updater` ersetzt den bisherigen manuellen Download-Mechanismus. `autoUpdater.checkForUpdates()` / `quitAndInstall()` – CI publiziert mit `--publish always`
- **E2E-Tests (Playwright)**: `playwright.config.ts` + Shared App-Fixture + 4 Spec-Dateien (`smoke`, `movies`, `random-picker`, `import`)

### Geändert

- `listMovies()` akzeptiert nun `sortBy`, `sortDir` und `genres[]` als Parameter; SQL-Injection-Schutz via Allowlist
- `MovieCard.vue` unterstützt `bulkMode`- und `selected`-Props; Hover-Overlay zeigt zusätzlichen Watched-Toggle-Button
- `movies`-Store erweitert um `sortBy`, `sortDir`, `selectedGenres`, `bulkMode`, `selectedIds` sowie die Actions `toggleMovieWatched`, `bulkDeleteSelected`, `bulkTagSelected`, `toggleSelect`
- `electron/main.ts`: Alter manueller Update-Download (~110 Zeilen) durch 10 Zeilen `electron-updater`-Wiring ersetzt
- `release.yml`: Build-Jobs verwenden `--publish always` damit `latest.yml` in den GitHub-Release kommt
- `package.json`: `publish`-Konfiguration für GitHub-Releases ergänzt, Version auf `0.8.0` gesetzt

### Neu: Backend-Funktionen (`electron/handlers/movies.ts`)

| Funktion | IPC-Kanal |
|---|---|
| `randomMovie(db, filters?)` | `db:movies:random` |
| `toggleWatched(db, id)` | `db:movies:toggle-watched` |
| `bulkDelete(db, ids[])` | `db:movies:bulk-delete` |
| `bulkUpdateTag(db, ids[], tag)` | `db:movies:bulk-tag` |
| `importMovies(db, rows[])` | `db:movies:import` |

### Tests

92 → **111 Unit Tests** (+19). Abdeckung der neuen Backend-Funktionen: Sortierung, Genres-Filter, Random Picker, Toggle Watched, Bulk Delete/Tag, Import inkl. Duplikat- und Leer-Titel-Behandlung.

---

## [0.7.1] – 2026-05-10

### Behoben
- **Icons nicht sichtbar**: Bootstrap Icons wurden durch Tailwind 4's PostCSS-Pipeline falsch verarbeitet (Font-Pfade nicht aufgelöst). Import wurde nach `main.ts` verschoben, wo Vite die Assets korrekt verarbeitet

---

## [0.7.0] – 2026-05-10

### Geändert
- **Major-Dependency-Upgrade**: Komplettes Toolchain-Update auf aktuelle Major-Versionen
  - Tailwind CSS 3 → 4 (neue CSS-Import-Syntax, `@theme`-Block, `@reference` in Scoped-Styles)
  - Vite 5 → 7 (Vite 8 noch inkompatibel mit `vite-plugin-electron`)
  - TypeScript 5 → 6 (`baseUrl` entfernt, `paths` mit relativen Pfaden)
  - Vue Router 4 → 5
  - Pinia 2 → 3
  - Electron 41 → 42
  - `@electron/rebuild` 3 → 4
  - `vitest` 2 → 4, `vue-tsc` 2 → 3, `@vitejs/plugin-vue` 5 → 6

---

## [0.6.6] – 2026-05-10

### Hinzugefügt
- **Handler Unit Tests**: Vitest-Testsuite für alle IPC-Handler-Pure-Functions (32 Tests)
  - `electron/handlers/movies.ts`, `actors.ts`, `sync.ts` als testbare Pure Functions extrahiert
  - GitHub Actions: Test-Job läuft vor den Build-Jobs
- **Codebase-Refactoring**: SyncView und TmdbSearchView in Sub-Komponenten und Composables aufgeteilt

### Behoben
- Fehlende Default-Werte für Named Parameters in `createMovie` (RangeError bei optionalen Feldern)
- `is_deleted` aus `ALLOWED_MOVIE_COLUMNS` entfernt (kein Soft-Delete über `updateMovie` möglich)

---

## [0.6.5] – 2026-05-09

### Geändert
- **TMDb-Import immer lokal**: Filme werden beim Import über TMDb immer zuerst lokal in der Datenbank angelegt – auch im Online-Modus. Auf die Shelf gelangen sie erst beim nächsten Sync

---

## [0.6.4] – 2026-05-09

### Hinzugefügt
- **„Hinzugefügt am" im Bearbeitungsformular**: Das Hinzufügedatum kann jetzt direkt im Film-Formular eingesehen und geändert werden (beim Bearbeiten vorbelegt, beim Neuanlegen mit dem heutigen Datum)

---

## [0.6.3] – 2026-05-09

### Behoben
- **Filme nach Vollsync doppelt/dreifach**: Wenn ein Film vor dem Sync mehrfach lokal angelegt wurde (z. B. weil er in der Sammlung nicht sichtbar war), wurden beim Sync nur zwei der Duplikate zusammengeführt – die übrigen blieben erhalten. Jetzt werden beim Merge alle Duplikate mit gleicher TMDb-ID hart gelöscht
- **Cover nach Vollsync nicht sichtbar**: `movie-resource://`-Pfade wurden in Schritt 1 von `resolveMediaUrl` fälschlicherweise mit der Shelf-URL zusammengesetzt – lokale Bilder wurden nie geladen

---

## [0.6.2] – 2026-05-09

### Behoben
- **Bilder werden lokal gespeichert**: Cover und Backdrop werden beim TMDb-Import einmalig heruntergeladen und lokal abgelegt (`movie-resource://`) – kein TMDb-Traffic mehr beim Öffnen der App
- **Sync speichert Bilder lokal**: Beim Shelf-Sync werden Cover und Backdrop von der Shelf heruntergeladen; `cover_path` / `backdrop_path` werden anschließend auf den lokalen Pfad umgeschrieben – die App lädt Bilder danach nicht mehr vom Server

### Hinzugefügt
- **Hinzufügedatum im Import-Modal**: Das Datum kann vor dem Import angepasst werden (Standard: heute)

### Behoben
- **Import-Modal leer bei Online-Modus**: TMDb-Details (Genre, Regisseur, Laufzeit etc.) wurden im Online-Modus nicht geladen – der Detail-Fetch ist jetzt immer aktiv wenn ein TMDb-Key vorhanden ist
- **Nicht alle Filme im Vollbild sichtbar**: Im Vollbild wurden zu viele Spalten angezeigt, sodass 30 Filme den Viewport füllten ohne Scroll auszulösen – Infinite Scroll lädt jetzt automatisch nach bis der Viewport gefüllt ist

---

## [0.6.0] – 2026-05-09

### Hinzugefügt
- **Bearbeiten vor Import**: Beim Hinzufügen eines Films über die TMDb-Suche öffnet sich jetzt ein Modal mit allen vorausgefüllten Daten (Titel, Jahr, Typ, Genre, Regisseur, Laufzeit, Bewertung, FSK, Beschreibung, Trailer-URL, Format-Tag) – Änderungen können vor dem Speichern vorgenommen werden

### Behoben
- **Film erscheint nicht in Sammlung**: Nach dem Hinzufügen eines Films (manuell oder via TMDb) wurde der gespeicherte Listen-Cache nicht geleert – der neue Film war erst nach einem Neustart der App sichtbar
- **Bewertung mit drei Dezimalstellen**: TMDb-Bewertungen (z. B. `7.456`) werden jetzt auf eine Stelle gerundet angezeigt, sowohl in der Detailansicht als auch im Bearbeitungsformular

---

## [0.4.0] – 2026-04-26

### Hinzugefügt
- **Serien-Tab**: Eigener Reiter „Serien" in der Sidebar filtert nach `collection_type = Serie`; Wechsel zwischen Filme und Serien stellt Scroll-Position und geladene Seiten wieder her
- **Staffeln & Folgen**: Serien-Detailansicht zeigt Staffeln als ausklappbare Akkordeons mit Folgenliste (Nummer, Titel, Beschreibung); erste Staffel ist standardmäßig geöffnet
- **Backup-Funktion**: Lokale Sammlung als `.ms`-Datei exportieren und wiederherstellen (Einstellungen → Backup); Format ist kompatibel mit dem SaaS-Backup

### Behoben
- **Filmanzahl falsch**: Boxset-Parents werden aus Liste und Zähler ausgeschlossen; Boxset-Children werden korrekt gezählt
- **Nur 30 Filme nach Tab-Wechsel**: Beim Wechsel zwischen Filme/Serien werden alle zuvor geladenen Seiten wiederhergestellt statt neu von Seite 1 zu laden
- **Gelöschte Einträge im Sync**: Beim vollständigen Sync werden Filme, die auf dem Shelf gelöscht wurden, jetzt lokal entfernt und korrekt im Ergebnis gezählt
- **Push 404 nach Löschung**: Wenn der Shelf einen Film als gelöscht meldet, wird er lokal sofort hard-deleted und erscheint nicht mehr im Push-Queue; 404-Antworten beim Push von Löschungen werden als Erfolg gewertet
- **Staffeln nicht angezeigt**: API-Response-Parsing korrigiert (`data`-Wrapper); Online-Fallback lädt Staffeln direkt von der API wenn lokal keine vorhanden sind und speichert sie für Offline-Nutzung

### Sync-Verbesserungen
- Delta-Sync zeigt gelöschte Einträge korrekt in der Vorschau an
- Full-Sync erkennt lokale Filme ohne SaaS-Gegenstück und entfernt sie
- Staffeln und Folgen werden beim Sync für Serien automatisch mitgeladen

---

## [0.3.5] – 2026-04-25

### Behoben
- **Windows: Update-Installation**: Installer wird jetzt per `spawn` gestartet statt `shell.openPath` – der NSIS-Setup-Dialog erscheint zuverlässig
- **Update-URL leer**: Fehlermeldung statt lautlosem Abbruch wenn keine Download-URL verfügbar
- **Release-Pipeline**: SHA256-Hashes werden berechnet und mit dem Webhook übertragen; nur noch NSIS-Installer (kein Portable) wird gebaut und verlinkt

---

## [0.3.4] – 2026-04-25

### Behoben
- **Filmanzahl Dashboard / Synchronisation**: Beide Ansichten zählen jetzt identisch – Boxset-Children werden gezählt (sind Filme), Boxset-Parents nicht (sind nur Behälter)
- **Linux: Update-Installation**: `pkexec dpkg -i` öffnet nativen GUI-Passwort-Dialog; Fallback auf `xdg-open` (GDebi), danach Anleitung-Dialog mit Terminal-Befehl
- **Linux: weißes Update-Fenster**: Hauptfenster wird erst nach vollständigem Rendern angezeigt (`ready-to-show`)


---

## [0.3.3] – 2026-04-25

### Behoben
- **Fenster verschieben**: Hauptfenster lässt sich wieder per Titelleiste verschieben (Drag-Region war auf Windows/Linux nicht korrekt gesetzt)
- **Scroll-Position**: Nach dem Bearbeiten eines Films kehrt die Filmliste zur vorherigen Scroll-Position zurück, statt nach oben zu springen
- **Boxsets in der Filmliste**: Box-Set-Teile (Children) erscheinen nicht mehr separat in der Hauptliste; stattdessen zeigt das Box-Set-Parent ein „Box-Set"-Badge und die enthaltenen Filme werden in der Detailansicht unter „Enthaltene Filme" aufgelistet
- **Linux: weißes Login-Fenster**: OAuth-Fenster blieb auf Linux weiß; wird jetzt erst nach vollständigem Rendern angezeigt (`ready-to-show`)
- **Linux: App-Icon fehlt nach Installation**: Icon-Quelle auf `icon.png` (1024×1024) umgestellt; `category: AudioVideo` für korrekte Launcher-Integration ergänzt

### Build
- `build-linux.sh` erstellt jetzt ausschließlich das `.deb`-Paket
- Icon-Konfiguration für alle Plattformen vereinheitlicht (`icon.png`)

---

## [0.3.2] – 2026-04-14

### Hinzugefügt
- Play-Button durch Cover-Bild ersetzt für einheitlicheres Erscheinungsbild
- Anpassung der Play-Overlay-Deckkraft für bessere Sichtbarkeit auf Film-Karten
- `AdminMovieController` für Film-CRUD, Bild-Uploads und Datenexporte
- Movie-Model mit dynamischer Bildauflösung

### Behoben
- Code-Struktur für bessere Lesbarkeit und Wartbarkeit refaktoriert
