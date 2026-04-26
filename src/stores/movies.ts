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
  collection_type: string
  tag: string | null
  tmdb_id: number | null
  remote_id: number | null
  is_boxset: number | null
  boxset_parent_id: number | null
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
  const movies      = ref<Movie[]>([])
  const total       = ref(0)
  const loading     = ref(false)
  const loadingMore = ref(false)
  const page        = ref(1)
  const perPage     = ref(30)

  // Per-list cache so switching between Filme / Serien restores full state
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
    params: { q?: string; page?: number; collectionType?: string; excludeType?: string } = {},
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

      const result    = await window.electron.db.movies.list({ ...params, page: currentPage, perPage: currentPerPage })
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

  return { movies, total, loading, loadingMore, page, perPage, fetchMovies, deleteMovie, saveToCache, restoreFromCache }
})
