import axios from 'axios'
import { useApi } from '@/composables/useApi'
import { useSettingsStore } from '@/stores/settings'

const TMDB_BASE = 'https://api.themoviedb.org/3'

/**
 * Eine Quelle für alle TMDb-Abfragen — im Online-Betrieb über die Shelf,
 * sonst direkt.
 *
 * Der Schlüssel gehört dem Nutzer, nicht der App. Im Online-Betrieb liegt er
 * bereits in der Shelf; ihn dann zusätzlich hier zu verlangen, hiesse ihn
 * zweimal zu pflegen. Die Android-App holt sich mit Shelf ebenfalls alles von
 * dort — der Unterschied bleibt nur, dass die Desk-App danach lokal anlegt
 * und erst beim Abgleich hochschiebt.
 *
 * Die Antwortform ist in beiden Fällen dieselbe: Die Shelf ruft dieselben
 * TMDb-Endpunkte mit demselben `append_to_response` auf und reicht die
 * Antwort unverändert durch. Die Feld-Extraktion der Aufrufer bleibt damit
 * unangetastet.
 */
export function useTmdb() {
  const settings = useSettingsStore()
  const { apiGet, isOnline } = useApi()

  /** Ohne Shelf und ohne eigenen Schlüssel geht gar nichts. */
  const canQuery = () => isOnline.value || !!settings.tmdbApiKey

  function directParams(extra: Record<string, unknown> = {}) {
    return { api_key: settings.tmdbApiKey, language: settings.tmdbLanguage, ...extra }
  }

  async function search(type: 'movie' | 'tv', query: string): Promise<any> {
    if (isOnline.value) return await apiGet('/tmdb/search', { query, type })

    const { data } = await axios.get(`${TMDB_BASE}/search/${type}`, { params: directParams({ query }) })
    return data
  }

  async function details(type: 'movie' | 'tv', tmdbId: number): Promise<any> {
    if (isOnline.value) return await apiGet('/tmdb/details', { tmdb_id: tmdbId, type })

    // Dieselben Zusatzdaten, die auch die Shelf anfordert: Besetzung, Videos
    // und die Altersfreigabe - beim Film aus release_dates, bei der Serie aus
    // content_ratings.
    const append = type === 'tv' ? 'credits,videos,content_ratings' : 'credits,videos,release_dates'
    const { data } = await axios.get(`${TMDB_BASE}/${type}/${tmdbId}`, {
      params: directParams({ append_to_response: append }),
    })
    return data
  }

  /** Eine Staffel samt Episoden. */
  async function season(tmdbId: number, seasonNumber: number): Promise<any> {
    if (isOnline.value) return await apiGet('/tmdb/season', { tmdb_id: tmdbId, season: seasonNumber })

    const { data } = await axios.get(`${TMDB_BASE}/tv/${tmdbId}/season/${seasonNumber}`, {
      params: directParams(),
    })
    return data
  }

  return { canQuery, search, details, season, isOnline }
}
