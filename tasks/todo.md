# Todo

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
