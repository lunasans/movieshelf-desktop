# Jellyfin-Anbindung (Import lokaler Bibliotheken)

Ziel: Filme und Serien aus einem lokalen Jellyfin-Server per Ein-Klick-Vollimport
in die lokale Sammlung uebernehmen. Auth per Benutzer/Passwort, Watched-Status
uebernehmen, bereits vorhandene Titel ueberspringen.

## Entscheidungen

- Auth: `POST /Users/AuthenticateByName` -> AccessToken + UserId, beides gespeichert.
- Import: Ein-Klick-Vollimport ueber ausgewaehlte Bibliotheken, mit Fortschritt.
- Duplikate: Match ueber `tmdb_id` (aus `ProviderIds.Tmdb`), sonst `title` + `year`
  (case-insensitiv). Treffer -> ueberspringen, nichts anfassen.
- Bilder: Primary + Backdrop von Jellyfin herunterladen (eigener Host-Allowlist-Pfad,
  `media:download` bleibt auf den Shelf-Host beschraenkt).
- Importierte Filme sind zunaechst lokal (kein `remote_id`); im Online-Modus wandern
  sie beim naechsten Push regulaer auf die Shelf.

## Schritte

### 1. Settings
- [ ] `ALLOWED_SETTINGS_KEYS` erweitern: `jellyfin_url`, `jellyfin_user`,
      `jellyfin_token`, `jellyfin_user_id`, `jellyfin_device_id`, `jellyfin_libraries`,
      `jellyfin_last_import_at`
- [ ] `jellyfin_token` in `SENSITIVE_KEYS` (safeStorage-Verschluesselung)

### 2. Main-Prozess: `electron/handlers/jellyfin.ts`
- [ ] `jellyfin:login` (URL + User + Passwort -> Token/UserId, speichert in settings)
- [ ] `jellyfin:test` (`/System/Info/Public`, Erreichbarkeit + Servername)
- [ ] `jellyfin:libraries` (`/Users/{userId}/Views`, nur `movies`/`tvshows`)
- [ ] `jellyfin:items` (`/Users/{userId}/Items` mit `Recursive`, `IncludeItemTypes`,
      `Fields=Genres,Overview,ProviderIds,People,RunTimeTicks,OfficialRating`,
      seitenweise via `StartIndex`/`Limit`)
- [ ] `jellyfin:series` (`/Shows/{id}/Seasons` + `/Shows/{id}/Episodes`)
- [ ] `jellyfin:image` (Download `/Items/{id}/Images/{Primary|Backdrop}` in `covers/`,
      Host muss der konfigurierten Jellyfin-URL entsprechen, gleiches Groessenlimit
      wie `media:download`)
- [ ] `mediaFileName` + `COVERS_DIR` aus `media.ts` exportieren und wiederverwenden
- [ ] Registrierung in `electron/main.ts`

### 3. Mapping (pure, testbar)
- [ ] `mapJellyfinItem()`: Name->title, ProductionYear->year, Genres.join(', '),
      People(Type=Director)->director, RunTimeTicks/600_000_000->runtime,
      CommunityRating->rating, OfficialRating->rating_age (FSK-Zahl parsen),
      Overview->overview, ProviderIds.Tmdb->tmdb_id, Type Movie/Series->
      collection_type Film/Serie, UserData.Played->is_watched, tag='Digital'
- [ ] `isDuplicate()`: tmdb_id-Treffer, sonst title+year normalisiert

### 4. Bridge
- [ ] `preload.ts`: Namespace `jellyfin` mit login/test/libraries/items/series/image
- [ ] `src/electron.d.ts` synchron halten

### 5. Renderer
- [ ] `src/composables/useJellyfinImport.ts`: Orchestrierung (Bibliotheken durchlaufen,
      Duplikatpruefung, `db.movies.create`, Bilder, Serien -> seasons/episodes upserten),
      reaktiver Fortschritt + Ergebnis (importiert / uebersprungen / Fehler)
- [ ] `src/views/JellyfinView.vue`: Verbindungsstatus, Bibliotheksauswahl,
      Button "Import starten", Fortschrittsbalken, Ergebnis-Zusammenfassung
- [ ] Route `/jellyfin` + Sidebar-Eintrag
- [ ] Jellyfin-Zugangsdaten-Block in `SettingsView.vue` (URL, Benutzer, Passwort,
      "Verbindung testen")

### 6. Verifikation
- [ ] `electron/handlers/__tests__/jellyfin.test.ts`: Mapping, Runtime-Umrechnung,
      FSK-Parsing, Duplikaterkennung, Host-Allowlist
- [ ] `npm test`, `npm run build`
- [ ] Manuell gegen echten Jellyfin-Server: Import, erneuter Import (alles uebersprungen)

### 7. Release-Vorbereitung
- [ ] Version auf 0.25.0, CHANGELOG-Abschnitt, PR (kein Tag ohne Release-Signal)
- [ ] CLAUDE.md: Handler-Tabelle + Settings-Keys ergaenzen

## Review

Umgesetzt (2026-08-06):

- `electron/handlers/jellyfin.ts` – Login (`AuthenticateByName`), Bibliotheken,
  Voll-Import, Serien-Staffeln, Bild-Download. Der Import laeuft komplett im
  Main-Prozess und nutzt `createMovie`/`upsertSeason`/`upsertEpisode` direkt;
  der Renderer startet ihn nur und zeigt den Fortschritt (`jellyfin:progress`).
- Bilder liegen unter `jellyfin_<id>.jpg` – eigener Namensraum, damit die per
  Sync geladenen `<remote_id>.jpg` nicht kollidieren.
- `tag = 'Streaming'`, `remote_id` bleibt leer: die Titel sind damit "dirty" und
  gehen beim naechsten Push regulaer auf die Shelf (mit `tmdb_id` ueber
  `/tmdb/import`, sonst ueber `/admin/movies`).
- Duplikate: TMDb-ID, sonst Titel+Jahr; auch soft-geloeschte Zeilen zaehlen,
  damit bewusst geloeschte Filme nicht bei jedem Import zurueckkommen.
- UI liegt in den Einstellungen (`src/components/settings/JellyfinPanel.vue`,
  Sektion `jellyfin`) - kein eigener Sidebar-Punkt, keine eigene Route.
- TMDb-Gegencheck vor der Duplikatpruefung: mit TMDb-ID werden die Details in der
  App-Sprache nachgeladen, ohne ID wird ueber Titel+Jahr gesucht (nur exakter
  Treffer). Leere TMDb-Felder ueberschreiben nichts; Watched/Tag/Sammlung bleiben
  unberuehrt. Abschaltbar per Checkbox, braucht den TMDb-Key.
- Verifikation: `npm test` 176/176 gruen (17 neue), `vue-tsc --noEmit` sauber.
  Hinweis: `better-sqlite3` ist lokal fuer die Electron-ABI gebaut, fuer den
  Testlauf war `npm rebuild better-sqlite3` noetig; danach mit
  `npx electron-rebuild -f -w better-sqlite3` zurueckgesetzt.

Offen: Test gegen einen echten Jellyfin-Server; Versions-Bump/CHANGELOG erst
beim Release-Signal.
