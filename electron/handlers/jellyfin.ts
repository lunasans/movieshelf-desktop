import { ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs'
import { randomUUID } from 'crypto'
import axios from 'axios'
import type Database from 'better-sqlite3'
import { getDb } from '../database'
import { getSetting, setSetting } from './settings'
import { COVERS_DIR, MAX_IMAGE_BYTES } from './media'
import { createMovie } from './movies'
import { upsertSeason, upsertEpisode } from './seasons'

// Jellyfin liefert Laufzeiten in "Ticks" (100-Nanosekunden-Einheiten).
const TICKS_PER_MINUTE = 600_000_000

// Jellyfin verwaltet Dateien, keine Discs – importierte Titel bekommen daher
// dasselbe Medium wie andere dateibasierte Quellen der Shelf.
const IMPORT_TAG = 'Streaming'

export interface JellyfinItem {
  Id: string
  Name?: string
  Type?: string
  ProductionYear?: number | null
  Genres?: string[]
  Overview?: string | null
  OfficialRating?: string | null
  CommunityRating?: number | null
  RunTimeTicks?: number | null
  ProviderIds?: Record<string, string>
  People?: { Name?: string; Type?: string }[]
  ImageTags?: Record<string, string>
  BackdropImageTags?: string[]
  UserData?: { Played?: boolean; PlayCount?: number }
  IndexNumber?: number | null
  ParentIndexNumber?: number | null
}

// ── Reine Funktionen (testbar ohne Server) ───────────────────────────────────

export function ticksToMinutes(ticks: unknown): number | null {
  const n = Number(ticks)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n / TICKS_PER_MINUTE)
}

/**
 * Freigabe-Alter aus dem OfficialRating. Deutsche Angaben (`FSK 16`, `DE-16`)
 * enthalten die Zahl direkt; für die gängigen US-Kürzel gibt es eine Näherung.
 * Alles Unbekannte bleibt leer, statt zu raten.
 */
export function parseRatingAge(rating: unknown): number | null {
  if (typeof rating !== 'string' || !rating.trim()) return null
  const value = rating.trim().toUpperCase()

  const digits = value.match(/(\d{1,2})/)
  if (digits) {
    const age = Number(digits[1])
    return age >= 0 && age <= 21 ? age : null
  }

  const usRatings: Record<string, number> = {
    'G': 0, 'TV-G': 0, 'TV-Y': 0,
    'PG': 6, 'TV-PG': 6,
    'R': 16, 'TV-14': 14,
    'NC-17': 18, 'TV-MA': 18,
  }
  return usRatings[value] ?? null
}

/** TMDb-ID aus den ProviderIds (Schlüssel-Schreibweise variiert je nach Plugin). */
export function tmdbIdOf(item: JellyfinItem): number | null {
  const ids = item.ProviderIds ?? {}
  const key = Object.keys(ids).find(k => k.toLowerCase() === 'tmdb')
  const n = key ? Number(ids[key]) : NaN
  return Number.isInteger(n) && n > 0 ? n : null
}

/** Jellyfin-Item → Zeile für die `movies`-Tabelle. */
export function mapJellyfinItem(item: JellyfinItem): Record<string, unknown> {
  const people = item.People ?? []
  const directors = people.filter(p => p.Type === 'Director').map(p => p.Name).filter(Boolean)
  const actors = people.filter(p => p.Type === 'Actor').map(p => p.Name).filter(Boolean).slice(0, 10)

  return {
    title: item.Name ?? '',
    year: item.ProductionYear ?? null,
    genre: item.Genres?.length ? item.Genres.join(', ') : null,
    director: directors.length ? directors.join(', ') : null,
    actors_names: actors.length ? actors.join(', ') : null,
    runtime: ticksToMinutes(item.RunTimeTicks),
    rating: item.CommunityRating ?? null,
    rating_age: parseRatingAge(item.OfficialRating),
    overview: item.Overview || null,
    tmdb_id: tmdbIdOf(item),
    collection_type: item.Type === 'Series' ? 'Serie' : 'Film',
    tag: IMPORT_TAG,
    is_watched: item.UserData?.Played ? 1 : 0,
    view_count: item.UserData?.PlayCount ?? 0,
    in_collection: 1,
  }
}

/** Titel für den Duplikat-Vergleich normalisieren (Groß-/Kleinschreibung, Leerraum). */
export function normalizeTitle(title: unknown): string {
  return String(title ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Bereits vorhandener Film? Erst über die TMDb-ID (eindeutig), sonst über
 * Titel + Jahr. Auch soft-gelöschte Zeilen zählen als Treffer – sonst käme ein
 * bewusst gelöschter Film bei jedem Import zurück.
 */
export function findDuplicate(
  db: Database.Database,
  candidate: { tmdb_id?: number | null; title?: unknown; year?: number | null },
): { id: number } | null {
  if (candidate.tmdb_id != null) {
    const byTmdb = db.prepare('SELECT id FROM movies WHERE tmdb_id = ?').get(candidate.tmdb_id) as { id: number } | undefined
    if (byTmdb) return byTmdb
  }

  const title = normalizeTitle(candidate.title)
  if (!title) return null

  const rows = db.prepare(
    candidate.year != null
      ? 'SELECT id, title FROM movies WHERE year = ?'
      : 'SELECT id, title FROM movies WHERE year IS NULL',
  ).all(...(candidate.year != null ? [candidate.year] : [])) as { id: number; title: string }[]

  return rows.find(r => normalizeTitle(r.title) === title) ?? null
}

/** Basis-URL normalisieren (ohne abschließenden Schrägstrich). */
export function normalizeBaseUrl(url: unknown): string {
  return String(url ?? '').trim().replace(/\/+$/, '')
}

/**
 * Bild-Downloads nur vom konfigurierten Jellyfin-Server. `media:download` bleibt
 * auf den Shelf-Host beschränkt; hier gilt dieselbe Regel für Jellyfin.
 */
export function isAllowedJellyfinHost(url: string, baseUrl: string): boolean {
  try {
    const parsed = new URL(url)
    const base = new URL(baseUrl)
    return parsed.origin === base.origin
  } catch {
    return false
  }
}

// ── Server-Zugriff ───────────────────────────────────────────────────────────

interface Session { baseUrl: string; token: string; userId: string }

function deviceId(): string {
  let id = getSetting(getDb(), 'jellyfin_device_id')
  if (!id) {
    id = randomUUID()
    setSetting(getDb(), 'jellyfin_device_id', id)
  }
  return id
}

function authHeader(token?: string): string {
  const parts = [
    'Client="MovieShelf Desktop"',
    'Device="MovieShelf"',
    `DeviceId="${deviceId()}"`,
    'Version="1.0.0"',
  ]
  if (token) parts.push(`Token="${token}"`)
  return `MediaBrowser ${parts.join(', ')}`
}

function session(): Session | null {
  const db = getDb()
  const baseUrl = normalizeBaseUrl(getSetting(db, 'jellyfin_url'))
  const token = getSetting(db, 'jellyfin_token')
  const userId = getSetting(db, 'jellyfin_user_id')
  if (!baseUrl || !token || !userId) return null
  return { baseUrl, token, userId }
}

async function jfGet(s: Session, path: string, params: Record<string, unknown> = {}) {
  const { data } = await axios.get(`${s.baseUrl}${path}`, {
    params,
    headers: { Authorization: authHeader(s.token), Accept: 'application/json' },
    timeout: 30_000,
  })
  return data
}

/** Bild von Jellyfin in den Cover-Ordner laden. Gibt den Dateinamen zurück. */
async function downloadImage(s: Session, itemId: string, type: 'Primary' | 'Backdrop', fileName: string): Promise<string | null> {
  const url = `${s.baseUrl}/Items/${encodeURIComponent(itemId)}/Images/${type}`
  if (!isAllowedJellyfinHost(url, s.baseUrl)) return null

  if (!existsSync(COVERS_DIR)) mkdirSync(COVERS_DIR, { recursive: true })
  const filePath = join(COVERS_DIR, fileName)

  try {
    const response = await axios({
      url,
      method: 'GET',
      params: { maxWidth: type === 'Primary' ? 600 : 1280, quality: 90 },
      responseType: 'stream',
      headers: { Authorization: authHeader(s.token) },
      maxContentLength: MAX_IMAGE_BYTES,
      maxBodyLength: MAX_IMAGE_BYTES,
      timeout: 30_000,
    })
    const writer = createWriteStream(filePath)
    response.data.pipe(writer)

    return await new Promise<string | null>((resolve) => {
      let settled = false
      const fail = () => {
        if (settled) return
        settled = true
        writer.close(() => {
          try { unlinkSync(filePath) } catch { /* ggf. nie angelegt */ }
          resolve(null)
        })
      }
      writer.on('finish', () => {
        if (settled) return
        settled = true
        resolve(fileName)
      })
      writer.on('error', fail)
      response.data.on('error', fail)
    })
  } catch {
    return null
  }
}

/**
 * Eigener Dateinamens-Raum für Jellyfin-Bilder: die Sync-Bilder liegen unter
 * `<remote_id>.jpg`, eine lokale id könnte dort kollidieren.
 */
export function jellyfinImageName(movieId: number, type: 'cover' | 'backdrop'): string {
  return type === 'backdrop' ? `jellyfin_${movieId}_backdrop.jpg` : `jellyfin_${movieId}.jpg`
}

export interface ImportProgress {
  phase: 'libraries' | 'items' | 'done'
  current: number
  total: number
  title: string
  imported: number
  skipped: number
  failed: number
}

export interface ImportResult {
  success: boolean
  error?: string
  imported: number
  skipped: number
  failed: number
  errors: string[]
}

// ── TMDb-Gegencheck ──────────────────────────────────────────────────────────
//
// Jellyfin bezieht seine Metadaten selbst meist von TMDb, liefert sie aber in der
// Server-Sprache und ggf. lokal überschrieben. Mit hinterlegtem TMDb-Key holen wir
// den kanonischen Datensatz in der App-Sprache nach: Titel ohne TMDb-ID werden per
// Suche zugeordnet, damit auch sie später über `/tmdb/import` auf die Shelf gehen.

const TMDB_BASE = 'https://api.themoviedb.org/3'

export interface TmdbDetails {
  id?: number
  title?: string
  name?: string
  overview?: string | null
  genres?: { name: string }[]
  runtime?: number | null
  episode_run_time?: number[]
  vote_average?: number | null
  release_date?: string | null
  first_air_date?: string | null
  credits?: { crew?: { name: string; job: string }[]; cast?: { name: string }[] }
}

function yearOf(date: unknown): number | null {
  const year = Number(String(date ?? '').slice(0, 4))
  return Number.isInteger(year) && year > 1800 ? year : null
}

/**
 * TMDb-Details über die Jellyfin-Daten legen. TMDb gewinnt, wo es etwas liefert –
 * leere Felder lassen den Jellyfin-Wert stehen. Der Watched-Status und alles
 * Sammlungsbezogene bleibt unangetastet: das weiß nur Jellyfin bzw. die App.
 */
export function mergeTmdbDetails(mapped: Record<string, unknown>, details: TmdbDetails): Record<string, unknown> {
  const directors = (details.credits?.crew ?? []).filter(c => c.job === 'Director').map(c => c.name)
  const cast = (details.credits?.cast ?? []).map(c => c.name).slice(0, 10)
  const runtime = details.runtime ?? details.episode_run_time?.[0] ?? null
  const year = yearOf(details.release_date ?? details.first_air_date)

  const merged: Record<string, unknown> = { ...mapped }
  const take = (key: string, value: unknown) => {
    if (value !== null && value !== undefined && value !== '') merged[key] = value
  }

  take('tmdb_id', details.id ?? null)
  take('title', details.title ?? details.name ?? null)
  take('overview', details.overview || null)
  take('genre', details.genres?.length ? details.genres.map(g => g.name).join(', ') : null)
  take('runtime', runtime)
  take('rating', details.vote_average ?? null)
  take('year', year)
  take('director', directors.length ? directors.join(', ') : null)
  take('actors_names', cast.length ? cast.join(', ') : null)

  return merged
}

/**
 * Passender Treffer aus einer TMDb-Suche: nur bei identischem Titel und – sofern
 * bekannt – identischem Jahr. Lieber kein Treffer als der falsche Film.
 */
export function pickTmdbMatch(
  results: TmdbDetails[],
  title: unknown,
  year: number | null,
): TmdbDetails | null {
  const wanted = normalizeTitle(title)
  if (!wanted) return null

  return (results ?? []).find(r => {
    if (normalizeTitle(r.title ?? r.name) !== wanted) return false
    if (year == null) return true
    return yearOf(r.release_date ?? r.first_air_date) === year
  }) ?? null
}

interface TmdbConfig { apiKey: string; language: string }

async function tmdbDetails(cfg: TmdbConfig, kind: 'movie' | 'tv', id: number): Promise<TmdbDetails | null> {
  try {
    const { data } = await axios.get(`${TMDB_BASE}/${kind}/${id}`, {
      params: { api_key: cfg.apiKey, language: cfg.language, append_to_response: 'credits' },
      timeout: 20_000,
    })
    return data ?? null
  } catch {
    return null
  }
}

async function tmdbFindByTitle(cfg: TmdbConfig, kind: 'movie' | 'tv', title: string, year: number | null): Promise<TmdbDetails | null> {
  try {
    const { data } = await axios.get(`${TMDB_BASE}/search/${kind}`, {
      params: {
        api_key: cfg.apiKey,
        language: cfg.language,
        query: title,
        ...(year != null ? (kind === 'movie' ? { year } : { first_air_date_year: year }) : {}),
      },
      timeout: 20_000,
    })
    const match = pickTmdbMatch(data?.results ?? [], title, year)
    return match?.id ? await tmdbDetails(cfg, kind, match.id) : null
  } catch {
    return null
  }
}

/**
 * Jellyfin-Daten gegen TMDb prüfen. Schlägt der Abgleich fehl (kein Treffer,
 * Netzwerk, Rate-Limit), bleiben die Jellyfin-Daten stehen – der Import läuft weiter.
 */
async function verifyAgainstTmdb(cfg: TmdbConfig, mapped: Record<string, unknown>): Promise<Record<string, unknown>> {
  const kind = mapped.collection_type === 'Serie' ? 'tv' : 'movie'
  const tmdbId = mapped.tmdb_id as number | null

  const details = tmdbId
    ? await tmdbDetails(cfg, kind, tmdbId)
    : await tmdbFindByTitle(cfg, kind, String(mapped.title ?? ''), (mapped.year as number | null) ?? null)

  return details ? mergeTmdbDetails(mapped, details) : mapped
}

/** Alle Items einer Bibliothek einsammeln (seitenweise, damit große Server nicht hängen). */
async function fetchItems(s: Session, parentId: string): Promise<JellyfinItem[]> {
  const pageSize = 200
  const all: JellyfinItem[] = []

  for (let start = 0; ; start += pageSize) {
    const data = await jfGet(s, `/Users/${s.userId}/Items`, {
      parentId,
      recursive: true,
      includeItemTypes: 'Movie,Series',
      fields: 'Genres,Overview,ProviderIds,People,RunTimeTicks,OfficialRating',
      startIndex: start,
      limit: pageSize,
      sortBy: 'SortName',
    })
    const items: JellyfinItem[] = data?.Items ?? []
    all.push(...items)
    if (items.length < pageSize) break
  }

  return all
}

/** Staffeln und Episoden einer Serie übernehmen. */
async function importSeries(s: Session, movieId: number, seriesId: string): Promise<void> {
  const seasonsData = await jfGet(s, `/Shows/${encodeURIComponent(seriesId)}/Seasons`, { userId: s.userId })
  const episodesData = await jfGet(s, `/Shows/${encodeURIComponent(seriesId)}/Episodes`, { userId: s.userId, fields: 'Overview' })
  const episodes: JellyfinItem[] = episodesData?.Items ?? []

  for (const season of (seasonsData?.Items ?? []) as JellyfinItem[]) {
    const number = season.IndexNumber
    if (number == null || number <= 0) continue  // Specials (Staffel 0) auslassen

    const seasonId = upsertSeason(getDb(), {
      movie_id: movieId,
      season_number: number,
      title: season.Name ?? null,
      overview: season.Overview || null,
    })
    if (seasonId == null) continue

    for (const ep of episodes.filter(e => e.ParentIndexNumber === number && e.IndexNumber != null)) {
      upsertEpisode(getDb(), {
        season_id: seasonId,
        episode_number: ep.IndexNumber,
        title: ep.Name ?? null,
        overview: ep.Overview || null,
      })
    }
  }
}

export function registerJellyfinHandlers(): void {
  const db = () => getDb()

  // Zugangsdaten + Verbindungsstatus
  ipcMain.handle('jellyfin:status', async () => {
    const baseUrl = normalizeBaseUrl(getSetting(db(), 'jellyfin_url'))
    return {
      url: baseUrl,
      user: getSetting(db(), 'jellyfin_user') ?? '',
      connected: !!session(),
      lastImportAt: getSetting(db(), 'jellyfin_last_import_at'),
    }
  })

  ipcMain.handle('jellyfin:login', async (_event, { url, username, password }: { url: string; username: string; password: string }) => {
    const baseUrl = normalizeBaseUrl(url)
    if (!/^https?:\/\//i.test(baseUrl)) {
      return { success: false, error: 'Die Server-Adresse muss mit http:// oder https:// beginnen.' }
    }

    try {
      const { data } = await axios.post(
        `${baseUrl}/Users/AuthenticateByName`,
        { Username: username, Pw: password },
        { headers: { Authorization: authHeader(), 'Content-Type': 'application/json' }, timeout: 30_000 },
      )
      if (!data?.AccessToken || !data?.User?.Id) {
        return { success: false, error: 'Der Server hat kein Zugriffstoken geliefert.' }
      }

      setSetting(db(), 'jellyfin_url', baseUrl)
      setSetting(db(), 'jellyfin_user', username)
      setSetting(db(), 'jellyfin_token', data.AccessToken)
      setSetting(db(), 'jellyfin_user_id', data.User.Id)
      return { success: true, user: data.User.Name ?? username }
    } catch (error: any) {
      const status = error?.response?.status
      if (status === 401) return { success: false, error: 'Benutzername oder Passwort ist falsch.' }
      return { success: false, error: `Verbindung fehlgeschlagen: ${error.message}` }
    }
  })

  ipcMain.handle('jellyfin:logout', () => {
    for (const key of ['jellyfin_token', 'jellyfin_user_id', 'jellyfin_libraries']) {
      setSetting(db(), key, '')
    }
    return { success: true }
  })

  ipcMain.handle('jellyfin:libraries', async () => {
    const s = session()
    if (!s) return { success: false, error: 'Nicht angemeldet.', libraries: [] }
    try {
      const data = await jfGet(s, `/Users/${s.userId}/Views`)
      const libraries = ((data?.Items ?? []) as any[])
        .filter(v => v.CollectionType === 'movies' || v.CollectionType === 'tvshows')
        .map(v => ({ id: v.Id as string, name: v.Name as string, type: v.CollectionType as string }))
      return { success: true, libraries }
    } catch (error: any) {
      return { success: false, error: error.message, libraries: [] }
    }
  })

  ipcMain.handle('jellyfin:import', async (event, libraryIds: string[], options: { verifyWithTmdb?: boolean } = {}): Promise<ImportResult> => {
    const s = session()
    if (!s) return { success: false, error: 'Nicht angemeldet.', imported: 0, skipped: 0, failed: 0, errors: [] }
    if (!Array.isArray(libraryIds) || libraryIds.length === 0) {
      return { success: false, error: 'Keine Bibliothek ausgewählt.', imported: 0, skipped: 0, failed: 0, errors: [] }
    }

    const win = BrowserWindow.fromWebContents(event.sender)
    const send = (progress: ImportProgress) => win?.webContents.send('jellyfin:progress', progress)

    let imported = 0, skipped = 0, failed = 0
    const errors: string[] = []

    let items: JellyfinItem[] = []
    try {
      send({ phase: 'libraries', current: 0, total: 0, title: '', imported, skipped, failed })
      for (const libraryId of libraryIds) {
        items.push(...await fetchItems(s, libraryId))
      }
    } catch (error: any) {
      return { success: false, error: `Bibliotheken konnten nicht gelesen werden: ${error.message}`, imported, skipped, failed, errors }
    }

    // Derselbe Film kann in mehreren Bibliotheken liegen – innerhalb eines Laufs
    // zählt jede Jellyfin-ID nur einmal.
    const seen = new Set<string>()
    items = items.filter(i => !seen.has(i.Id) && seen.add(i.Id))

    // Gegencheck nur mit hinterlegtem TMDb-Key; ohne ihn bleiben Jellyfins Daten maßgeblich.
    const apiKey = options.verifyWithTmdb === false ? null : getSetting(db(), 'tmdb_api_key')
    const tmdbCfg: TmdbConfig | null = apiKey
      ? { apiKey, language: getSetting(db(), 'language') === 'en' ? 'en-US' : 'de-DE' }
      : null

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      let mapped = mapJellyfinItem(item)
      send({ phase: 'items', current: i + 1, total: items.length, title: String(mapped.title), imported, skipped, failed })

      try {
        // Vor der Duplikatprüfung: der Abgleich kann eine TMDb-ID nachliefern, mit
        // der ein bereits vorhandener Film überhaupt erst erkannt wird.
        if (tmdbCfg) mapped = await verifyAgainstTmdb(tmdbCfg, mapped)

        if (findDuplicate(db(), { tmdb_id: mapped.tmdb_id as number | null, title: mapped.title, year: mapped.year as number | null })) {
          skipped++
          continue
        }

        const created = createMovie(db(), mapped) as { id: number } | undefined
        if (!created?.id) {
          failed++
          errors.push(`${mapped.title}: konnte nicht angelegt werden.`)
          continue
        }

        const media: Record<string, string> = {}
        if (item.ImageTags?.Primary) {
          const file = await downloadImage(s, item.Id, 'Primary', jellyfinImageName(created.id, 'cover'))
          if (file) media.cover_path = `movie-resource://${file}`
        }
        if (item.BackdropImageTags?.length) {
          const file = await downloadImage(s, item.Id, 'Backdrop', jellyfinImageName(created.id, 'backdrop'))
          if (file) media.backdrop_path = `movie-resource://${file}`
        }
        if (Object.keys(media).length) {
          db().prepare(
            `UPDATE movies SET ${Object.keys(media).map(k => `${k} = ?`).join(', ')} WHERE id = ?`,
          ).run(...Object.values(media), created.id)
        }

        if (item.Type === 'Series') {
          await importSeries(s, created.id, item.Id)
        }

        imported++
      } catch (error: any) {
        failed++
        errors.push(`${mapped.title}: ${error.message}`)
      }
    }

    setSetting(db(), 'jellyfin_last_import_at', new Date().toISOString())
    send({ phase: 'done', current: items.length, total: items.length, title: '', imported, skipped, failed })
    return { success: true, imported, skipped, failed, errors }
  })
}
