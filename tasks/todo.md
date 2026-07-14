# Todo

## Mehrsprachigkeit DE/EN (2026-07-14)

Plan: vue-i18n@11 (legacy:false), Locale-Dateien `src/i18n/de.ts` (Strings 1:1) + `en.ts` (`satisfies MessageSchema`), Setting `language` (lokal, wie theme), TMDb folgt via `tmdbLanguage`-Computed. Branch `feat/i18n`, ein PR, kein Version-Bump.

- [x] Infrastruktur: vue-i18n, `src/i18n/*`, main.ts, App.vue-Watch
- [x] Setting `language`: Allowlist (settings.ts), Store (language/tmdbLanguage/dateLocale), LanguageSwitcher in SettingsView
- [x] TMDb: 16× `'de-DE'` → `settings.tmdbLanguage`; `useSyncEngine.ts` `'de-AT'` → `settings.dateLocale`
- [x] String-Extraktion: Shell → Movies → TMDb → Lists → Sync → Stats/Settings
- [x] Electron-Main: `electron/i18n.ts` (tMain), Tray-Rebuild, Quit-/Backup-Dialoge, OAuth-Titel
- [x] Tests: settings `language` round-trip, tMain-Fallback; `npm test` (143 grün) + `npm run build` grün
- [x] Sweep: unübersetzte Attribute/Strings (nur Kommentare/DB-Werte übrig)
- [x] PR erstellen (#50, Branch `feat/i18n`)

### Review

- Ein Commit auf `feat/i18n`, 44 Dateien, +1532/−397. Kein Version-Bump (Release erst auf Signal).
- Verifikation: `npm test` 143 grün (neu: language-Roundtrip, tMain), `npm run build` grün (vue-tsc erzwingt de/en-Key-Parität via `satisfies`).
- E2E/Playwright startet in dieser Umgebung generell nicht (ELECTRON_RUN_AS_NODE=1 in der Shell; Single-Instance-Lock der laufenden App; `release/` enthält alten Build vom 21.06.) — unabhängig von diesem PR. Manueller Kurztest: `npm run dev` → Einstellungen → Erscheinungsbild → EN.
- DB-Enum-Werte (Film/Serie, Format-Tags) bewusst unübersetzt; nur Options-Labels lokalisiert.

## Bug-Scan Runde 2 – Fixes (2026-07-12)

- [x] PR A (#42) `fix/sync-dirty-preservation` — Sync-Korrektheit: Pull stempelt lokale Änderungen nicht mehr als synchronisiert (useSyncEngine); zweites UPDATE in createMovie respektiert den „lokal neuer"-Guard (is_watched/view_count)
- [x] PR B (#43) `fix/quit-nag-standalone` — quitApp: Sync-Nachfrage nur im Online-Modus
- [x] PR C (#44) `fix/lists-consistency` — Listen: updated_at-Bump beim Entfernen, Orphan-Cleanup bei deleteList, robuste remote_id-Übernahme in pushLists, UI-Hinweis zum UNION-Sync
- [x] PR D (#45) `fix/stats-runtime-buckets` — Statistik: Laufzeit-Buckets ohne Lücke/Überlappung
- [x] PR E (#46) `fix/episode-rekey` — Episoden-Upsert: Kollision (season_id, episode_number) mit anderer remote_id abfangen
- [x] PR F (#47) `fix/trailer-navigation` — Trailer-Fenster: will-navigate-Schutz

### Review

- 6 PRs (#42–#47), alle von `main` abgezweigt. #42 und #44 berühren beide useSyncEngine.ts in disjunkten Bereichen (pull() vs. pushLists()) — sollten konfliktfrei mergen.
- Verifikation pro PR: `npm test` (bis 125 Tests grün) + `vue-tsc --noEmit`. Neue Tests: movies (Guard/is_watched), lists (Orphans, updated_at), stats (Bucket-Grenzen), seasons (Rekey/Nummerntausch).
- Nachtrag: Tombstones umgesetzt als PR G (#48) `fix/list-tombstones`, Basis-Branch `fix/lists-consistency` (#44) — Listen-Entfernungen erreichen jetzt den Server. #44 zuerst mergen, #48 retargetet dann automatisch auf main. Der UI-Hinweis aus #44 wird in #48 wieder entfernt (obsolet).
- Elektron-ABI nach Testläufen wiederhergestellt (electron-rebuild).

## Security-Scan Fixes (2026-07-12)

Befund aus Projekt-Scan; Umsetzung als ein PR pro Fix, kein Version-Bump.

- [x] PR 1 (#36) `fix/media-ipc-hardening` — media.ts: ID-Validierung für `media:upload`/`media:exists` (Path Traversal), Download-Abbruch-Behandlung (halbfertige Dateien), baseDomain-Heuristik für zweistufige TLDs (co.uk etc.)
- [x] PR 2 (#37) `fix/backup-secrets` — backup.ts: Secrets (shelf_token, tmdb_api_key) nicht mehr in Backup exportieren; Restore nur mit Settings-Allowlist
- [x] PR 3 (#38) `fix/movie-resource-traversal` — main.ts: `movie-resource://`-Protokoll gegen prozent-kodierte Traversal härten (decode + Whitelist)
- [x] PR 4 (#39) `fix/preload-update-listeners` — preload.ts: Listener-Leck bei update.onProgress/onReady/onError
- [x] PR 5 (#40) `fix/oauth-window-target` — oauth.ts: OAuth-Callback an das anfragende Fenster statt an ein geratenes
- [x] PR 6 (#41) `chore/npm-audit-fix` — Abhängigkeiten: `npm audit fix` (form-data high, shell-quote/concurrently critical, u. a.)

### Review

- Alle 6 PRs erstellt (#36–#41), jeweils von `main` abgezweigt, keine Überschneidungen (außer: #37 exportiert `ALLOWED_SETTINGS_KEYS`/`SENSITIVE_KEYS` aus settings.ts — konfliktfrei zu den anderen).
- Verifikation pro PR: `npm test` (113–121 Tests grün) + `vue-tsc --noEmit`; bei #41 zusätzlich `vite build`.
- Neue Testdateien/-fälle: `media.test.ts` (mediaFileName/baseDomain/isAllowedMediaHost), 2 neue Fälle in `backup.test.ts` (Secret-Export, Restore-Allowlist).
- Lokale Besonderheit: `npm test` erfordert `npm rebuild better-sqlite3` (Node-ABI); danach `npx electron-rebuild -f -w better-sqlite3` für die App wiederherstellen. Zustand nach Abschluss: Electron-ABI (App lauffähig).
- Bewusst nicht gefixt: `verifyUpdateCodeSignature: false` (dokumentierte Entscheidung wegen Self-Signing, siehe 0.13.1).

## Release 0.10.0
- [x] Version in `package.json` auf 0.10.0 setzen
- [x] Root-Versionen in `package-lock.json` synchronisieren
- [x] Changelog-Eintrag fuer 0.10.0 ergaenzen
- [x] TypeScript-Verifikation ausfuehren
- [x] Test-/Build-Status dokumentieren

### Release 0.10.0 Verification - 2026-05-15
- `node_modules\.bin\vue-tsc.cmd --noEmit`: passed.
- `npm.cmd test`: blocked by local `better-sqlite3` native module ABI mismatch (`NODE_MODULE_VERSION 145` vs required `137`).
- `npm.cmd run build`: TypeScript and Vite transforms start successfully, then Rollup fails with `EPERM` writing `dist-electron/main.js`.

## Open PR Review Sweep
- [x] Inventar aller offenen PRs erstellen
- [x] Diffs und Überschneidungen prüfen
- [x] Pro PR Review-Findings oder Merge-Empfehlung festhalten
- [x] Kritische PRs nach Möglichkeit reparieren oder klare nächste Aktion ableiten
- [x] Verifikation/Rest-Risiken dokumentieren

### Review Results - 2026-05-15
- Open PRs reviewed and stale PRs closed: #14, #15, #16, #17, #18, #19, #21, #22, #23, #24.
- #25 is now the only open/current PR and contains the integration work plus the latest sync/episode review fixes.
- #21, #22, #23, and #24 are superseded by #25 and should not be merged independently.
- #14, #15, #16, #17, #18, and #19 were stale or covered by the later integration PR.
- Verification attempted: `vue-tsc --noEmit` passes; full Vitest run fails globally with runner discovery errors; targeted Season tests are blocked by a `better-sqlite3` Node ABI mismatch and locked native binary; `npm.cmd run build` passes typecheck/transform but fails writing `dist-electron/main.js` with EPERM.

## Major Dependency Upgrade (v0.6.x)

### Stage 1 — Patch updates (kein Code-Änderungsbedarf)
- [ ] `axios` → latest
- [ ] `postcss` → latest
- [ ] `vue` → latest (3.5.34)
- [ ] `vite-plugin-electron` → 0.29.1
- [ ] `vite-plugin-electron-renderer` → 0.14.7
- [ ] `concurrently` → latest (9.x)
- [ ] `wait-on` → latest (9.x)

### Stage 2 — Electron-Toolchain
- [ ] `@electron/rebuild` 3 → 4
- [ ] `electron` 41 → 42
- [ ] Verify: `npm run build` grün

### Stage 3 — Tailwind 3 → 4
- [ ] `npm uninstall tailwindcss autoprefixer`
- [ ] `npm install --save-dev tailwindcss@^4 @tailwindcss/vite`
- [ ] `vite.config.ts`: `@tailwindcss/vite` als Plugin eintragen
- [ ] `src/style.css`: `@tailwind base/components/utilities` → `@import "tailwindcss"` + `@theme {}`-Block
- [ ] `tailwind.config.js` löschen
- [ ] `postcss.config.js` löschen
- [ ] Verify: App visuell prüfen (Dark/Light-Theme, MovieCard, Farben)

### Stage 4 — Vite 5 → 8 (Risiko: vite-plugin-electron Kompatibilität)
- [ ] Erst Vite 6 versuchen; wenn OK → 7 → 8
- [ ] `vite` → ^6.0.0
- [ ] `@vitejs/plugin-vue` 5 → 6
- [ ] `vue-tsc` 2 → 3
- [ ] `vitest` 2 → 4
- [ ] Verify: `npm run build` + `npm test` grün
- [ ] Falls OK: auf Vite 8 upgraden

### Stage 5 — TypeScript 5 → 6
- [ ] `typescript` → ^6.0.0
- [ ] Verify: `npm run build` (vue-tsc --noEmit)

### Stage 6 — Vue Router 4 → 5
- [ ] `vue-router` → ^5.0.0
- [ ] `src/router/index.ts` auf Breaking Changes prüfen
- [ ] Verify: Routing im App testen

### Stage 7 — Pinia 2 → 3
- [ ] `pinia` → ^3.0.0
- [ ] Stores auf Breaking Changes prüfen (alle nutzen Composition API → sicher)
- [ ] Verify: Store-State im App prüfen

### Final
- [ ] `npm test` — alle 32 Tests grün
- [ ] `npm run build` — keine TS-Fehler
- [ ] Version bump + Changelog + Tag
