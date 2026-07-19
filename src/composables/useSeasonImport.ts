import axios from 'axios'
import { useSettingsStore } from '@/stores/settings'

const TMDB_BASE = 'https://api.themoviedb.org/3'

export interface SeasonOption {
  season_number: number
  name: string
  episode_count: number
  overview: string | null
  poster_path: string | null
}

/**
 * Gemeinsame Staffel-Import-Logik (TMDb → lokale DB) für den
 * TMDb-Serien-Import und das Staffel-Nachladen auf der Detailseite.
 */
export function useSeasonImport() {
  const settings = useSettingsStore()

  function mapSeasons(raw: any[]): SeasonOption[] {
    return (raw ?? [])
      .filter((s: any) => s.season_number > 0)
      .map((s: any) => ({
        season_number: s.season_number,
        name: s.name,
        episode_count: s.episode_count,
        overview: s.overview || null,
        poster_path: s.poster_path ?? null,
      }))
  }

  /** Staffel-Liste einer Serie direkt von TMDb (Standalone, braucht API-Key). */
  async function fetchTvSeasons(tmdbId: number): Promise<SeasonOption[]> {
    const { data } = await axios.get(`${TMDB_BASE}/tv/${tmdbId}`, {
      params: { api_key: settings.tmdbApiKey, language: settings.tmdbLanguage },
    })
    return mapSeasons(data.seasons)
  }

  /**
   * Importiert die angegebenen Staffeln inkl. Episoden von TMDb in die
   * lokale DB (Upserts — vorhandene Staffeln werden aktualisiert, nicht
   * dupliziert). Fehler einzelner Staffeln brechen den Rest nicht ab.
   */
  async function importSeasonsLocally(
    movieId: number,
    tmdbId: number,
    seasonNumbers: number[],
    knownNames: Record<number, string> = {},
  ): Promise<void> {
    for (const seasonNum of seasonNumbers) {
      try {
        const { data } = await axios.get(`${TMDB_BASE}/tv/${tmdbId}/season/${seasonNum}`, {
          params: { api_key: settings.tmdbApiKey, language: settings.tmdbLanguage },
        })
        const seasonId = await window.electron.db.seasons.upsert({
          movie_id: movieId,
          season_number: seasonNum,
          title: knownNames[seasonNum] ?? data.name ?? null,
          overview: data.overview ?? null,
        })
        if (seasonId != null && Array.isArray(data.episodes)) {
          for (const ep of data.episodes) {
            await window.electron.db.episodes.upsert({
              season_id: seasonId,
              episode_number: ep.episode_number,
              title: ep.name ?? null,
              overview: ep.overview ?? null,
            })
          }
        }
      } catch { /* mit den restlichen Staffeln fortfahren */ }
    }
  }

  return { mapSeasons, fetchTvSeasons, importSeasonsLocally }
}
