# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Agent Instructions

1. **Plan Node Default**
   - Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
   - If something goes sideways, STOP and re-plan immediately — don't keep pushing
   - Use plan mode for verification steps, not just building
   - Write detailed specs upfront to reduce ambiguity

2. **Subagent Strategy**
   - Use subagents liberally to keep main context window clean
   - Offload research, exploration, and parallel analysis to subagents
   - For complex problems, throw more compute at it via subagents
   - One task per subagent for focused execution

3. **Self-Improvement Loop**
   - After ANY correction from the user: update `tasks/lessons.md` with the pattern
   - Write rules for yourself that prevent the same mistake
   - Ruthlessly iterate on these lessons until mistake rate drops
   - Review lessons at session start for relevant project

4. **Verification Before Done**
   - Never mark a task complete without proving it works
   - Diff behavior between main and your changes when relevant
   - Ask yourself: "Would a staff engineer approve this?"
   - Run tests, check logs, demonstrate correctness

5. **Demand Elegance (Balanced)**
   - For non-trivial changes: pause and ask "is there a more elegant way?"
   - If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
   - Skip this for simple, obvious fixes — don't over-engineer
   - Challenge your own work before presenting it

6. **Autonomous Bug Fixing**
   - When given a bug report: just fix it. Don't ask for hand-holding
   - Point at logs, errors, failing tests — then resolve them
   - Zero context switching required from the user
   - Go fix failing CI tests without being told how

**Task Management**
- Plan First: Write plan to `tasks/todo.md` with checkable items
- Verify Plan: Check in before starting implementation
- Track Progress: Mark items complete as you go
- Explain Changes: High-level summary at each step
- Document Results: Add review section to `tasks/todo.md`
- Capture Lessons: Update `tasks/lessons.md` after corrections

**Core Principles**
- Simplicity First: Make every change as simple as possible. Minimal code impact.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Changes should only touch what's necessary. Avoid introducing bugs.

---

## Commands

```bash
# Run Vue dev server (renderer only, no Electron shell)
npm run dev

# Type-check and build for production
npm run build

# Build distributable installer (runs vite build + electron-builder)
npm run electron:build

# Run handler unit tests (vitest, node environment)
npm test

# Run a single test file
npx vitest run electron/handlers/__tests__/movies.test.ts

# Run E2E tests (Playwright, requires built app)
npm run test:e2e
npm run test:e2e:ui   # with interactive UI
```

**Tests:** Handler unit tests live in `electron/handlers/__tests__/` (vitest, `node` environment, real in-memory SQLite via `testDb.ts`). E2E tests use Playwright + `electron-playwright-helpers`. There is no renderer/Vue test suite.

---

## Architecture

**Stack:** Electron 41 + Vue 3 + TypeScript + Vite + Pinia + Tailwind CSS + better-sqlite3

**Current version:** 0.9.2

### Process boundary: the IPC bridge

All communication between the renderer (Vue) and the main process goes through a strict IPC bridge:

- `electron/preload.ts` — exposes `window.electron` via `contextBridge`. This is the **only** surface the renderer can call into Electron. Adding a new capability means adding it here first.
- `src/electron.d.ts` — TypeScript types for `window.electron`. Must be kept in sync with `preload.ts`.
- `electron/handlers/*.ts` — each file registers `ipcMain.handle(...)` for a domain. All are registered in `electron/main.ts` at startup.

### Dual operating mode

The app runs in two modes controlled by `settings.mode`:

- **`standalone`** — fully offline; all reads/writes go to the local SQLite database via `window.electron.db.*`
- **`online`** — connected to an external MovieShelf web API; reads/writes go to `axios` calls via `useApi()`. Sync between local and remote is done manually from `/sync`.

The `isOnline` computed in `useSettingsStore` (`src/stores/settings.ts`) gates which path is taken throughout the app. Every store and composable checks this.

### Database

`electron/database.ts` owns the SQLite setup:
- File stored at `app.getPath('userData')/movieshelf.db`
- WAL mode + foreign keys enforced
- Schema created inline in `runMigrations()` using `CREATE TABLE IF NOT EXISTS`
- Additive column migrations use `ALTER TABLE ... ADD COLUMN` wrapped in try/catch (silently ignored if column already exists)
- Soft deletes: `movies.is_deleted = 1`; hard-delete only happens after a successful remote sync

**Tables:**

| Table | Purpose |
|-------|---------|
| `movies` | Main film/series records; includes boxset hierarchy (`is_boxset`, `boxset_parent_id`), sync fields (`remote_id`, `synced_at`, `is_deleted`) |
| `actors` | Actor records with optional TMDb data |
| `film_actor` | Many-to-many join (role, is_main_role) |
| `settings` | Key-value store; allowed keys: `mode`, `theme`, `shelf_url`, `shelf_token`, `tmdb_api_key`, `last_sync_at` |
| `lists` | Custom user lists |
| `list_movies` | Many-to-many join (list ↔ movie) |
| `seasons` | TV season records (unique on `remote_id`) |
| `episodes` | TV episode records (unique on `remote_id`) |

### IPC Handlers

| File | Domain |
|------|--------|
| `electron/handlers/movies.ts` | Movie CRUD, boxset children, sync state, TMDb deduplication |
| `electron/handlers/actors.ts` | Actor CRUD, TMDb actor lookup |
| `electron/handlers/settings.ts` | get/set/getAll (allowlisted keys only) |
| `electron/handlers/media.ts` | Cover/backdrop/actor image downloads, HTTPS-only |
| `electron/handlers/lists.ts` | List CRUD, movie associations, sync state |
| `electron/handlers/seasons.ts` | Season + episode upserts for TV series |
| `electron/handlers/sync.ts` | Remote sync helpers |
| `electron/handlers/stats.ts` | Aggregate stats (genres, runtime buckets, top actors, by year) |
| `electron/handlers/oauth.ts` | OAuth popup window + deep-link callback (`movieshelf://`) |
| `electron/handlers/backup.ts` | Export/import `.ms` ZIP (DB tables + media files) |

### Media / cover images

Local cover images are served via a custom Electron protocol registered in `main.ts`:

```
movie-resource://<filename>
```

Files live in `app.getPath('userData')/covers/`. The `resolveMediaUrl()` helper in `src/composables/useApi.ts` handles the priority chain: online shelf URL → full HTTP URL → `movie-resource://` fallback.

### Routing

Uses `createWebHashHistory()` — required because Electron loads the app as a local file in production. Route `/stats` can be opened as a standalone popup window (no sidebar/titlebar) by appending `?popup=1`.

**Routes:** dashboard, movies, series, movie detail, movie edit, movie new, actor detail, lists, list detail, TMDb search, sync, settings, stats.

### Theming

CSS custom properties are set on `<html>` via class `theme-dark` / `theme-light`. Applied in `App.vue` on mount and when `settings.theme` changes. Supports `'system'` which reads `prefers-color-scheme`.

### Update system

Manual updater in `main.ts` (`update:install`): downloads installer to `tmpdir`, verifies SHA256, then spawns platform-specific installer (Windows: spawn, macOS: shell.openPath, Linux: pkexec/xdg-open fallback). Progress events sent via `mainWindow.webContents.send('update:progress', percent)`.

### Key files

| Path | Purpose |
|------|---------|
| `electron/main.ts` | Window creation, IPC for window controls, trailer player, update installer, `movie-resource://` protocol, OAuth deep-link |
| `electron/preload.ts` | `window.electron` API surface |
| `electron/database.ts` | SQLite setup + all migrations |
| `electron/handlers/movies.ts` | Movie + actor CRUD and sync IPC handlers (largest handler, 14 KB) |
| `src/composables/useApi.ts` | Axios client factory + `resolveMediaUrl` |
| `src/composables/useTmdbSearch.ts` | TMDb search logic, result normalisation |
| `src/composables/useSyncEngine.ts` | Full/delta sync orchestration, conflict resolution |
| `src/stores/settings.ts` | App-wide mode/theme/credentials, loaded once on mount |
| `src/stores/movies.ts` | Movie list with online/offline branching, per-tab pagination cache |
| `src/views/SyncView.vue` | Delta/full sync UI, progress tracking, conflict resolution (33 KB) |
| `src/views/TmdbSearchView.vue` | TMDb search, pre-fill form, media download (24 KB) |

### Component structure

`src/components/` is split by domain: `layout/` (Sidebar, TitleBar), `movies/` (MovieCard, MovieListRow), `sync/` (SyncProgress, SyncPreview, …), `tmdb/` (TmdbImportModal, TmdbResultGrid), `ui/` (FormRow, StatCard, ThemeSwitcher). Top-level components: `BulkActionBar.vue`, `RandomPickerModal.vue`.
