<template>
  <div v-if="list" class="p-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <router-link to="/lists" class="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--bg-card)] border border-[var(--border-ui)] hover:border-red-500/50 transition-colors text-[var(--text-muted)]">
          <i class="bi bi-arrow-left text-sm"></i>
        </router-link>
        <div>
          <h1 class="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">{{ list.name }}</h1>
          <p class="text-sm text-[var(--text-muted)] opacity-60">{{ list.movies.length }} {{ list.movies.length === 1 ? 'Film' : 'Filme' }}</p>
        </div>
      </div>
      <button
        @click="showAddModal = true"
        class="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
      >
        <i class="bi bi-plus-lg"></i> Film hinzufügen
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Grid -->
    <div v-else-if="list.movies.length > 0" class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6">
      <div
        v-for="movie in list.movies"
        :key="movie.id"
        class="group cursor-pointer"
        @click="router.push(`/movies/${movie.id}`)"
      >
        <div class="relative aspect-[2/3] rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-ui)] group-hover:border-red-500/50 group-hover:scale-105 transition-all duration-300 shadow-[var(--shadow-main)]">
          <img
            v-if="resolveMediaUrl(movie.cover_url || movie.cover_path, movie.remote_id ?? undefined)"
            :src="resolveMediaUrl(movie.cover_url || movie.cover_path, movie.remote_id ?? undefined)!"
            :alt="movie.title"
            class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          <div v-else class="w-full h-full bg-gradient-to-br from-[var(--bg-app)] via-[var(--bg-sidebar)] to-[var(--bg-app)] flex flex-col items-center justify-center p-4 text-center">
            <i class="bi bi-film text-[var(--text-muted)] opacity-20 text-4xl mb-3"></i>
            <span class="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-tight leading-snug line-clamp-4">{{ movie.title }}</span>
          </div>

          <!-- Hover overlay -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
            <button
              @click.stop="removeFromList(movie.id)"
              class="w-full bg-red-600/80 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <i class="bi bi-dash-lg"></i> Entfernen
            </button>
          </div>
        </div>

        <div class="mt-2 px-1">
          <p class="text-[12px] font-black text-[var(--text-main)] truncate uppercase tracking-tight opacity-90">{{ movie.title }}</p>
          <p class="text-[10px] text-[var(--text-muted)] font-bold">{{ movie.year }}</p>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="text-center py-20 text-[var(--text-muted)] opacity-40 text-sm">
      <i class="bi bi-collection text-4xl block mb-4 opacity-30"></i>
      Diese Liste ist noch leer.
      <button @click="showAddModal = true" class="block mx-auto mt-4 text-red-500 hover:text-red-400 opacity-100 font-bold transition-colors">
        + Film hinzufügen
      </button>
    </div>
  </div>

  <div v-else-if="!loading" class="flex items-center justify-center py-20 text-[var(--text-muted)] opacity-40">
    Liste nicht gefunden.
  </div>

  <!-- Add Movie Modal -->
  <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="closeAddModal">
    <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
      <h2 class="text-lg font-black text-[var(--text-main)] uppercase tracking-tight mb-4">Film hinzufügen</h2>

      <input
        v-model="searchQuery"
        @input="onSearch"
        type="text"
        placeholder="Film suchen..."
        class="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-red-500/50 transition-colors mb-3"
        autofocus
      />

      <div class="max-h-80 overflow-y-auto space-y-1 custom-scrollbar">
        <div v-if="searchResults.length === 0 && searchQuery.length > 0" class="text-center py-8 text-[var(--text-muted)] opacity-40 text-sm">
          Keine Filme gefunden.
        </div>
        <div v-else-if="searchQuery.length === 0" class="text-center py-8 text-[var(--text-muted)] opacity-40 text-sm">
          Suchbegriff eingeben…
        </div>
        <div
          v-for="movie in searchResults"
          :key="movie.id"
          @click="addMovie(movie)"
          class="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors group"
        >
          <div class="w-8 aspect-[2/3] rounded-lg overflow-hidden bg-[var(--bg-app)] border border-[var(--border-ui)] flex-shrink-0">
            <img
              v-if="resolveMediaUrl(movie.cover_url || movie.cover_path, movie.remote_id ?? undefined)"
              :src="resolveMediaUrl(movie.cover_url || movie.cover_path, movie.remote_id ?? undefined)!"
              :alt="movie.title"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-[var(--text-muted)] opacity-20 text-xs">
              <i class="bi bi-film"></i>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-[var(--text-main)] truncate">{{ movie.title }}</p>
            <p class="text-xs text-[var(--text-muted)] opacity-60">{{ movie.year }} · {{ movie.genre }}</p>
          </div>
          <i v-if="isInList(movie.id)" class="bi bi-check-circle-fill text-red-500 text-lg flex-shrink-0"></i>
          <i v-else class="bi bi-plus-circle text-[var(--text-muted)] opacity-0 group-hover:opacity-60 text-lg flex-shrink-0 transition-opacity"></i>
        </div>
      </div>

      <div class="flex justify-end mt-4">
        <button @click="closeAddModal" class="bg-[var(--bg-elevated)] hover:bg-[var(--bg-sidebar)] text-[var(--text-muted)] font-bold py-2 px-5 rounded-xl transition-colors text-sm">
          Schließen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import type { Movie } from '@/stores/movies'
import type { MovieListDetail } from '@/stores/lists'

const route = useRoute()
const router = useRouter()
const { resolveMediaUrl } = useApi()

const list = ref<MovieListDetail | null>(null)
const loading = ref(true)

const showAddModal = ref(false)
const searchQuery = ref('')
const searchResults = ref<Movie[]>([])
let searchTimeout: ReturnType<typeof setTimeout> | null = null

async function load() {
  loading.value = true
  try {
    list.value = (await window.electron.db.lists.get(Number(route.params.id))) as MovieListDetail
  } finally {
    loading.value = false
  }
}

function isInList(movieId: number): boolean {
  return !!list.value?.movies.some(m => m.id === movieId)
}

function onSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(runSearch, 250)
}

async function runSearch() {
  const q = searchQuery.value.trim()
  if (!q) { searchResults.value = []; return }
  const result = await window.electron.db.movies.list({ q, perPage: 30 })
  searchResults.value = result.data as Movie[]
}

async function addMovie(movie: Movie) {
  if (!list.value || isInList(movie.id)) return
  await window.electron.db.lists.addMovie(list.value.id, movie.id)
  list.value.movies = [...list.value.movies, movie]
}

async function removeFromList(movieId: number) {
  if (!list.value) return
  await window.electron.db.lists.removeMovie(list.value.id, movieId)
  list.value.movies = list.value.movies.filter(m => m.id !== movieId)
}

function closeAddModal() {
  showAddModal.value = false
  searchQuery.value = ''
  searchResults.value = []
}

onMounted(load)
</script>
