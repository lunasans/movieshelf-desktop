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
