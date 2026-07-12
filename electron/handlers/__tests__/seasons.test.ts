import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb, insertMovie } from './testDb'
import { getSeasonsForMovie, upsertSeason, upsertEpisode } from '../seasons'

let db: Database.Database

beforeEach(() => { db = createTestDb() })

describe('upsertSeason', () => {
  it('legt eine neue Season an und gibt die id zurück', () => {
    const movieId = insertMovie(db)
    const id = upsertSeason(db, { remote_id: 1, movie_id: movieId, season_number: 1, title: 'Staffel 1' })
    expect(id).toBeDefined()
    expect(typeof id).toBe('number')

    const row = db.prepare('SELECT * FROM seasons WHERE id = ?').get(id) as any
    expect(row.title).toBe('Staffel 1')
    expect(row.season_number).toBe(1)
  })

  it('upserted bei remote_id-Konflikt und aktualisiert Felder', () => {
    const movieId = insertMovie(db)
    const id = upsertSeason(db, { remote_id: 5, movie_id: movieId, season_number: 1, title: 'Alt' })
    upsertSeason(db, { remote_id: 5, movie_id: movieId, season_number: 2, title: 'Neu' })

    const rows = db.prepare('SELECT * FROM seasons WHERE remote_id = 5').all() as any[]
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(id)
    expect(rows[0].title).toBe('Neu')
    expect(rows[0].season_number).toBe(2)
  })

  it('gibt lastInsertRowid zurück wenn kein remote_id angegeben', () => {
    const movieId = insertMovie(db)
    const result = upsertSeason(db, { movie_id: movieId, season_number: 1 })
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThan(0)
  })
})

describe('upsertEpisode', () => {
  it('legt eine neue Episode an', () => {
    const movieId = insertMovie(db)
    const seasonId = upsertSeason(db, { remote_id: 1, movie_id: movieId, season_number: 1 })
    upsertEpisode(db, { remote_id: 10, season_id: seasonId, episode_number: 1, title: 'Pilot' })

    const row = db.prepare('SELECT * FROM episodes WHERE remote_id = 10').get() as any
    expect(row.title).toBe('Pilot')
    expect(row.episode_number).toBe(1)
  })

  it('upserted bei remote_id-Konflikt und aktualisiert title', () => {
    const movieId = insertMovie(db)
    const seasonId = upsertSeason(db, { remote_id: 1, movie_id: movieId, season_number: 1 })
    upsertEpisode(db, { remote_id: 20, season_id: seasonId, episode_number: 1, title: 'Alt' })
    upsertEpisode(db, { remote_id: 20, season_id: seasonId, episode_number: 1, title: 'Neu' })

    const rows = db.prepare('SELECT * FROM episodes WHERE remote_id = 20').all() as any[]
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('Neu')
  })

  it('merged lokale TMDb-Episode beim ersten Shelf-Sync in die remote_id', () => {
    const movieId = insertMovie(db)
    const seasonId = upsertSeason(db, { remote_id: 1, movie_id: movieId, season_number: 1 })
    upsertEpisode(db, { season_id: seasonId, episode_number: 1, title: 'Lokal' })
    upsertEpisode(db, { remote_id: 30, season_id: seasonId, episode_number: 1, title: 'Remote' })

    const rows = db.prepare('SELECT * FROM episodes WHERE season_id = ? AND episode_number = 1').all(seasonId) as any[]
    expect(rows).toHaveLength(1)
    expect(rows[0].remote_id).toBe(30)
    expect(rows[0].title).toBe('Remote')
  })

  it('übernimmt Episode mit gleicher Position aber anderer remote_id (Server-Rekey)', () => {
    const movieId = insertMovie(db)
    const seasonId = upsertSeason(db, { remote_id: 1, movie_id: movieId, season_number: 1 })
    upsertEpisode(db, { remote_id: 40, season_id: seasonId, episode_number: 1, title: 'Alte ID' })
    // Server liefert dieselbe Episode jetzt unter neuer remote_id
    upsertEpisode(db, { remote_id: 41, season_id: seasonId, episode_number: 1, title: 'Neue ID' })

    const rows = db.prepare('SELECT * FROM episodes WHERE season_id = ? AND episode_number = 1').all(seasonId) as any[]
    expect(rows).toHaveLength(1)
    expect(rows[0].remote_id).toBe(41)
    expect(rows[0].title).toBe('Neue ID')
  })

  it('überlebt vertauschte Episodennummern (remote_id hängt an anderer Zeile)', () => {
    const movieId = insertMovie(db)
    const seasonId = upsertSeason(db, { remote_id: 1, movie_id: movieId, season_number: 1 })
    upsertEpisode(db, { remote_id: 50, season_id: seasonId, episode_number: 1, title: 'E1' })
    upsertEpisode(db, { remote_id: 51, season_id: seasonId, episode_number: 2, title: 'E2' })
    // Server hat die Nummern getauscht: remote 51 ist jetzt Episode 1
    upsertEpisode(db, { remote_id: 51, season_id: seasonId, episode_number: 1, title: 'E2 (getauscht)' })

    const ep1 = db.prepare('SELECT * FROM episodes WHERE season_id = ? AND episode_number = 1').get(seasonId) as any
    expect(ep1.remote_id).toBe(51)
    expect(ep1.title).toBe('E2 (getauscht)')
  })
})

describe('getSeasonsForMovie', () => {
  it('gibt Seasons mit geschachtelten Episodes zurück', () => {
    const movieId = insertMovie(db, { title: 'Breaking Bad' })
    const seasonId = upsertSeason(db, { remote_id: 1, movie_id: movieId, season_number: 1, title: 'Staffel 1' })
    upsertEpisode(db, { remote_id: 101, season_id: seasonId, episode_number: 1, title: 'Pilot' })
    upsertEpisode(db, { remote_id: 102, season_id: seasonId, episode_number: 2, title: 'Cat\'s in the Bag' })

    const seasons = getSeasonsForMovie(db, movieId) as any[]
    expect(seasons).toHaveLength(1)
    expect(seasons[0].title).toBe('Staffel 1')
    expect(seasons[0].episodes).toHaveLength(2)
    expect(seasons[0].episodes[0].title).toBe('Pilot')
  })

  it('sortiert Seasons nach season_number, Episodes nach episode_number', () => {
    const movieId = insertMovie(db)
    const s2 = upsertSeason(db, { remote_id: 2, movie_id: movieId, season_number: 2 })
    const s1 = upsertSeason(db, { remote_id: 1, movie_id: movieId, season_number: 1 })
    upsertEpisode(db, { remote_id: 12, season_id: s1, episode_number: 2, title: 'E2' })
    upsertEpisode(db, { remote_id: 11, season_id: s1, episode_number: 1, title: 'E1' })

    const seasons = getSeasonsForMovie(db, movieId) as any[]
    expect(seasons[0].season_number).toBe(1)
    expect(seasons[1].season_number).toBe(2)
    expect(seasons[0].episodes[0].episode_number).toBe(1)
    expect(seasons[0].episodes[1].episode_number).toBe(2)
  })
})
