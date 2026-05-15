import { ipcMain } from 'electron'
import { getDb } from '../database'
import type Database from 'better-sqlite3'

export function getSeasonsForMovie(db: Database.Database, movieId: number) {
  const seasons = db.prepare(
    'SELECT * FROM seasons WHERE movie_id = ? ORDER BY season_number ASC'
  ).all(movieId) as any[]

  for (const season of seasons) {
    season.episodes = db.prepare(
      'SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number ASC'
    ).all(season.id)
  }

  return seasons
}

export function upsertSeason(db: Database.Database, data: Record<string, unknown>): number | undefined {
  const now = new Date().toISOString()

  // If a remote_id is incoming, check if a local-only season (remote_id IS NULL)
  // with the same movie_id + season_number exists. If so, merge into it to avoid
  // creating a duplicate row on first sync.
  if (data.remote_id != null && data.movie_id != null && data.season_number != null) {
    const local = db.prepare(
      'SELECT id FROM seasons WHERE movie_id = ? AND season_number = ? AND remote_id IS NULL'
    ).get(data.movie_id, data.season_number) as { id: number } | undefined

    if (local) {
      db.prepare(`
        UPDATE seasons SET remote_id = @remote_id, title = @title, overview = @overview, updated_at = @updated_at
        WHERE id = @id
      `).run({ remote_id: data.remote_id, title: data.title ?? null, overview: data.overview ?? null, updated_at: now, id: local.id })
      return local.id
    }
  }

  const result = db.prepare(`
    INSERT INTO seasons (remote_id, movie_id, season_number, title, overview, created_at, updated_at)
    VALUES (@remote_id, @movie_id, @season_number, @title, @overview, @created_at, @updated_at)
    ON CONFLICT(remote_id) DO UPDATE SET
      movie_id = EXCLUDED.movie_id,
      season_number = EXCLUDED.season_number,
      title = EXCLUDED.title,
      overview = EXCLUDED.overview,
      updated_at = EXCLUDED.updated_at
  `).run({ remote_id: null, title: null, overview: null, ...data, created_at: now, updated_at: now })

  if (data.remote_id != null) {
    const row = db.prepare('SELECT id FROM seasons WHERE remote_id = ?').get(data.remote_id) as { id: number } | undefined
    return row?.id
  }
  return result.lastInsertRowid as number
}

export function upsertEpisode(db: Database.Database, data: Record<string, unknown>): void {
  const now = new Date().toISOString()
  if (data.remote_id != null) {
    // From shelf sync: conflict on remote_id
    db.prepare(`
      INSERT INTO episodes (remote_id, season_id, episode_number, title, overview, created_at, updated_at)
      VALUES (@remote_id, @season_id, @episode_number, @title, @overview, @created_at, @updated_at)
      ON CONFLICT(remote_id) DO UPDATE SET
        season_id = EXCLUDED.season_id,
        episode_number = EXCLUDED.episode_number,
        title = EXCLUDED.title,
        overview = EXCLUDED.overview,
        updated_at = EXCLUDED.updated_at
    `).run({ remote_id: null, title: null, overview: null, ...data, created_at: now, updated_at: now })
  } else {
    // From TMDb: conflict on (season_id, episode_number) to prevent duplicates
    db.prepare(`
      INSERT INTO episodes (remote_id, season_id, episode_number, title, overview, created_at, updated_at)
      VALUES (@remote_id, @season_id, @episode_number, @title, @overview, @created_at, @updated_at)
      ON CONFLICT(season_id, episode_number) DO UPDATE SET
        title = COALESCE(EXCLUDED.title, episodes.title),
        overview = COALESCE(EXCLUDED.overview, episodes.overview),
        updated_at = EXCLUDED.updated_at
    `).run({ remote_id: null, title: null, overview: null, ...data, created_at: now, updated_at: now })
  }
}

export function registerSeasonHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('db:seasons:forMovie', (_event, movieId: number) => getSeasonsForMovie(db(), movieId))
  ipcMain.handle('db:seasons:upsert',   (_event, data) => upsertSeason(db(), data))
  ipcMain.handle('db:episodes:upsert',  (_event, data) => upsertEpisode(db(), data))
}
