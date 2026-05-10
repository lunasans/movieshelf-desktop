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
}

export function useTmdbSearch() {
  const settings   = useSettingsStore()
  const listStore  = useListStore()
  const movieStore = useMovieStore()
  const { apiGet, isOnline } = useApi()

  const query              = ref('')
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
      if (isOnline.value) {
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

    if (!settings.tmdbApiKey) {
      previewForm.value = {
        title: result.title,
        year: result.release_date ? parseInt(result.release_date.slice(0, 4)) : null,
        genre: '', director: '', runtime: null, rating: null, rating_age: null,
        overview: '', collection_type: 'Film', tag: '', trailer_url: '',
        tmdb_id: result.id,
        cover_path: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null,
        backdrop_path: null, actors_names: '',
        created_at: new Date().toISOString().slice(0, 10),
      }
      return
    }

    previewLoading.value = true
    try {
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
    } catch (e: any) {
      error.value = `Fehler beim Laden: ${e?.response?.data?.status_message ?? e.message}`
      previewSource.value = null
    } finally {
      previewLoading.value = false
    }
  }

  async function downloadImages(movie: any, coverUrl: string | null, backdropUrl: string | null) {
    if (!movie?.id) return
    const updates: Record<string, string> = {}
    if (coverUrl) {
      const res = await window.electron.db.movies.download(coverUrl, movie.id, 'cover')
      if (res?.success) updates.cover_path = `movie-resource://${movie.id}.jpg`
    }
    if (backdropUrl) {
      const res = await window.electron.db.movies.download(backdropUrl, movie.id, 'backdrop')
      if (res?.success) updates.backdrop_path = `movie-resource://${movie.id}_backdrop.jpg`
    }
    if (Object.keys(updates).length) await window.electron.db.movies.update(movie.id, updates)
  }

  async function confirmImport() {
    if (!previewForm.value || !previewSource.value) return
    const result = previewSource.value
    importing.value = result.id
    error.value = ''
    try {
      const coverUrl    = previewForm.value.cover_path
      const backdropUrl = previewForm.value.backdrop_path
      const movie = await window.electron.db.movies.create({
        ...previewForm.value,
        in_collection: importToCollection.value ? 1 : 0,
        remote_id: null,
      })
      await downloadImages(movie, coverUrl, backdropUrl)
      importedIds.value = new Set(importedIds.value).add(result.id)
      movieStore.clearCache()
      showToast(`„${previewForm.value.title}" wurde zur Sammlung hinzugefügt.`)
      previewForm.value   = null
      previewSource.value = null
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
      const existing = await window.electron.db.movies.getByRemoteId(result.id) as any
      const localId: number = existing?.id ?? (await importLocally(result.id, 0) as any)?.id
      if (localId) {
        await listStore.addMovie(listId, localId)
        const listName = listStore.lists.find(l => l.id === listId)?.name ?? 'Liste'
        showToast(`„${result.title}" zu „${listName}" hinzugefügt.`)
      }
    } catch (e: any) {
      error.value = `Fehler: ${e.message}`
    }
  }

  return {
    query, results, loading, importing, importedIds, error, toast,
    importToCollection, listPickerFor, previewForm, previewSource, previewLoading,
    canSearch, search, openPreview, confirmImport, addToList,
  }
}
