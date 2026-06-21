import { ref, computed } from 'vue'
import axios from 'axios'
import { useApi } from '@/composables/useApi'
import { useSettingsStore } from '@/stores/settings'
import { useListStore } from '@/stores/lists'
import { useMovieStore } from '@/stores/movies'

const TMDB_BASE = 'https://api.themoviedb.org/3'

export interface TmdbResult {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  media_type?: 'movie' | 'tv'
}

export interface TmdbSeason {
  season_number: number
  name: string
  episode_count: number
  overview: string | null
}

export function useTmdbSearch() {
  const settings   = useSettingsStore()
  const listStore  = useListStore()
  const movieStore = useMovieStore()
  const { apiGet, isOnline } = useApi()

  const query              = ref('')
  const searchMode         = ref<'movie' | 'tv'>('movie')
  const results            = ref<TmdbResult[]>([])
  const loading            = ref(false)
  const importing          = ref<number | null>(null)
  const importedIds        = ref(new Set<number>())
  const error              = ref('')
  const toast              = ref('')
  const importToCollection = ref(true)
  const listPickerFor      = ref<number | null>(null)
  const previewForm        = ref<Record<string, any> | null>(null)
  const previewSource      = ref<TmdbResult | null>(null)
  const previewLoading     = ref(false)
  const tmdbSeasons        = ref<TmdbSeason[]>([])
  const selectedSeasons    = ref<number[]>([])

  let toastTimer: ReturnType<typeof setTimeout> | null = null

  const canSearch = computed(() => isOnline.value || settings.hasTmdb)

  function showToast(message: string) {
    if (toastTimer) clearTimeout(toastTimer)
    toast.value = message
    toastTimer = setTimeout(() => { toast.value = '' }, 3000)
  }

  async function search() {
    if (!query.value.trim()) return
    loading.value = true
    error.value   = ''
    results.value = []
    importedIds.value = new Set()
    try {
      if (searchMode.value === 'tv') {
        // TV search always goes directly to TMDb (server API only supports movies)
        const { data } = await axios.get(`${TMDB_BASE}/search/tv`, {
          params: { api_key: settings.tmdbApiKey, query: query.value, language: 'de-DE' }
        })
        results.value = (data.results ?? []).map((r: any) => ({
          id: r.id,
          title: r.name,
          poster_path: r.poster_path,
          release_date: r.first_air_date ?? '',
          media_type: 'tv' as const,
        }))
      } else if (isOnline.value) {
        const data = await apiGet('/tmdb/search', { query: query.value })
        results.value = data.results ?? []
      } else {
        const { data } = await axios.get(`${TMDB_BASE}/search/movie`, {
          params: { api_key: settings.tmdbApiKey, query: query.value, language: 'de-DE' }
        })
        results.value = data.results ?? []
      }
      if (results.value.length > 0) {
        const existing = await window.electron.db.movies.checkTmdbIds(results.value.map(r => r.id))
        importedIds.value = new Set(existing)
      }
    } catch (e: any) {
      error.value = e?.response?.data?.status_message ?? e.message ?? 'Suche fehlgeschlagen.'
    } finally {
      loading.value = false
    }
  }

  async function openPreview(result: TmdbResult) {
    if (previewLoading.value || importedIds.value.has(result.id)) return
    previewSource.value = result
    error.value = ''
    tmdbSeasons.value = []
    selectedSeasons.value = []

    const isTv = result.media_type === 'tv' || searchMode.value === 'tv'

    if (!settings.tmdbApiKey) {
      previewForm.value = {
        title: result.title,
        year: result.release_date ? parseInt(result.release_date.slice(0, 4)) : null,
        genre: '', director: '', runtime: null, rating: null, rating_age: null,
        overview: '', collection_type: isTv ? 'Serie' : 'Film', tag: '', trailer_url: '',
        tmdb_id: result.id,
        cover_path: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null,
        backdrop_path: null, actors_names: '',
        created_at: new Date().toISOString().slice(0, 10),
      }
      return
    }

    previewLoading.value = true
    try {
      if (isTv) {
        const detailRes = await axios.get(`${TMDB_BASE}/tv/${result.id}`, {
          params: { api_key: settings.tmdbApiKey, language: 'de-DE', append_to_response: 'credits,videos,content_ratings' }
        })
        const m = detailRes.data
        const creator = (m.created_by ?? [])[0]?.name ?? ''
        const trailer = (m.videos?.results ?? []).find((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))

        previewForm.value = {
          title:           m.name,
          year:            m.first_air_date ? parseInt(m.first_air_date.slice(0, 4)) : null,
          genre:           (m.genres ?? []).map((g: any) => g.name).join(', '),
          director:        creator,
          runtime:         (m.episode_run_time ?? [])[0] ?? null,
          rating:          m.vote_average != null ? Math.round(m.vote_average * 10) / 10 : null,
          rating_age:      null,
          overview:        m.overview ?? '',
          collection_type: 'Serie',
          tag:             '',
          trailer_url:     trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '',
          tmdb_id:         m.id,
          cover_path:      m.poster_path    ? `https://image.tmdb.org/t/p/w500${m.poster_path}`    : null,
          backdrop_path:   m.backdrop_path  ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
          actors_names:    (m.credits?.cast ?? []).slice(0, 10).map((c: any) => c.name).join(', '),
          created_at:      new Date().toISOString().slice(0, 10),
        }

        // Build season list, skip season 0 (Specials)
        const seasons: TmdbSeason[] = (m.seasons ?? [])
          .filter((s: any) => s.season_number > 0)
          .map((s: any) => ({
            season_number: s.season_number,
            name: s.name,
            episode_count: s.episode_count,
            overview: s.overview || null,
          }))
        tmdbSeasons.value = seasons
        selectedSeasons.value = seasons.map(s => s.season_number)

      } else {
        const [detailRes, videoRes] = await Promise.all([
          axios.get(`${TMDB_BASE}/movie/${result.id}`, {
            params: { api_key: settings.tmdbApiKey, language: 'de-DE', append_to_response: 'credits' }
          }),
          axios.get(`${TMDB_BASE}/movie/${result.id}/videos`, {
            params: { api_key: settings.tmdbApiKey, language: 'de-DE' }
          }).catch(() => ({ data: { results: [] } }))
        ])
        const m        = detailRes.data
        const director = (m.credits?.crew ?? []).find((c: any) => c.job === 'Director')?.name ?? ''
        const trailer  = (videoRes.data.results ?? []).find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
        previewForm.value = {
          title:           m.title,
          year:            m.release_date ? parseInt(m.release_date.slice(0, 4)) : null,
          genre:           (m.genres ?? []).map((g: any) => g.name).join(', '),
          director,
          runtime:         m.runtime ?? null,
          rating:          m.vote_average != null ? Math.round(m.vote_average * 10) / 10 : null,
          rating_age:      null,
          overview:        m.overview ?? '',
          collection_type: 'Film',
          tag:             '',
          trailer_url:     trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '',
          tmdb_id:         m.id,
          cover_path:      m.poster_path    ? `https://image.tmdb.org/t/p/w500${m.poster_path}`    : null,
          backdrop_path:   m.backdrop_path  ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
          actors_names:    (m.credits?.cast ?? []).slice(0, 10).map((c: any) => c.name).join(', '),
          created_at:      new Date().toISOString().slice(0, 10),
        }
      }
    } catch (e: any) {
      error.value = `Fehler beim Laden: ${e?.response?.data?.status_message ?? e.message}`
      previewSource.value = null
    } finally {
      previewLoading.value = false
    }
  }

  async function downloadImages(movie: any, coverUrl: string | null, backdropUrl: string | null) {
    console.log('[TMDb] downloadImages movie.id=%o coverUrl=%o backdropUrl=%o', movie?.id, coverUrl, backdropUrl)
    if (!movie?.id) { console.warn('[TMDb] downloadImages aborted: movie.id fehlt', movie); return }
    const updates: Record<string, string> = {}
    if (coverUrl) {
      const res = await window.electron.db.movies.download(coverUrl, movie.id, 'cover')
      console.log('[TMDb] cover download result:', res)
      if (res?.success) updates.cover_path = `movie-resource://${movie.id}.jpg`
      else console.warn('[TMDb] cover download fehlgeschlagen:', res?.error)
    } else {
      console.warn('[TMDb] kein coverUrl – Cover wird nicht heruntergeladen')
    }
    if (backdropUrl) {
      const res = await window.electron.db.movies.download(backdropUrl, movie.id, 'backdrop')
      console.log('[TMDb] backdrop download result:', res)
      if (res?.success) updates.backdrop_path = `movie-resource://${movie.id}_backdrop.jpg`
      else console.warn('[TMDb] backdrop download fehlgeschlagen:', res?.error)
    } else {
      console.warn('[TMDb] kein backdropUrl – Backdrop wird nicht heruntergeladen')
    }
    console.log('[TMDb] DB-Update mit:', updates)
    if (Object.keys(updates).length) await window.electron.db.movies.update(movie.id, updates)
  }

  async function importSeasons(movieId: number, tmdbId: number) {
    let numsToImport = [...selectedSeasons.value]

    // If no seasons were selected/loaded yet, fetch all from TMDb
    if (numsToImport.length === 0) {
      try {
        const { data: show } = await axios.get(`${TMDB_BASE}/tv/${tmdbId}`, {
          params: { api_key: settings.tmdbApiKey, language: 'de-DE' }
        })
        numsToImport = (show.seasons ?? [])
          .filter((s: any) => s.season_number > 0)
          .map((s: any) => s.season_number)
      } catch { return }
    }

    for (const seasonNum of numsToImport) {
      try {
        const { data } = await axios.get(`${TMDB_BASE}/tv/${tmdbId}/season/${seasonNum}`, {
          params: { api_key: settings.tmdbApiKey, language: 'de-DE' }
        })
        const knownSeason = tmdbSeasons.value.find(s => s.season_number === seasonNum)
        const seasonId = await window.electron.db.seasons.upsert({
          movie_id: movieId,
          season_number: seasonNum,
          title: knownSeason?.name ?? data.name ?? null,
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
      } catch { /* continue with remaining seasons */ }
    }
  }

  async function confirmImport() {
    if (!previewForm.value || !previewSource.value) return
    const result = previewSource.value
    importing.value = result.id
    error.value = ''
    try {
      const coverUrl    = previewForm.value.cover_path
      const backdropUrl = previewForm.value.backdrop_path
      console.log('[TMDb] confirmImport start – coverUrl=%o backdropUrl=%o', coverUrl, backdropUrl)
      const movie = await window.electron.db.movies.create({
        ...previewForm.value,
        in_collection: importToCollection.value ? 1 : 0,
        remote_id: null,
      }) as any

      console.log('[TMDb] confirmImport – erstellter Film:', movie)
      await downloadImages(movie, coverUrl, backdropUrl)

      // Import seasons if: specific seasons selected OR seasons were never loaded (auto-fetch all).
      // Skip only when user explicitly chose "Keine" (tmdbSeasons loaded but selectedSeasons empty).
      const userChoseNone = tmdbSeasons.value.length > 0 && selectedSeasons.value.length === 0
      if (previewForm.value.collection_type === 'Serie' && previewForm.value.tmdb_id && settings.tmdbApiKey && !userChoseNone) {
        await importSeasons(movie.id, previewForm.value.tmdb_id)
      }

      importedIds.value = new Set(importedIds.value).add(result.id)
      movieStore.clearCache()
      showToast(`„${previewForm.value.title}" wurde zur Sammlung hinzugefügt.`)
      previewForm.value   = null
      previewSource.value = null
      tmdbSeasons.value   = []
      selectedSeasons.value = []
    } catch (e: any) {
      error.value = `Import fehlgeschlagen: ${e?.response?.data?.status_message ?? e.message}`
    } finally {
      importing.value = null
    }
  }

  async function importLocally(tmdbId: number, inCollection = 1) {
    const [detailRes, videoRes] = await Promise.all([
      axios.get(`${TMDB_BASE}/movie/${tmdbId}`, {
        params: { api_key: settings.tmdbApiKey, language: 'de-DE', append_to_response: 'credits' }
      }),
      axios.get(`${TMDB_BASE}/movie/${tmdbId}/videos`, {
        params: { api_key: settings.tmdbApiKey, language: 'de-DE' }
      }).catch(() => ({ data: { results: [] } }))
    ])
    const m        = detailRes.data
    const director = (m.credits?.crew ?? []).find((c: any) => c.job === 'Director')?.name ?? ''
    const trailer  = (videoRes.data.results ?? []).find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
    const movie = await window.electron.db.movies.create({
      title: m.title, year: m.release_date ? parseInt(m.release_date.slice(0, 4)) : null,
      genre: (m.genres ?? []).map((g: any) => g.name).join(', '), director,
      runtime: m.runtime ?? null, rating: m.vote_average ?? null, rating_age: null,
      overview: m.overview ?? '',
      cover_path:    m.poster_path   ? `https://image.tmdb.org/t/p/w500${m.poster_path}`    : null,
      backdrop_path: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
      actors_names: (m.credits?.cast ?? []).slice(0, 10).map((c: any) => c.name).join(', '),
      trailer_url: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '',
      collection_type: 'Film', tag: null, tmdb_id: m.id, remote_id: null, in_collection: inCollection,
    })
    await downloadImages(
      movie,
      m.poster_path   ? `https://image.tmdb.org/t/p/w500${m.poster_path}`    : null,
      m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
    )
    return movie
  }

  async function addToList(result: TmdbResult, listId: number) {
    listPickerFor.value = null
    try {
      const isTv = result.media_type === 'tv' || searchMode.value === 'tv'
      // Als EXTERNEN Film (nicht in der Sammlung) anlegen bzw. vorhandenen wiederverwenden.
      let ext = await window.electron.db.external.getByTmdbId(result.id) as any
      if (!ext?.id) {
        ext = await window.electron.db.external.create({
          title: result.title,
          year: result.release_date ? parseInt(result.release_date.slice(0, 4)) : null,
          tmdb_id: result.id,
          collection_type: isTv ? 'Serie' : 'Film',
          cover_path: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null,
        })
      }
      if (ext?.id) {
        await listStore.addItem(listId, 'external', ext.id)
        const listName = listStore.lists.find(l => l.id === listId)?.name ?? 'Liste'
        showToast(`„${result.title}" zu „${listName}" hinzugefügt.`)
      }
    } catch (e: any) {
      error.value = `Fehler: ${e.message}`
    }
  }

  return {
    query, searchMode, results, loading, importing, importedIds, error, toast,
    importToCollection, listPickerFor, previewForm, previewSource, previewLoading,
    tmdbSeasons, selectedSeasons,
    canSearch, search, openPreview, confirmImport, addToList,
  }
}
