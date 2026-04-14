<template>
  <div class="p-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">Filme</h1>
        <p class="text-sm text-[var(--text-muted)] opacity-60">{{ store.total }} Filme in der Sammlung</p>
      </div>
      <router-link
        to="/movies/new"
        class="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
      >
        <i class="bi bi-plus-lg"></i> Film hinzufügen
      </router-link>
    </div>

    <!-- Search -->
    <div class="relative mb-6">
      <i class="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-40"></i>
      <input
        v-model="query"
        @input="onSearch"
        type="text"
        placeholder="Titel, Regisseur, Genre suchen..."
        class="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl pl-12 pr-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-red-500/50 transition-colors"
      />
    </div>

    <!-- Loading (Initial) -->
    <div v-if="store.loading && !store.loadingMore" class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Grid -->
    <div v-else :class="{ 'opacity-50': store.loading && !store.loadingMore }" class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6">
      <MovieCard
        v-for="movie in store.movies"
        :key="movie.id"
        :movie="movie"
        @delete="store.deleteMovie(movie.id)"
      />
    </div>

    <!-- Loading More -->
    <div v-if="store.loadingMore" class="flex items-center justify-center py-10">
      <div class="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Empty -->
    <div v-if="!store.loading && store.movies.length === 0" class="text-center py-20 text-[var(--text-muted)] opacity-40 text-sm">
      Keine Filme gefunden.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMovieStore } from '@/stores/movies'
import MovieCard from '@/components/movies/MovieCard.vue'

const route = useRoute()
const store = useMovieStore()
const query = ref('')

let searchTimeout: ReturnType<typeof setTimeout>

function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    store.fetchMovies({ q: query.value || undefined })
  }, 300)
}

function handleScroll(e: Event) {
  // Prevent double fetching or fetching when all movies are loaded
  if (store.loading || store.loadingMore || store.movies.length === 0 || store.movies.length >= store.total) {
    return
  }

  const target = e.target as HTMLElement
  const scrollBottom = target.scrollTop + target.clientHeight
  // Trigger earlier (500px from bottom) for smoother experience
  const threshold = target.scrollHeight - 500

  if (scrollBottom > threshold) {
    store.fetchMovies({ 
      q: query.value || undefined, 
      page: store.page + 1 
    }, true)
  }
}

function handleQueryChange() {
  const q = route.query.q as string
  if (q) {
    query.value = q
    store.fetchMovies({ q })
  } else {
    query.value = ''
    store.fetchMovies()
  }
}

onMounted(() => {
  handleQueryChange()
  const main = document.querySelector('main')
  if (main) main.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  const main = document.querySelector('main')
  if (main) main.removeEventListener('scroll', handleScroll)
})

// Watch for query changes (e.g. searching for a different actor while already on the movies view)
watch(() => route.query.q, () => {
  handleQueryChange()
})
</script>
