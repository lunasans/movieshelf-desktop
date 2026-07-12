import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb, insertMovie, insertActor } from './testDb'
import { getStats } from '../stats'

let db: Database.Database

beforeEach(() => { db = createTestDb() })

describe('getStats', () => {
  it('totalMovies — zählt nur nicht-gelöscht, kein Boxset-Parent, in_collection=1', () => {
    insertMovie(db)                                    // zählt
    insertMovie(db, { is_deleted: 1 })                // nicht
    insertMovie(db, { is_boxset: 1 })                 // nicht
    insertMovie(db, { in_collection: 0 })             // nicht

    const { totalMovies } = getStats(db)
    expect(totalMovies).toBe(1)
  })

  it('totalRuntime — summiert runtime, ignoriert NULL', () => {
    insertMovie(db, { runtime: 90 })
    insertMovie(db, { runtime: 120 })
    insertMovie(db, { runtime: null as any })

    const { totalRuntime } = getStats(db)
    expect(totalRuntime).toBe(210)
  })

  it('genres — parsed comma-separated Genres, sortiert nach Häufigkeit', () => {
    insertMovie(db, { genre: 'Action, Drama' })
    insertMovie(db, { genre: 'Action' })
    insertMovie(db, { genre: 'Drama' })

    const { genres } = getStats(db)
    expect(genres[0].name).toBe('Action')
    expect(genres[0].count).toBe(2)
    expect(genres[1].name).toBe('Drama')
    expect(genres[1].count).toBe(2)
  })

  it('byYear — gruppiert Filme nach Jahr, sortiert ASC', () => {
    insertMovie(db, { year: 2022 })
    insertMovie(db, { year: 2020 })
    insertMovie(db, { year: 2022 })

    const { byYear } = getStats(db)
    expect(byYear[0].year).toBe(2020)
    expect(byYear[0].count).toBe(1)
    expect(byYear[1].year).toBe(2022)
    expect(byYear[1].count).toBe(2)
  })

  it('topActors — via JOIN, sortiert nach movie_count DESC', () => {
    const m1 = insertMovie(db, { title: 'Film 1' })
    const m2 = insertMovie(db, { title: 'Film 2' })
    const a1 = insertActor(db, { name: 'Hauptdarsteller' })
    const a2 = insertActor(db, { name: 'Nebendarsteller' })

    db.prepare('INSERT INTO film_actor (film_id, actor_id, is_main_role) VALUES (?, ?, 1)').run(m1, a1)
    db.prepare('INSERT INTO film_actor (film_id, actor_id, is_main_role) VALUES (?, ?, 1)').run(m2, a1)
    db.prepare('INSERT INTO film_actor (film_id, actor_id, is_main_role) VALUES (?, ?, 0)').run(m1, a2)

    const { topActors } = getStats(db)
    expect(topActors[0].name).toBe('Hauptdarsteller')
    expect(topActors[0].movie_count).toBe(2)
    expect(topActors[1].name).toBe('Nebendarsteller')
    expect(topActors[1].movie_count).toBe(1)
  })

  it('byType — enthält Filmliste pro collection_type', () => {
    insertMovie(db, { title: 'Film A', collection_type: 'Film' })
    insertMovie(db, { title: 'Serie A', collection_type: 'Serie' })

    const { byType } = getStats(db)
    const filmType = byType.find((t: any) => t.collection_type === 'Film')
    expect(filmType).toBeDefined()
    expect(filmType!.films.some((f: any) => f.title === 'Film A')).toBe(true)
  })

  it('byRuntime — 5 Buckets korrekt befüllt', () => {
    insertMovie(db, { runtime: 45 })   // < 60 min
    insertMovie(db, { runtime: 75 })   // 60–90 min
    insertMovie(db, { runtime: 100 })  // 90–120 min
    insertMovie(db, { runtime: 130 })  // 120–150 min
    insertMovie(db, { runtime: 200 })  // > 150 min

    const { byRuntime } = getStats(db)
    expect(byRuntime).toHaveLength(5)
    expect(byRuntime[0].label).toBe('< 60 min')
    expect(byRuntime[0].count).toBe(1)
    expect(byRuntime[4].label).toBe('> 150 min')
    expect(byRuntime[4].count).toBe(1)
  })

  it('byRuntime — Grenzwerte fallen in genau einen Bucket (keine Lücke/Überlappung)', () => {
    insertMovie(db, { runtime: 60 })
    insertMovie(db, { runtime: 90 })
    insertMovie(db, { runtime: 120 })
    insertMovie(db, { runtime: 150 })

    const { byRuntime } = getStats(db)
    const total = byRuntime.reduce((sum: number, b: any) => sum + b.count, 0)
    expect(total).toBe(4)
    expect(byRuntime[1].count).toBe(1) // 60 → 60–90
    expect(byRuntime[2].count).toBe(1) // 90 → 90–120
    expect(byRuntime[3].count).toBe(1) // 120 → 120–150
    expect(byRuntime[4].count).toBe(1) // 150 → > 150
  })

  it('watchedMovies — zählt nur is_watched=1', () => {
    insertMovie(db, { is_watched: 1 })
    insertMovie(db, { is_watched: 1 })
    insertMovie(db, { is_watched: 0 })

    const { watchedMovies } = getStats(db)
    expect(watchedMovies).toBe(2)
  })

  it('avgRating — gerundeter Durchschnitt, ignoriert rating=0', () => {
    insertMovie(db, { rating: 8.0 })
    insertMovie(db, { rating: 6.0 })
    insertMovie(db, { rating: 0 })    // soll ignoriert werden

    const { avgRating } = getStats(db)
    expect(avgRating).toBe(7.0)
  })
})
