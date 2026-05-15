# Open PR Review Sweep - 2026-05-15

## Scope

Reviewed all open pull requests in `lunasans/movieshelf-desktop`:

- #14 `dev -> main: Alle Fixes & Features (v0.9.x)`
- #15 `fix(actors): 404 fuer fehlende Schauspieler-Bilder verhindern`
- #16 `feat(detail): Trailer-Vorschau mit Play-Button, oeffnet eigenes Fenster`
- #17 `fix(detail): Regie in Metadaten-Zeile verschoben`
- #18 `fix(sync): Uebersprungene Eintraege separat zaehlen und anzeigen`
- #19 `fix(sync): skipped fehlt im runPush-Ergebnis`
- #21 `fix(sync): preview zeigt auch lokale Aenderungen (push-Seite)`
- #22 `fix(series): Folgen von TMDb nachladen wenn Staffeln leer sind`
- #23 `fix(tmdb): Serien-Import importiert Staffeln & Folgen zuverlaessig`
- #24 `fix(review): drei Korrekturen aus PR #21/#22 Review`
- #25 `fix(sync): runPreviewSync + needsUpdate-Vergleich korrigiert`

## Decisions

### #25 - keep as active integration/release branch

#25 is the current PR. It targets `main` and contains the integration work plus the follow-up fixes from #24:

- local TMDb episodes can be merged with later Shelf episodes by `(season_id, episode_number)`
- the episode unique index is made safer by preferring rows with `remote_id`
- the combined sync preview no longer leaves shown push changes unapplied
- preview confirmation with local push changes runs a bidirectional delta sync instead of escalating to full sync
- `needsUpdate` uses `<`, so equal timestamps are counted as skipped

0.10.0 was prepared on this branch:

- `package.json` version is `0.10.0`
- `package-lock.json` root versions are `0.10.0`
- `CHANGELOG.md` contains a `0.10.0` release entry

### #21, #22, #23, #24 - superseded by #25

Do not merge these independently. They contain useful work, but each is either incomplete by itself or already addressed by #25.

### #15, #16, #17, #18, #19 - stale/non-mergeable

These PRs are not cleanly mergeable against the current `dev` branch. Their changes appear to have been absorbed into `dev` / #14 or later follow-up branches.

Recommended action:

- close them after confirming no unique commits are still needed
- avoid merging them directly because they are stale and may reintroduce conflicts

### #14 - superseded by #25

#14 was the previous `dev -> main` integration PR. It is superseded by #25 because #25 targets `main` and includes the later sync/episode corrections.

Issue found and fixed locally:

- `skipped` counting used `<=` for timestamp comparison, so records with identical `updated_at` were counted as updated instead of skipped. The comparison now uses `<`.

## Implemented Local Fixes

### 1. Correct skipped counting

File: `src/composables/useSyncEngine.ts`

Changed:

```ts
const needsUpdate = !existing || (existing.updated_at ?? '') < (movie.updated_at ?? '')
```

Why:

- equal timestamps mean the local row is already current
- this matches the intended `skipped` behavior from #18

### 2. Add bidirectional delta sync for preview apply

Files:

- `src/composables/useSyncEngine.ts`
- `src/views/SyncView.vue`

Added `runPreviewSync()`:

- performs `pull(false)`
- then `push()`
- then `syncLists()`
- saves sync time and updates stats

Why:

- If the preview shows both `Shelf -> Desktop` and `Desktop -> Shelf`, applying it should process both directions.
- A preview opened from the normal Shelf button should not silently perform a full sync with full-delete reconciliation.
- The full sync button still performs `runFullSync()`.

### 3. Add regression test for TMDb-local episode merge

File: `electron/handlers/__tests__/seasons.test.ts`

Added coverage for:

- local episode exists without `remote_id`
- same episode later arrives from Shelf with `remote_id`
- result is one row with the remote id attached

Why:

- this is the highest-risk database regression from the season/episode PR stack

## Verification

Commands attempted:

```powershell
npm.cmd test
npm.cmd run build
node_modules\.bin\vue-tsc.cmd --noEmit
node_modules\.bin\vitest.cmd run electron/handlers/__tests__/seasons.test.ts
npm.cmd rebuild better-sqlite3
```

Results:

- `npm.cmd test` starts Vitest. After the latest run, all tests are blocked by the local `better-sqlite3` ABI mismatch (`NODE_MODULE_VERSION 145` vs required `137`).
- `npm.cmd run build` completes typecheck and Vite transforms, then fails with `EPERM: operation not permitted, open '...\\dist-electron\\main.js'`.
- `node_modules\.bin\vue-tsc.cmd --noEmit` passes.
- Targeted Season tests reach execution, but fail because `better-sqlite3` was compiled for `NODE_MODULE_VERSION 145` while current Node requires `NODE_MODULE_VERSION 137`.
- `npm.cmd rebuild better-sqlite3` was attempted both normally and with elevated permissions; it still fails because `better_sqlite3.node` is locked (`EBUSY`/`EPERM`).

Interpretation:

- The code reached TypeScript/Vite transform without surfacing a TypeScript error.
- TypeScript verification is green.
- Full-suite test execution is blocked by the local native-module ABI mismatch.
- Targeted DB tests are currently blocked by the local native-module ABI mismatch and locked binary.
- The build failure appears filesystem/environmental because Rollup cannot write an existing generated file in `dist-electron`.

## Recommended Merge Path

1. Keep #25 as the only open PR.
2. Close #14, #15, #16, #17, #18, #19, #21, #22, #23, and #24 as superseded/stale.
3. Re-run tests/build in a clean environment or after resolving the local `better-sqlite3` and `dist-electron/main.js` locks.
4. Merge #25 into `main` when verification is clean.
