# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run Vue dev server only (no Electron)
npm run dev

# Run full Electron app in development (Vite + Electron concurrently)
npm run electron:dev

# Type-check and build for production
npm run build

# Build distributable installer (runs vite build + electron-builder)
npm run electron:build
```

There are no tests in this project.

## Architecture

**Stack:** Electron 31 + Vue 3 + TypeScript + Vite + Pinia + Tailwind CSS + better-sqlite3

### Process boundary: the IPC bridge

All communication between the renderer (Vue) and the main process goes through a strict IPC bridge:

- `electron/preload.ts` — exposes `window.electron` via `contextBridge`. This is the **only** surface the renderer can call into Electron. Adding a new capability means adding it here first.
- `src/electron.d.ts` — TypeScript types for `window.electron`. Must be kept in sync with `preload.ts`.
- `electron/handlers/*.ts` — each file registers `ipcMain.handle(...)` for a domain (movies, lists, stats, media, settings). All are registered in `electron/main.ts` at startup.

### Dual operating mode

The app runs in two modes controlled by `settings.mode`:

- **`standalone`** — fully offline; all reads/writes go to the local SQLite database via `window.electron.db.*`
- **`online`** — connected to an external MovieShelf web API; reads/writes go to `axios` calls via `useApi()`. Sync between local and remote is done manually from `/sync`.

The `isOnline` computed in `useSettingsStore` (`src/stores/settings.ts`) gates which path is taken throughout the app. Every store and composable checks this.

### Database

`electron/database.ts` owns the SQLite setup:
- File stored at `app.getPath('userData')/movieshelf.db`
- Schema is created inline in `runMigrations()` using `CREATE TABLE IF NOT EXISTS`
- Additive column migrations use bare `ALTER TABLE ... ADD COLUMN` wrapped in try/catch (silently ignored if column already exists)
- Tables: `movies`, `actors`, `film_actor` (many-to-many), `settings`, `lists`, `list_movies`
- Soft deletes: `movies.is_deleted = 1`; hard-delete only happens after a successful remote sync

### Media / cover images

Local cover images are served via a custom Electron protocol registered in `main.ts`:

```
movie-resource://<filename>
```

Files live in `app.getPath('userData')/covers/`. The `resolveMediaUrl()` helper in `src/composables/useApi.ts` handles the priority chain: online shelf URL → full HTTP URL → `movie-resource://` fallback.

### Routing

Uses `createWebHashHistory()` — required because Electron loads the app as a local file in production. Route `/stats` can be opened as a standalone popup window (no sidebar/titlebar) by appending `?popup=1`.

### Theming

CSS custom properties are set on `<html>` via class `theme-dark` / `theme-light`. Applied in `App.vue` on mount and when `settings.theme` changes. Supports `'system'` which reads `prefers-color-scheme`.

### Key files

| Path | Purpose |
|------|---------|
| `electron/main.ts` | Window creation, IPC for window controls, trailer player, update installer, `movie-resource://` protocol |
| `electron/preload.ts` | `window.electron` API surface |
| `electron/database.ts` | SQLite setup + all migrations |
| `electron/handlers/movies.ts` | Movie + actor CRUD and sync IPC handlers |
| `src/composables/useApi.ts` | Axios client factory + `resolveMediaUrl` |
| `src/stores/settings.ts` | App-wide mode/theme/credentials, loaded once on mount |
| `src/stores/movies.ts` | Movie list with online/offline branching |

### Update system

Manual updater in `main.ts` (`update:install`): downloads installer to `tmpdir`, verifies SHA256, then calls `shell.openPath`. Progress events sent via `mainWindow.webContents.send('update:progress', percent)`.
