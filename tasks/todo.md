# Desktop-Optik an die Web Shelf angleichen (Design)

Ziel: Der Desktop soll aussehen wie die Web Shelf (`versions/v2-saas`).
Dieser Schritt bringt Farbwelt, Themes und Flächen. Layout-Umbauten und neue
Funktionen folgen in eigenen PRs.

## Der Hebel: die Palette, nicht die Fundstellen

Der Desktop ist über `red-*` aufgebaut (rund 170 Stellen), die Shelf über
`rose-*`. Statt 170 Stellen umzuschreiben, werden — genau wie in der Shelf
(`resources/css/app.css`, Zeilen 163-175) — die **Paletten selbst** aus
`--accent-primary` per `color-mix` abgeleitet. Tailwind 4 kompiliert die
Utilities zu `var(--color-red-NNN)`, deshalb folgen alle Fundstellen
automatisch dem Theme, ohne dass eine einzige View angefasst werden muss.
Beide Skalen werden gesetzt, damit aus der Shelf portiertes Markup passt.

## Umgesetzt

- [x] `src/style.css` auf die Shelf-Tokens: `--accent-*`, `--gradient-*`,
      `--glass-*`, `--radius-lg/-xl`
- [x] Theme-Mechanik von der `.theme-dark`-Klasse auf das `data-theme`-Attribut
      (`App.vue`), wie in der Shelf
- [x] 10 Themes: `dark` (Standard, Rose), `light`, `system` sowie die
      Shelf-Themes `blue/green/red/purple/christmas/halloween/summer`.
      Shelfs `default` (Indigo-Verlauf) bewusst weggelassen — genau der Look,
      von dem der Desktop weg soll
- [x] Flächen-Variablen aus der Akzentfarbe abgeleitet: Themes färben jetzt
      die Flächen, nicht nur die Knöpfe
- [x] Saisonale Themes tragen einen eigenen `--surface-tint` (Begleitfarbe):
      Weihnachten ohne Tannengrün wäre nur ein zweites Rot, Halloween ohne
      Violett nur ein Orange
- [x] Glassmorphism portiert: `.glass`, `.glass-strong`, `.film-list-area`,
      `.detail-panel`, `.filter-bar-field`, `accent-*`
- [x] `ThemeSwitcher.vue` als Swatch-Popover im Shelf-Stil, i18n DE/EN
- [x] Theme-Migration im Store: unbekannte oder alte Werte fallen auf `dark`

### Flächen und Bausteine

- [x] **Muster statt Dateien**: 65 Vorkommen des flachen Card-Panels
      (`bg-[var(--bg-card)] border border-[var(--border-ui)]`) → `glass`,
      19 Eingabefelder → `bg-white/5 border-white/10`, 8 Sekundärknöpfe
      vereinheitlicht. Damit war der Großteil der Ansichten erledigt, bevor
      eine einzeln angefasst wurde
- [x] `MovieCard.vue` ← `movies/partials/grid-item.blade.php`: Glas,
      `rounded-3xl`, Hover-Skalierung, Format als gedrehte Banderole,
      Gesehen-Ring, einfahrende Bewertung, Titelblock mit Jahr-Punkt-Genre
- [x] `MovieListRow.vue` ← `movies/partials/list-item.blade.php`: komplett neu
- [x] `MovieDetailView.vue` ← `movies/partials/details.blade.php`: Cover mit
      Tiefenschatten, Kennzeichen-Pillen, Kernangaben als Icon-Zeile,
      physische Angaben als eigene Pillenzeile (`hasPhysicalDetails`)
- [x] `Sidebar`, `SidebarItem`, `TitleBar`, `StatCard`, `TmdbResultGrid`
- [x] **Legacy-Markenfarbe**: `var(--status-red)` wurde vielerorts als Akzent
      statt als Fehlerfarbe benutzt und folgte dem Theme nicht mit → in
      7 Dateien auf die Palette umgestellt

## Bewusst nicht geändert

- **Sync-Komponenten**: Blau steht dort für „aktualisiert" im Dreiklang mit
  Grün (neu) und Rot (gelöscht). Auf Rot umgestellt kollidierte es mit
  „gelöscht".
- **Medien-Banderolen** (Digital violett, Stream grün, 4K cyan, Leihe
  bernstein): identisch zur Shelf, dort ebenfalls bewusst bunt.
- **Gesehen-Grün** an Zustandsschaltern: die Shelf färbt „gesehen" rose, der
  Desktop hat aber Schalter mit zwei Zuständen — beide rot wäre nicht
  unterscheidbar.
- **Sidebar statt Topbar**: die Shelf hat eine Topbar; der Desktop behält
  seine Seitenleiste und bekommt nur deren Optik.

## Beim Nachsehen gefunden und behoben

Diese vier zeigten sich erst beim Ansehen in der laufenden App, nicht im Build:

1. **Kachelreihen überlappten die Beschriftung der vorigen Reihe.** Die feste
   `ROW_HEIGHTS.grid` passt immer nur zu einer Fensterbreite, weil die
   Kachelhöhe mit der Spaltenbreite wächst (Bild 2:3). `rowHeight` rechnet
   die Rasterhöhe jetzt aus `containerWidth`/`cols`.
2. **Titel der Detailansicht lief bei schmalem Fenster aus dem Bild** — feste
   `text-5xl` → `text-3xl xl:text-5xl`, dazu `break-words` und `min-w-0`.
3. **Der Theme-Umschalter öffnete hinter dem Inhalt.** `glass` bringt
   `backdrop-filter` und damit einen eigenen Stacking-Context, aus dem `z-50`
   nicht herauskommt. Die TitleBar trägt jetzt selbst `relative z-50`.
4. **Das Panel war zu durchsichtig** — man las die Filmtitel hindurch. Es ist
   nicht mehr aus Glas, sondern fast deckend, wie das Dropdown der Shelf.

## Verifikation

- `npm run build` grün
- `npm test` grün
- In der laufenden App angesehen: dark, light, green, christmas, summer, purple
- E2E-Selektor angepasst: `MovieListRow` trug nach dem Umbau ebenfalls
  `group cursor-pointer` und kollidierte mit dem Kachel-Selektor in
  `movies.spec.ts`. `MovieCard` hat jetzt `data-testid="movie-card"`

---

# Dashboard und Navigation nach dem Shelf-Aufbau (Layout)

Der Design-Schritt hat Farben und Flächen angeglichen, aber den **Aufbau** nicht
angefasst. Die Shelf ist im Dashboard Netflix-artig, der Desktop hatte Kennzahlen
plus eine senkrechte Liste. Vorlage: `movies/partials/streaming-layout.blade.php`.

## Umgesetzt

- [x] **Hero-Slider**: Backdrop mit langsamer Fahrt, dreifacher Verlauf,
      „Empfohlen"-Kennzeichen, großer Titel, Handlung, Details-Knopf,
      Indikatoren, alle 8 s weiter
- [x] `featuredMovies()` im Handler — entspricht `$featuredMovies` im
      `MovieController` der Shelf (zufällig, mit Backdrop, ohne Boxset-Kinder),
      Rückfall auf die neuesten. Plus Preload, Typen und 6 Tests
- [x] `MediaRow.vue`: waagrecht scrollende Reihe mit Pfeilen beim Überfahren
      und Kachel-Hover wie in der Shelf
- [x] Dashboard: Hero → „Neu dabei" → „Filme" → „Serien". Die Reihen „Filme" und
      „Serien" sortieren nach Titel aufsteigend, dieselbe Voreinstellung wie die
      Listenansicht, damit „Alle ansehen" die Reihenfolge fortsetzt
- [x] **Statistik-Kacheln** aus dem Dashboard entfernt, Statistik dafür als
      eigener Punkt in die Seitenleiste (`/stats`)
- [x] **Suchleiste** aus der Filmliste in den Hero verlegt, wie in der Shelf auf
      dessen Unterkante. Enter führt nach `/movies?q=`, wo die Ansicht die Suche
      schon immer aus der Route las. In der Liste zeigt ein abwählbarer Chip die
      aktive Suche — ohne das wäre nicht erkennbar, warum sie gefiltert ist
- [x] Akzentstriche an Überschriften und hinter den Reihen-Titeln entfernt

## Beim Nachsehen gefunden und behoben

1. **`backdrop_url` ist keine DB-Spalte.** Vom Renderer-Interface aufs Schema
   geschlossen — die Abfrage starb mit `no such column`.
2. **Ein Fehler im Hero leerte das ganze Dashboard**, weil alles in einem
   `Promise.all` hing. Der Hero lädt jetzt getrennt; er ist Beiwerk und darf
   die Seite nicht mitreissen.
3. **Handlung wurde roh ausgegeben** („`<p>`Liebe und Rebellion…"). Der Text
   kommt mit HTML und Shortcodes aus der Shelf und wird jetzt wie in der
   Detailansicht per `DOMParser` gesäubert.
4. **`insertMovie` im Test-Helfer schrieb `backdrop_path` nicht** — zwei Tests
   schlugen scheinbar wegen der Abfrage fehl, tatsächlich wegen des Helfers.
5. **Die Hero-Section durfte kein `overflow-hidden` haben**, sonst schnitte sie
   die überstehende Suchleiste ab. Beschnitten wird nur der innere Rahmen.

## Statistikseite folgte dem Theme nicht

Ursache war kein fehlender Theme-Anschluss, sondern ein Überbleibsel aus der
Zeit, als die Statistik nur als eigenes Fenster erreichbar war:

- [x] Die Wurzel malte mit `bg-[var(--bg-app)]` eine **deckende** Fläche über
      den Verlauf des Bodys — die Seite wirkte wie herausgeschnitten, Flächen
      grau statt getönt, kein Glas. In der App ist sie jetzt durchsichtig
- [x] Sie brachte eine **eigene Fensterleiste samt Schließknopf** mit, die in
      der App neben der echten Titelleiste stand. Nur noch im Popup
- [x] `h-screen` und ein zweites `overflow-y-auto` erzeugten eine Bildlaufleiste
      in der Bildlaufleiste — ebenfalls nur noch im Popup
- [x] `backgroundColor: '#0a0a0f'` am Statistikfenster war fest verdrahtet und
      blitzte bei hellen Themes schwarz auf → `show: false` + `ready-to-show`

## Verifikation

- `npm run build` grün, `npm test` grün (203)
- In der laufenden App durchgeklickt: Hero, Reihen, Suche („Matrix" → 4 Treffer),
  Statistikseite in dark/christmas/summer

---

# Funktionen: eigene Bewertung, Sortierung, FSK

Ausgewählt aus dem Abgleich der Shelf-Routen gegen die des Desktops.

## Eigene Bewertung (`movies.rate` der Shelf)

- [x] Spalte `user_rating INTEGER` als additive Migration. Getrennt von `rating`,
      das die TMDb-Note (0-10) trägt — beide Werte stehen nebeneinander
- [x] `setUserRating()`: 1-5 Sterne. Erneuter Klick auf denselben Stern löscht
      die Bewertung, sonst gäbe es keinen Weg zurück auf „nicht bewertet".
      Werte außerhalb 1-5 gelten als Löschen, damit kein Aufrufer etwas
      Ungültiges einschleusen kann
- [x] Sterne in der Detailansicht mit Hover-Vorschau
- [x] Kein Durchschnitt und keine Anzahl wie in der Shelf: Mehrbenutzer ist
      nicht vorgesehen
- [x] **`updated_at` bleibt unangetastet.** Die Bewertung ist rein lokal:
      `useSyncEngine` überträgt `user_rating` weder hin noch zurück. Stiege
      der Zeitstempel, gälte der Film in `getDirtyMovies` als schmutzig
      (`updated_at > synced_at`) und jeder Sternklick schöbe ein vollständiges
      `PUT /admin/movies` an die Shelf — ohne die Bewertung zu enthalten, aber
      mit dem Risiko, dort neuere Felder zu überschreiben
- [x] 8 Tests, zwei davon sichern genau das ab

## Sortierung ohne Groß-/Kleinschreibung

SQLites Standard-Collation (BINARY) stellt Großbuchstaben vor Kleinbuchstaben,
deshalb stand „EUReKA" vor „Emergency Room" — in der Liste wie im Dashboard.

- [x] `COLLATE NOCASE` auf allen Textsortierungen: Filmliste (nur bei `title`,
      die übrigen Sortierspalten sind Zahlen oder ISO-Daten), Boxset-Kinder,
      Suche, Listen-Namen, Schauspielernamen
- [x] 2 Tests

## FSK in der Detailansicht

- [x] Die FSK wurde **nie** angezeigt — sie war nur im Formular und beim
      TMDb-Import erfassbar
- [x] Die fünf Siegel aus `v2-saas/public/img/fsk` übernommen und wie in der
      Shelf in die Kennzeichenzeile gesetzt
- [x] TMDb liefert gelegentlich Altersstufen ohne Siegel (nur 0/6/12/16/18
      existieren) — dafür eine Textpille statt eines fehlenden Bildes

## Nebenbefund: die Merkliste ist da, aber unsichtbar

Das Datenmodell kennt `in_collection`, und die TMDb-Suche hat den Schalter
„In Sammlung übernehmen". Steht er aus, entsteht ein Eintrag mit
`in_collection = 0` — aber **alle 13** Filmabfragen filtern auf `= 1`, und keine
Ansicht zeigt solche Einträge. Nur die Listen filtern nicht danach.
Heute verschwindet ein so importierter Film also spurlos. Das ist eher ein
Fehler als eine fehlende Funktion, und eine Merkliste wäre billig, weil die
Daten schon da sind. Nicht Teil dieses PRs.

## Verifikation

- `npm run build` grün, `npm test` grün (211)
- Nicht in der laufenden App angesehen
