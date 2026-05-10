import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb, insertMovie } from './testDb'
import { upsertActor, linkActor, getActor, getActorsForMovie, getMoviesForActor } from '../actors'

let db: Database.Database

beforeEach(() => { db = createTestDb() })

describe('upsertActor', () => {
  it('legt einen neuen Schauspieler an', () => {
    const id = upsertActor(db, { remote_id: 1, name: 'Keanu Reeves' })
    expect(id).toBeDefined()

    const actor = db.prepare('SELECT * FROM actors WHERE id = ?').get(id) as any
    expect(actor.name).toBe('Keanu Reeves')
  })

  it('aktualisiert bei vorhandenem remote_id (ON CONFLICT)', () => {
    upsertActor(db, { remote_id: 1, name: 'Alt' })
    upsertActor(db, { remote_id: 1, name: 'Neu' })

    const all = db.prepare('SELECT * FROM actors WHERE remote_id = 1').all() as any[]
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('Neu')
  })

  it('setzt optionale Felder auf NULL wenn nicht angegeben', () => {
    const id = upsertActor(db, { remote_id: 2, name: 'Minimal' })
    const actor = db.prepare('SELECT * FROM actors WHERE id = ?').get(id) as any
    expect(actor.bio).toBeNull()
    expect(actor.birthday).toBeNull()
  })
})

describe('linkActor', () => {
  it('verknüpft Schauspieler mit Film', () => {
    const movieId = insertMovie(db)
    const actorId = upsertActor(db, { remote_id: 10, name: 'Test Actor' }) as number

    linkActor(db, { film_id: movieId, actor_id: actorId, role: 'Neo', is_main_role: true })

    const link = db.prepare('SELECT * FROM film_actor WHERE film_id = ? AND actor_id = ?').get(movieId, actorId) as any
    expect(link).toBeDefined()
    expect(link.role).toBe('Neo')
    expect(link.is_main_role).toBe(1)
  })

  it('ersetzt bestehende Verknüpfung (INSERT OR REPLACE)', () => {
    const movieId = insertMovie(db)
    const actorId = upsertActor(db, { remote_id: 11, name: 'Actor' }) as number

    linkActor(db, { film_id: movieId, actor_id: actorId, role: 'Rolle A' })
    linkActor(db, { film_id: movieId, actor_id: actorId, role: 'Rolle B' })

    const links = db.prepare('SELECT * FROM film_actor WHERE film_id = ?').all(movieId) as any[]
    expect(links).toHaveLength(1)
    expect(links[0].role).toBe('Rolle B')
  })
})

describe('getActorsForMovie', () => {
  it('gibt Hauptrollen zuerst zurück', () => {
    const movieId = insertMovie(db)
    const a1 = upsertActor(db, { remote_id: 20, name: 'Nebenrolle' }) as number
    const a2 = upsertActor(db, { remote_id: 21, name: 'Hauptrolle' }) as number

    linkActor(db, { film_id: movieId, actor_id: a1, is_main_role: false })
    linkActor(db, { film_id: movieId, actor_id: a2, is_main_role: true })

    const actors = getActorsForMovie(db, movieId) as any[]
    expect(actors[0].name).toBe('Hauptrolle')
  })
})

describe('getMoviesForActor', () => {
  it('gibt Filme des Schauspielers zurück', () => {
    const m1 = insertMovie(db, { title: 'Film 1' })
    const m2 = insertMovie(db, { title: 'Film 2' })
    const actorId = upsertActor(db, { remote_id: 30, name: 'Star' }) as number

    linkActor(db, { film_id: m1, actor_id: actorId })
    linkActor(db, { film_id: m2, actor_id: actorId })

    const movies = getMoviesForActor(db, actorId) as any[]
    expect(movies).toHaveLength(2)
  })

  it('schließt gelöschte Filme aus', () => {
    const movieId = insertMovie(db, { is_deleted: 1 })
    const actorId = upsertActor(db, { remote_id: 31, name: 'Ghost' }) as number
    linkActor(db, { film_id: movieId, actor_id: actorId })

    expect(getMoviesForActor(db, actorId)).toHaveLength(0)
  })
})
