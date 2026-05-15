# Todo

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
