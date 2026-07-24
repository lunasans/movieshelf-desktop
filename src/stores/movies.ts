import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Movie {
  id: number
  title: string
  year: number | null
  genre: string | null
  director: string | null
  runtime: number | null
  rating: number | null
  rating_age: number | null
  overview: string | null
  cover_path: string | null
  cover_url?: string | null
  backdrop_path: string | null
  backdrop_url?: string | null
  actors_names: string | null
  trailer_url: string | null
  edition: string | null
  region_code: string | null
  disc_location: string | null
  purchase_date: string | null
  purchase_price: number | null
  condition: string | null
  collection_type: string
  tag: string | null
  tmdb_id: number | null
  remote_id: number | null
  collection_no?: number | null
  is_boxset: number | null
  boxset_parent_id: number | null
  is_watched: number
  created_at: string
  updated_at: string
}

interface ListState {
  movies: Movie[]
  total: number
  page: number
  scrollTop: number
}

export const useMovieStore = defineStore('movies', () => {
  const movies         = ref<Movie[]>([])
  const total          = ref(0)
  const loading        = ref(false)
  const loadingMore    = ref(false)
  const page           = ref(1)
  const perPage        = ref(30)
  const sortBy         = ref<'title' | 'year' | 'runtime' | 'rating' | 'created_at'>('title')
  const sortDir        = ref<'ASC' | 'DESC'>('ASC')
  const selectedGenres = ref<string[]>([])
  const bulkMode       = ref(false)
  const selectedIds    = ref<number[]>([])

  const cache = new Map<string, ListState>()

  function saveToCache(key: string, scrollTop: number) {
    cache.set(key, { movies: [...movies.value], total: total.value, page: page.value, scrollTop })
  }

  function restoreFromCache(key: string): number | null {
    const s = cache.get(key)
    if (!s || !s.movies.length) return null
    movies.value = s.movies
    total.value  = s.total
    page.value   = s.page
    return s.scrollTop
  }

  async function fetchMovies(
    params: {
      q?: string; page?: number; collectionType?: string; excludeType?: string
      sortBy?: string; sortDir?: string; genres?: string[]
    } = {},
    append = false
  ) {
    if (!append) {
      loading.value = true
      page.value = 1
    } else {
      loadingMore.value = true
    }

    try {
      const currentPage    = params.page ?? page.value
      const currentPerPage = perPage.value
      const result    = await window.electron.db.movies.list({ ...params, page: currentPage, perPage: currentPerPage } as Parameters<typeof window.electron.db.movies.list>[0])
      const newMovies = result.data as Movie[]
      movies.value = append ? [...movies.value, ...newMovies] : newMovies
      total.value  = result.total
      page.value   = result.page
    } finally {
      loading.value     = false
      loadingMore.value = false
    }
  }

  async function deleteMovie(id: number) {
    await window.electron.db.movies.delete(id)
    movies.value = movies.value.filter(m => m.id !== id)
    total.value--
  }

  async function toggleMovieWatched(id: number) {
    const result = await window.electron.db.movies.toggleWatched(id)
    const movie = movies.value.find(m => m.id === id)
    if (movie) movie.is_watched = result.is_watched ? 1 : 0
    return result
  }

  async function bulkDeleteSelected() {
    const ids = [...selectedIds.value]
    if (!ids.length) return { deleted: 0 }
    const result = await window.electron.db.movies.bulkDelete(ids)
    movies.value = movies.value.filter(m => !selectedIds.value.includes(m.id))
    total.value -= result.deleted
    selectedIds.value = []
    bulkMode.value = false
    return result
  }

  async function bulkTagSelected(tag: string) {
    const ids = [...selectedIds.value]
    if (!ids.length) return { updated: 0 }
    const result = await window.electron.db.movies.bulkTag(ids, tag)
    for (const movie of movies.value) {
      if (selectedIds.value.includes(movie.id)) movie.tag = tag
    }
    selectedIds.value = []
    return result
  }

  function toggleSelect(id: number) {
    const idx = selectedIds.value.indexOf(id)
    if (idx >= 0) selectedIds.value.splice(idx, 1)
    else selectedIds.value.push(id)
  }

  function clearCache(key?: string) {
    if (key) cache.delete(key)
    else cache.clear()
  }

  return {
    movies, total, loading, loadingMore, page, perPage,
    sortBy, sortDir, selectedGenres, bulkMode, selectedIds,
    fetchMovies, deleteMovie, saveToCache, restoreFromCache, clearCache,
    toggleMovieWatched, bulkDeleteSelected, bulkTagSelected, toggleSelect,
  }
})
