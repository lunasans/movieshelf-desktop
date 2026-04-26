<template>
  <div class="p-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">{{ isSeries ? 'Serien' : 'Filme' }}</h1>
        <p class="text-sm text-[var(--text-muted)] opacity-60">{{ store.total }} {{ isSeries ? 'Serien' : 'Filme' }} in der Sammlung</p>
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
    <div v-if="!store.loading && store.movies.length === 0" class="text-center py-20">
      <template v-if="!settings.isOnline && !query">
        <i class="bi bi-cloud-slash text-3xl text-[var(--text-muted)] opacity-30 block mb-3"></i>
        <p class="text-[var(--text-muted)] opacity-60 text-sm mb-4">Lokale Datenbank ist leer.</p>
        <router-link to="/sync" class="text-[var(--status-red)] text-sm font-bold hover:underline">
          Jetzt mit Shelf synchronisieren →
        </router-link>
      </template>
      <template v-else>
        <p class="text-[var(--text-muted)] opacity-40 text-sm">Keine Filme gefunden.</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import { useMovieStore } from '@/stores/movies'
import { useSettingsStore } from '@/stores/settings'
import MovieCard from '@/components/movies/MovieCard.vue'

const route    = useRoute()
const store    = useMovieStore()
const settings = useSettingsStore()
const query    = ref('')

const isSeries = computed(() => route.path === '/series')
const listKey  = computed(() => isSeries.value ? 'Serie' : '!Serie')

let searchTimeout: ReturnType<typeof setTimeout>

function listParams(extra: Record<string, unknown> = {}) {
  return isSeries.value
    ? { collectionType: 'Serie', ...extra }
    : { excludeType: 'Serie', ...extra }
}

function getMain() { return document.querySelector('main') }

function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    store.fetchMovies(listParams({ q: query.value || undefined }))
  }, 300)
}

function handleScroll(e: Event) {
  if (store.loading || store.loadingMore || store.movies.length === 0 || store.movies.length >= store.total) return
  const target = e.target as HTMLElement
  if (target.scrollTop + target.clientHeight > target.scrollHeight - 500) {
    store.fetchMovies(listParams({ q: query.value || undefined, page: store.page + 1 }), true)
  }
}

async function loadList() {
  const q = route.query.q as string | undefined
  query.value = q ?? ''
  await store.fetchMovies(listParams(q ? { q } : {}))
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  const main = getMain()
  if (main) main.addEventListener('scroll', handleScroll)

  // Try to restore cached state (e.g. returning from movie detail)
  const scrollTop = store.restoreFromCache(listKey.value)
  if (scrollTop !== null && !route.query.q) {
    await nextTick()
    if (main) main.scrollTop = scrollTop
  } else {
    await loadList()
  }
})

onUnmounted(() => {
  getMain()?.removeEventListener('scroll', handleScroll)
})

// Save to cache before leaving (movie detail, settings, etc.)
onBeforeRouteLeave(() => {
  store.saveToCache(listKey.value, getMain()?.scrollTop ?? 0)
})

// ── Watchers ─────────────────────────────────────────────────────────────────

watch(() => route.query.q, () => { loadList() })

// Switching between /movies and /series — save old list, restore or fetch new
watch(() => route.path, async (newPath, oldPath) => {
  const listPaths = ['/movies', '/series']
  if (!listPaths.includes(newPath) || !listPaths.includes(oldPath)) return

  const oldKey = oldPath === '/series' ? 'Serie' : '!Serie'
  query.value = ''

  // Save current state under the old key
  store.saveToCache(oldKey, getMain()?.scrollTop ?? 0)

  // Restore or fetch for the new key
  const scrollTop = store.restoreFromCache(listKey.value)
  if (scrollTop !== null) {
    await nextTick()
    getMain()!.scrollTop = scrollTop
  } else {
    await loadList()
  }
})
</script>
