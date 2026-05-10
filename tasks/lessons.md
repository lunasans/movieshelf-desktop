# Lessons

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
