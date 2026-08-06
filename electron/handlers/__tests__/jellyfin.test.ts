import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb, insertMovie } from './testDb'
import {
  ticksToMinutes, parseRatingAge, tmdbIdOf, mapJellyfinItem,
  normalizeTitle, findDuplicate, normalizeBaseUrl, isAllowedJellyfinHost,
  jellyfinImageName, mergeTmdbDetails, pickTmdbMatch,
} from '../jellyfin'

describe('ticksToMinutes', () => {
  it('rechnet Jellyfin-Ticks in Minuten um', () => {
    expect(ticksToMinutes(60_000_000_000)).toBe(100)   // 100 Minuten
    expect(ticksToMinutes(600_000_000)).toBe(1)
  })

  it('liefert null für fehlende oder unsinnige Werte', () => {
    expect(ticksToMinutes(null)).toBeNull()
    expect(ticksToMinutes(0)).toBeNull()
    expect(ticksToMinutes(-5)).toBeNull()
    expect(ticksToMinutes('abc')).toBeNull()
  })
})

describe('parseRatingAge', () => {
  it('liest die Altersangabe aus deutschen Freigaben', () => {
    expect(parseRatingAge('FSK 16')).toBe(16)
    expect(parseRatingAge('DE-12')).toBe(12)
    expect(parseRatingAge('0')).toBe(0)
  })

  it('nähert die gängigen US-Kürzel an', () => {
    expect(parseRatingAge('R')).toBe(16)
    expect(parseRatingAge('PG')).toBe(6)
    expect(parseRatingAge('NC-17')).toBe(17)   // Zahl im Kürzel hat Vorrang
    expect(parseRatingAge('TV-MA')).toBe(18)
  })

  it('rät nicht bei Unbekanntem', () => {
    expect(parseRatingAge(null)).toBeNull()
    expect(parseRatingAge('')).toBeNull()
    expect(parseRatingAge('UNRATED')).toBeNull()
    expect(parseRatingAge('FSK 99')).toBeNull()
  })
})

describe('tmdbIdOf', () => {
  it('findet die TMDb-ID unabhängig von der Schreibweise', () => {
    expect(tmdbIdOf({ Id: 'a', ProviderIds: { Tmdb: '603' } })).toBe(603)
    expect(tmdbIdOf({ Id: 'a', ProviderIds: { tmdb: '603' } })).toBe(603)
  })

  it('liefert null ohne brauchbare ID', () => {
    expect(tmdbIdOf({ Id: 'a' })).toBeNull()
    expect(tmdbIdOf({ Id: 'a', ProviderIds: { Imdb: 'tt0133093' } })).toBeNull()
    expect(tmdbIdOf({ Id: 'a', ProviderIds: { Tmdb: 'x' } })).toBeNull()
  })
})

describe('mapJellyfinItem', () => {
  const item = {
    Id: 'jf-1',
    Name: 'Matrix',
    Type: 'Movie',
    ProductionYear: 1999,
    Genres: ['Action', 'Science Fiction'],
    Overview: 'Neo',
    OfficialRating: 'FSK 16',
    CommunityRating: 8.2,
    RunTimeTicks: 81_600_000_000,
    ProviderIds: { Tmdb: '603' },
    People: [
      { Name: 'Lana Wachowski', Type: 'Director' },
      { Name: 'Keanu Reeves', Type: 'Actor' },
      { Name: 'Carrie-Anne Moss', Type: 'Actor' },
    ],
    UserData: { Played: true, PlayCount: 3 },
  }

  it('übernimmt die Metadaten in die movies-Spalten', () => {
    const mapped = mapJellyfinItem(item)
    expect(mapped).toMatchObject({
      title: 'Matrix',
      year: 1999,
      genre: 'Action, Science Fiction',
      director: 'Lana Wachowski',
      actors_names: 'Keanu Reeves, Carrie-Anne Moss',
      runtime: 136,
      rating: 8.2,
      rating_age: 16,
      tmdb_id: 603,
      collection_type: 'Film',
      tag: 'Streaming',
      is_watched: 1,
      view_count: 3,
      in_collection: 1,
    })
  })

  it('markiert Serien als Serie und ungesehene Titel als ungesehen', () => {
    const mapped = mapJellyfinItem({ Id: 'jf-2', Name: 'Fargo', Type: 'Series' })
    expect(mapped.collection_type).toBe('Serie')
    expect(mapped.is_watched).toBe(0)
    expect(mapped.view_count).toBe(0)
    expect(mapped.genre).toBeNull()
    expect(mapped.director).toBeNull()
  })
})

describe('findDuplicate', () => {
  let db: Database.Database

  beforeEach(() => { db = createTestDb() })
  afterEach(() => db.close())

  it('erkennt vorhandene Filme an der TMDb-ID', () => {
    const id = insertMovie(db, { title: 'Ganz anderer Titel', year: 1900 })
    db.prepare('UPDATE movies SET tmdb_id = 603 WHERE id = ?').run(id)
    expect(findDuplicate(db, { tmdb_id: 603, title: 'Matrix', year: 1999 })?.id).toBe(id)
  })

  it('erkennt vorhandene Filme an Titel und Jahr, unabhängig von Schreibweise', () => {
    const id = insertMovie(db, { title: 'Der  Pate', year: 1972 })
    expect(findDuplicate(db, { title: 'der pate', year: 1972 })?.id).toBe(id)
    expect(findDuplicate(db, { title: 'Der Pate', year: 1990 })).toBeNull()
  })

  it('erkennt auch gelöschte Filme, damit sie nicht zurückkehren', () => {
    const id = insertMovie(db, { title: 'Gelöscht', year: 2001, is_deleted: 1 })
    expect(findDuplicate(db, { title: 'Gelöscht', year: 2001 })?.id).toBe(id)
  })

  it('meldet keinen Treffer für unbekannte Titel', () => {
    insertMovie(db, { title: 'Matrix', year: 1999 })
    expect(findDuplicate(db, { tmdb_id: 999, title: 'Unbekannt', year: 2024 })).toBeNull()
  })
})

describe('mergeTmdbDetails', () => {
  const jellyfin = {
    title: 'The Matrix', year: 1999, genre: 'Action', director: null,
    actors_names: null, runtime: 136, rating: 8.2, overview: 'Neo',
    tmdb_id: 603, collection_type: 'Film', tag: 'Streaming',
    is_watched: 1, view_count: 3, in_collection: 1,
  }

  it('übernimmt die TMDb-Daten in der App-Sprache', () => {
    const merged = mergeTmdbDetails(jellyfin, {
      id: 603,
      title: 'Matrix',
      overview: 'Neo entdeckt die Wahrheit',
      genres: [{ name: 'Action' }, { name: 'Science Fiction' }],
      runtime: 136,
      vote_average: 8.7,
      release_date: '1999-03-30',
      credits: {
        crew: [{ name: 'Lana Wachowski', job: 'Director' }, { name: 'Joel Silver', job: 'Producer' }],
        cast: [{ name: 'Keanu Reeves' }, { name: 'Carrie-Anne Moss' }],
      },
    })

    expect(merged).toMatchObject({
      title: 'Matrix',
      overview: 'Neo entdeckt die Wahrheit',
      genre: 'Action, Science Fiction',
      rating: 8.7,
      year: 1999,
      director: 'Lana Wachowski',
      actors_names: 'Keanu Reeves, Carrie-Anne Moss',
    })
  })

  it('lässt den Jellyfin-Wert stehen, wo TMDb nichts liefert', () => {
    const merged = mergeTmdbDetails(jellyfin, { id: 603, title: 'Matrix', overview: '', genres: [] })
    expect(merged.overview).toBe('Neo')
    expect(merged.genre).toBe('Action')
    expect(merged.runtime).toBe(136)
  })

  it('rührt Sammlungs- und Watched-Daten nicht an', () => {
    const merged = mergeTmdbDetails(jellyfin, { id: 603, title: 'Matrix' })
    expect(merged).toMatchObject({ is_watched: 1, view_count: 3, tag: 'Streaming', in_collection: 1 })
  })

  it('nutzt bei Serien die Episodenlaufzeit und das Erstausstrahlungsjahr', () => {
    const serie = { ...jellyfin, collection_type: 'Serie', runtime: null, year: null, tmdb_id: null }
    const merged = mergeTmdbDetails(serie, {
      id: 1361, name: 'Fargo', episode_run_time: [52], first_air_date: '2014-04-15',
    })
    expect(merged).toMatchObject({ tmdb_id: 1361, title: 'Fargo', runtime: 52, year: 2014 })
  })
})

describe('pickTmdbMatch', () => {
  const results = [
    { id: 1, title: 'Matrix Reloaded', release_date: '2003-05-15' },
    { id: 603, title: 'Matrix', release_date: '1999-03-30' },
  ]

  it('nimmt nur den Treffer mit gleichem Titel und Jahr', () => {
    expect(pickTmdbMatch(results, 'matrix', 1999)?.id).toBe(603)
    expect(pickTmdbMatch(results, 'Matrix', 2003)).toBeNull()
  })

  it('akzeptiert ohne bekanntes Jahr den Titeltreffer', () => {
    expect(pickTmdbMatch(results, 'Matrix', null)?.id).toBe(603)
  })

  it('rät nicht bei fehlendem oder abweichendem Titel', () => {
    expect(pickTmdbMatch(results, 'Irgendwas', 1999)).toBeNull()
    expect(pickTmdbMatch(results, '', null)).toBeNull()
    expect(pickTmdbMatch([], 'Matrix', 1999)).toBeNull()
  })

  it('vergleicht Serien über den Namen und das Erstausstrahlungsjahr', () => {
    const series = [{ id: 1361, name: 'Fargo', first_air_date: '2014-04-15' }]
    expect(pickTmdbMatch(series, 'fargo', 2014)?.id).toBe(1361)
    expect(pickTmdbMatch(series, 'Fargo', 1996)).toBeNull()
  })
})

describe('Host- und Dateinamen-Regeln', () => {
  it('normalisiert die Basis-URL', () => {
    expect(normalizeBaseUrl('http://jelly.local:8096/')).toBe('http://jelly.local:8096')
    expect(normalizeBaseUrl('  http://jelly.local:8096//  ')).toBe('http://jelly.local:8096')
    expect(normalizeBaseUrl(null)).toBe('')
  })

  it('lässt Bild-Downloads nur vom konfigurierten Jellyfin-Server zu', () => {
    const base = 'http://jelly.local:8096'
    expect(isAllowedJellyfinHost('http://jelly.local:8096/Items/1/Images/Primary', base)).toBe(true)
    expect(isAllowedJellyfinHost('http://evil.example/Items/1/Images/Primary', base)).toBe(false)
    expect(isAllowedJellyfinHost('http://jelly.local:9000/x.jpg', base)).toBe(false)
    expect(isAllowedJellyfinHost('kaputt', base)).toBe(false)
  })

  it('nutzt einen eigenen Namensraum, damit Sync-Cover nicht überschrieben werden', () => {
    expect(jellyfinImageName(7, 'cover')).toBe('jellyfin_7.jpg')
    expect(jellyfinImageName(7, 'backdrop')).toBe('jellyfin_7_backdrop.jpg')
  })

  it('normalisiert Titel für den Vergleich', () => {
    expect(normalizeTitle('  Der   Pate ')).toBe('der pate')
    expect(normalizeTitle(null)).toBe('')
  })
})
