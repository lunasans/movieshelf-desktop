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
}

export function registerSeasonHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('db:seasons:forMovie', (_event, movieId: number) => getSeasonsForMovie(db(), movieId))
  ipcMain.handle('db:seasons:upsert',   (_event, data) => upsertSeason(db(), data))
  ipcMain.handle('db:episodes:upsert',  (_event, data) => upsertEpisode(db(), data))
}
