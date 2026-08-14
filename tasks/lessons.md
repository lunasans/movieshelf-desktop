# Lessons

## Medien-Requests mit den echten Browser-Bedingungen testen
Beim Debuggen fehlender Bilder reicht ein `fetch`/HEAD aus Node nicht: der Server
antwortete dort mit 200, im Renderer kam 403. Ursache war der Hotlink-Schutz, der
auf den `Referer` reagiert (`vary: referer`) — Node schickt keinen, Chromium unter
`file://` schon. Immer mit dem echten Referer/Origin gegentesten, bevor Serverseite
als "in Ordnung" abgehakt wird. Und: `content-type: text/html` bei einer Bild-URL
ist immer ein Fehlerseiten-Signal.
Fix in der App: `<meta name="referrer" content="no-referrer">` in `index.html`.

## Bei UI-Fehlern die DevTools-Ausgabe anfordern statt zu raten
Datenlage, Dateien und CSP waren alle korrekt; erst der Statuscode aus dem
Netzwerk-Tab hat den Fall entschieden. Wenn die App beim Nutzer läuft (Single-
Instance-Lock verhindert eine zweite Instanz), früh nach Konsole/Netzwerk fragen.

## Keine Emojis in PR-Beschreibungen
PR-Bodies und Commit-Messages ohne Emojis halten (auch kein 🤖-Footer) —
der Nutzer empfindet das als unprofessionell. Sachlicher Text genügt.

## package-lock.json immer synchron halten
Nach dem Hinzufügen von Paketen zu `package.json` muss lokal `npm install` ausgeführt
und die aktualisierte `package-lock.json` committet werden. `npm ci` in GitHub Actions
schlägt fehl, wenn Lock-Datei und package.json nicht synchron sind.

## better-sqlite3 braucht Rebuild bei Node.js-Versionswechsel
`better-sqlite3` ist ein natives Modul (NODE_MODULE_VERSION). Wenn lokal eine andere
Node.js-Version als beim letzten Build läuft → `npm rebuild better-sqlite3` ausführen.
In GitHub Actions: `npm ci --ignore-scripts` + separater `npm rebuild better-sqlite3`-Schritt.

## Tests lokal zuerst — dann pushen
Vor jedem Tag-Push erst `npm test` lokal ausführen und alle Tests bestätigen.
GitHub Actions erst als Verifikation nutzen, nicht als Debugger.

## IPC-Handler: Pure Functions mit Defaults
`better-sqlite3` named parameters (`:name` / `@name`) werfen einen `RangeError` wenn
ein Parameter im übergebenen Objekt fehlt — auch wenn er in SQL als optional gilt.
Lösung: Immer ein vollständiges Defaults-Objekt vor `...data` spreaden, das alle
SQL-Parameter mit `null`/0 vorbelegt. Gilt für ALLE Statements (INSERT und UPDATE).

## ALLOWED_MOVIE_COLUMNS und Soft-Delete
`is_deleted` gehört NICHT in `ALLOWED_MOVIE_COLUMNS`. Soft-Deletion ist über `deleteMovie()`
geregelt. Wäre `is_deleted` erlaubt, könnten Aufrufer Filme über `updateMovie` heimlich löschen.
Die Allowlist schützt gegen unbeabsichtigte/böswillige Feldänderungen.

## Tailwind 4 Besonderheiten (geplant)
- Config nicht mehr in `tailwind.config.js`, sondern als `@theme {}` Block in CSS
- Import: `@import "tailwindcss"` statt `@tailwind base/components/utilities`
- Vite-Integration über `@tailwindcss/vite` Plugin, PostCSS-Config entfällt
- `bg-[var(--css-var)]` arbitrary-value Klassen funktionieren unverändert
- Bestehende `.theme-dark`/`.theme-light` CSS-Variablen-Architektur bleibt erhalten

## Theming: die Palette umdefinieren statt Fundstellen umschreiben
Beim Angleichen an die Web Shelf war der erste Reflex, ~170 `red-*`-Stellen zu ersetzen.
Richtig ist der Weg, den die Shelf selbst geht (`app.css`, Zeilen 163–175): Tailwind 4
kompiliert Utilities zu `var(--color-red-NNN)`, also genügt es, die Skala per `color-mix`
aus `--accent-primary` neu zu definieren. Alle Fundstellen folgen dann automatisch dem
Theme, die Views bleiben unangetastet.

## [data-theme="x"] ist NICHT spezifischer als [data-theme]
Beide sind Attributselektoren mit Spezifität (0,1,0) — der Wertvergleich macht den
Selektor nicht stärker. Bei gleicher Spezifität entscheidet die Reihenfolge, und der
spätere Block gewinnt. Ein `--surface-tint` in `[data-theme="christmas"]` wurde deshalb
still von einem `[data-theme] { --surface-tint: … }` weiter unten überschrieben.
Standardwerte gehören nach `:root` **vor** die Theme-Blöcke.
Erkannt nur durch Nachmessen von `getComputedStyle(...).getPropertyValue()` — im
gebauten CSS stand die richtige Regel, sie verlor bloß die Kaskade.

## Ein Theme braucht mehr als eine Akzentfarbe
Weihnachten, Halloween und Sommer wirkten wie Varianten des Standard-Themes, weil nur
`--accent-primary` in die Oberfläche floss und `--accent-secondary` nirgends benutzt
wurde. Die Jahreszeit steckt im Farb**paar**: Rot braucht Tannengrün, Orange braucht
Violett. Lösung: eigener `--surface-tint` für die Flächen, kräftiger gemischt
(14–24 % statt 5–7 %), sonst bleibt auf Schwarz nichts übrig.

## backdrop-filter erzeugt einen Stacking-Context
Die `.glass`-Klasse bringt `backdrop-filter` mit. Damit wird das Element zum eigenen
Stacking-Context, und ein `z-50` eines Kindes kommt da nicht mehr heraus — das Popover
der Themenauswahl verschwand hinter dem Inhalt. Wer `glass` auf einen Container legt,
aus dem etwas herausragen soll, muss dem Container selbst ein `z-index` geben.

## Vor breiten CSS-Sweeps nach @apply suchen
Ein `sed` über ein Klassenmuster traf auch eine `@apply`-Zeile in einem `<style>`-Block.
Plain-CSS-Klassen wie `.glass` sind keine Tailwind-Utilities — `@apply glass` bricht den
Build mit "Cannot apply unknown utility class".

## Virtualisierte Listen: Zeilenhöhe mitziehen
`MoviesView` gibt dem Virtualizer feste Höhen (`ROW_HEIGHTS`). Wird eine Kachel höher,
muss die Konstante mit — sonst überlappen die absolut positionierten Zeilen. Und bei
Inhalten mit Seitenverhältnis reicht keine Konstante: die Kachelhöhe wächst mit der
Spaltenbreite, die Zeilenhöhe muss also gerechnet werden.

## Layout-Änderungen gegen die E2E-Selektoren prüfen
`MovieListRow` bekam beim Umbau `group cursor-pointer` — genau der Selektor, mit dem
`movies.spec.ts` die Filmkacheln zählt. Klassenbasierte Selektoren brechen still, wenn
eine andere Komponente dieselben Utilities bekommt. Nach Umbauten auf `data-testid`
umstellen.

## Der eigenen Messung glauben, nicht dem Screenshot-Eindruck
Ein Knopf wirkte auf dem Screenshot grau. `getComputedStyle` sagte `rgb(241,245,249)`,
`elementsFromPoint` zeigte ihn als oberstes Element mit `opacity: 1` — also kein Fehler.
Trotzdem wurde weiter gesucht, über mehrere Läufe. Wenn eine gezielte Messung eine
Vermutung widerlegt, ist die Vermutung erledigt.

## npm ci schlägt bei Linux-spezifischen Optional-Deps fehl (Cross-Platform Lock File)
`npm ci` prüft die Lock-Datei IMMER vollständig — auch `--omit=optional` hilft nicht,
weil die Sync-Validierung vor dem Install-Schritt läuft. Pakete wie `@emnapi/core`
und `@emnapi/runtime` sind Linux-spezifische optionale Deps die auf Windows nie in
die Lock-Datei geschrieben werden.
**Fix**: Im Test-Job `npm install --ignore-scripts` statt `npm ci` nutzen.
Für Build-Jobs (native Linux/Windows Runner) bleibt `npm ci --omit=optional`.

## Vite-Plugin-Electron Kompatibilität
`vite-plugin-electron` hinkt beim Vite-Versionssupport oft hinterher.
Beim Upgrade immer zuerst Vite 6 testen (nicht direkt auf 8 springen).
Erst wenn build + dev-Start grün sind → nächste Major-Version versuchen.

## Renderer-Typ ist nicht das DB-Schema
`Movie` in `src/stores/movies.ts` führt `backdrop_url`/`cover_url` als optionale
Felder — die kommen aus der Online-API und existieren in SQLite **nicht**. Eine
Abfrage darauf stirbt mit `no such column`. Für Handler immer `electron/database.ts`
als Quelle nehmen, nicht das Renderer-Interface.

## Ein Fehler in einer Zusatzabfrage darf nicht die ganze Ansicht leeren
Der Hero wurde zusammen mit Filmliste und Kennzahlen in einem `Promise.all` geladen.
Als seine Abfrage warf, blieb das komplette Dashboard leer. Beiwerk gehört in einen
eigenen `try`, damit ein Fehler dort nur das Beiwerk kostet.

## Test-Helfer schlucken Spalten, die nicht in der INSERT-Liste stehen
`insertMovie` in `testDb.ts` führt die Spalten einzeln auf. Ein Override für eine
Spalte, die dort fehlt (`backdrop_path`), wird stillschweigend ignoriert — der Test
prüft dann etwas anderes als gedacht und schlägt scheinbar wegen der Abfrage fehl.
