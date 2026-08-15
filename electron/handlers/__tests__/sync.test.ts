import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb, insertMovie } from './testDb'
import {
  getDirtyMovies, markSynced, hardDelete, getPendingWatched, markWatchedSynced,
  getPendingUserRatings, markUserRatingSynced,
  getPendingEpisodesWatched, markEpisodeWatchedSynced,
} from '../sync'
import { toggleWatched, setUserRating } from '../movies'
import { upsertSeason, upsertEpisode, toggleEpisodeWatched } from '../seasons'

let db: Database.Database

beforeEach(() => { db = createTestDb() })

describe('getDirtyMovies', () => {
  it('gibt Filme ohne remote_id zurück', () => {
    insertMovie(db, { title: 'Neu lokal' })
    expect((getDirtyMovies(db) as any[]).some(m => m.title === 'Neu lokal')).toBe(true)
  })

  it('gibt Filme zurück die nach synced_at geändert wurden', () => {
    const id = insertMovie(db, {
      title: 'Geändert',
      remote_id: 1,
      synced_at: '2020-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    })
    db.prepare('UPDATE movies SET remote_id = 1, synced_at = ?, updated_at = ? WHERE id = ?')
      .run('2020-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', id)

    const dirty = getDirtyMovies(db) as any[]
    expect(dirty.some(m => m.id === id)).toBe(true)
  })

  it('gibt gelöschte Filme zurück (is_deleted = 1)', () => {
    const id = insertMovie(db, { is_deleted: 1, remote_id: 2 })
    db.prepare('UPDATE movies SET remote_id = 2, is_deleted = 1 WHERE id = ?').run(id)

    const dirty = getDirtyMovies(db) as any[]
    expect(dirty.some(m => m.id === id)).toBe(true)
  })

  it('gibt synchronisierte, unveränderte Filme NICHT zurück', () => {
    const ts = '2024-01-01T00:00:00.000Z'
    const id = insertMovie(db)
    db.prepare('UPDATE movies SET remote_id = 99, synced_at = ?, updated_at = ? WHERE id = ?')
      .run(ts, ts, id)

    const dirty = getDirtyMovies(db) as any[]
    expect(dirty.some(m => m.id === id)).toBe(false)
  })
})

describe('markSynced', () => {
  it('setzt remote_id und synced_at', () => {
    const id = insertMovie(db)
    const ts = new Date().toISOString()

    markSynced(db, { id, remote_id: 55, synced_at: ts })

    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id) as any
    expect(movie.remote_id).toBe(55)
    expect(movie.synced_at).toBe(ts)
    expect(movie.is_deleted).toBe(0)
  })
})

describe('hardDelete', () => {
  it('löscht den Film dauerhaft aus der DB', () => {
    const id = insertMovie(db)
    hardDelete(db, id)

    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id)
    expect(movie).toBeUndefined()
  })
})

describe('getPendingWatched', () => {
  it('meldet eine frisch gesetzte Markierung', () => {
    const id = insertMovie(db, { title: 'Arrival', remote_id: 10 })
    expect(getPendingWatched(db)).toHaveLength(0)

    toggleWatched(db, id)

    const pending = getPendingWatched(db)
    expect(pending).toHaveLength(1)
    expect(pending[0].title).toBe('Arrival')
    expect(pending[0].is_watched).toBe(1)
  })

  it('das Zurücknehmen zählt genauso', () => {
    const id = insertMovie(db, { title: 'Arrival', remote_id: 10, is_watched: 1, synced_watched: 1 })

    toggleWatched(db, id)

    expect(getPendingWatched(db)).toHaveLength(1)
    expect(getPendingWatched(db)[0].is_watched).toBe(0)
  })

  it('nach der Bestätigung steht nichts mehr an', () => {
    const id = insertMovie(db, { title: 'Arrival', remote_id: 10 })
    toggleWatched(db, id)

    markWatchedSynced(db, id, true)

    expect(getPendingWatched(db)).toHaveLength(0)
  })

  it('ohne Server-ID gibt es nichts zu melden', () => {
    const id = insertMovie(db, { title: 'Nur hier', remote_id: null })
    toggleWatched(db, id)

    expect(getPendingWatched(db)).toHaveLength(0)
  })

  it('ein Boxset meldet seine Teile einzeln, nicht sich selbst', () => {
    const boxset = insertMovie(db, { title: 'Rocky Collection', remote_id: 1, is_boxset: 1 })
    insertMovie(db, { title: 'Rocky', remote_id: 2, boxset_parent_id: boxset })
    insertMovie(db, { title: 'Rocky II', remote_id: 3, boxset_parent_id: boxset })

    toggleWatched(db, boxset)

    const titel = getPendingWatched(db).map(r => r.title).sort()
    expect(titel).toEqual(['Rocky', 'Rocky II'])
  })
})


// ── Bewertung ────────────────────────────────────────────────────────────────

describe('getPendingUserRatings', () => {
  it('meldet eine frisch gesetzte Bewertung als offen', () => {
    const id = insertMovie(db, { title: 'Dune', remote_id: 42 })
    setUserRating(db, id, 4)

    const offen = getPendingUserRatings(db)
    expect(offen).toHaveLength(1)
    expect(offen[0].user_rating).toBe(4)
  })

  it('meldet nichts, solange nie bewertet wurde', () => {
    insertMovie(db, { title: 'Dune', remote_id: 42 })

    expect(getPendingUserRatings(db)).toEqual([])
  })

  it('schweigt nach der Bestätigung durch die Shelf', () => {
    const id = insertMovie(db, { title: 'Dune', remote_id: 42 })
    setUserRating(db, id, 4)
    markUserRatingSynced(db, id, 4)

    expect(getPendingUserRatings(db)).toEqual([])
  })

  // Eine gelöschte Bewertung ist NULL. `NULL != 3` ist in SQL nicht wahr,
  // sondern NULL — mit != statt IS NOT bliebe das Löschen unbemerkt liegen.
  it('erkennt auch das Löschen einer Bewertung', () => {
    const id = insertMovie(db, { title: 'Dune', remote_id: 42 })
    setUserRating(db, id, 4)
    markUserRatingSynced(db, id, 4)

    setUserRating(db, id, 4)   // derselbe Stern löscht

    const offen = getPendingUserRatings(db)
    expect(offen).toHaveLength(1)
    expect(offen[0].user_rating).toBeNull()
  })

  it('übergeht Filme ohne remote_id und gelöschte', () => {
    const ohneRemote = insertMovie(db, { title: 'Nur lokal' })
    const gelöscht  = insertMovie(db, { title: 'Weg', remote_id: 43, is_deleted: 1 })
    setUserRating(db, ohneRemote, 3)
    setUserRating(db, gelöscht, 3)

    expect(getPendingUserRatings(db)).toEqual([])
  })
})

// ── Folgen ───────────────────────────────────────────────────────────────────

/** Serie mit einer Staffel und `anzahl` Folgen; remote_id optional. */
function serieMitFolgen(anzahl: number, mitRemote = true) {
  const movieId  = insertMovie(db, { collection_type: 'Serie', remote_id: 99 })
  const seasonId = upsertSeason(db, { movie_id: movieId, season_number: 1 })!
  for (let i = 1; i <= anzahl; i++) {
    upsertEpisode(db, {
      season_id: seasonId, episode_number: i, title: `Folge ${i}`,
      ...(mitRemote ? { remote_id: 1000 + i } : {}),
    })
  }
  const folgen = db.prepare('SELECT id FROM episodes WHERE season_id = ? ORDER BY episode_number')
    .all(seasonId) as { id: number }[]
  return { movieId, seasonId, folgen }
}

describe('getPendingEpisodesWatched', () => {
  it('meldet eine frisch markierte Folge als offen', () => {
    const { folgen } = serieMitFolgen(3)
    toggleEpisodeWatched(db, folgen[1].id)

    const offen = getPendingEpisodesWatched(db)
    expect(offen).toHaveLength(1)
    expect(offen[0].is_watched).toBe(1)
  })

  it('meldet nichts für unberührte Folgen', () => {
    serieMitFolgen(3)

    expect(getPendingEpisodesWatched(db)).toEqual([])
  })

  it('schweigt nach der Bestätigung durch die Shelf', () => {
    const { folgen } = serieMitFolgen(2)
    toggleEpisodeWatched(db, folgen[0].id)
    markEpisodeWatchedSynced(db, folgen[0].id, true)

    expect(getPendingEpisodesWatched(db)).toEqual([])
  })

  it('erkennt auch das Zurücknehmen', () => {
    const { folgen } = serieMitFolgen(2)
    toggleEpisodeWatched(db, folgen[0].id)
    markEpisodeWatchedSynced(db, folgen[0].id, true)

    toggleEpisodeWatched(db, folgen[0].id)

    const offen = getPendingEpisodesWatched(db)
    expect(offen).toHaveLength(1)
    expect(offen[0].is_watched).toBe(0)
  })

  // Ohne remote_id kennt die Shelf die Folge nicht — sie stünde sonst für
  // immer in der Warteschlange und liefe bei jedem Abgleich in einen Fehler.
  it('übergeht Folgen ohne remote_id', () => {
    const { folgen } = serieMitFolgen(2, false)
    toggleEpisodeWatched(db, folgen[0].id)

    expect(getPendingEpisodesWatched(db)).toEqual([])
  })

  // Die Vorschau fasst je Serie zusammen und die Fehlermeldung nennt sie beim
  // Namen — beides braucht den Bezug zur Serie, nicht nur zur Folge.
  it('liefert die Serie zur Folge mit', () => {
    const { folgen } = serieMitFolgen(2)
    toggleEpisodeWatched(db, folgen[0].id)

    const [offen] = getPendingEpisodesWatched(db)
    expect(offen.movie_remote_id).toBe(99)
    expect(offen.movie_title).toBeTruthy()
    expect(offen.title).toBe('Folge 1')
  })

  // Fällt die Staffel weg, muss die Folge übertragbar bleiben: dafür genügt
  // ihre eigene remote_id. Ein INNER JOIN hätte sie hier lautlos aus der
  // Warteschlange fallen lassen.
  it('behält Folgen, deren Staffel fehlt', () => {
    const { folgen, seasonId } = serieMitFolgen(2)
    toggleEpisodeWatched(db, folgen[0].id)

    // Regulär nicht herstellbar: die Staffel zu löschen nähme die Folgen per
    // ON DELETE CASCADE mit. Also die Fremdschlüssel kurz aussetzen.
    db.pragma('foreign_keys = OFF')
    db.prepare('UPDATE episodes SET season_id = 9999 WHERE season_id = ?').run(seasonId)
    db.pragma('foreign_keys = ON')

    const offen = getPendingEpisodesWatched(db)
    expect(offen).toHaveLength(1)
    expect(offen[0].movie_title).toBeNull()
  })
})
