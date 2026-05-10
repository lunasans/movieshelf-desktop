<template>
  <div class="p-8">
    <h1 class="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">TMDb Suche</h1>
    <p class="text-sm text-[var(--text-muted)] opacity-60 mb-6">Film in TMDb suchen und zur Sammlung hinzufügen</p>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast" class="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[var(--bg-elevated)] border border-[var(--status-green)]/30 rounded-2xl px-5 py-3.5 shadow-xl">
        <i class="bi bi-check-circle-fill text-[var(--status-green)] text-lg"></i>
        <span class="text-sm font-bold text-[var(--text-main)]">{{ toast }}</span>
      </div>
    </Transition>

    <!-- No API key and offline -->
    <div v-if="!canSearch" class="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-ui)] p-8 text-center">
      <i class="bi bi-key text-4xl text-[var(--text-muted)] opacity-30 block mb-4"></i>
      <p class="text-sm font-bold text-[var(--text-main)] mb-1">Kein TMDb API Key hinterlegt</p>
      <p class="text-xs text-[var(--text-muted)] opacity-60 max-w-xs mx-auto mb-4">
        Bitte hinterlege einen TMDb API Key in den Einstellungen oder verbinde dich mit deiner MovieShelf.
      </p>
      <router-link to="/settings"
        class="inline-block px-5 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-ui)] rounded-xl text-xs font-black uppercase tracking-widest text-[var(--text-main)] hover:border-red-500/40 transition-all">
        Zu den Einstellungen →
      </router-link>
    </div>

    <template v-else>
      <!-- Search bar -->
      <div class="flex gap-3 mb-6">
        <input
          v-model="query"
          @keyup.enter="search"
          type="text"
          placeholder="Filmtitel eingeben..."
          class="flex-1 bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-red-500/50 transition-colors"
        />
        <button
          @click="search"
          :disabled="loading"
          class="bg-[var(--status-red)] hover:opacity-90 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl transition-all text-sm"
        >
          Suchen
        </button>
      </div>

      <!-- Import Options -->
      <div class="flex items-center justify-end gap-3 mb-6 bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl px-5 py-3">
        <span class="text-sm font-bold text-[var(--text-main)] opacity-70">In Sammlung aufnehmen</span>
        <button 
          @click="importToCollection = !importToCollection"
          class="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none"
          :class="importToCollection ? 'bg-[var(--status-red)]' : 'bg-[var(--bg-elevated)] border border-[var(--border-ui)]'"
        >
          <div 
            class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200"
            :class="importToCollection ? 'translate-x-6' : 'translate-x-0'"
          ></div>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-16">
        <div class="w-8 h-8 border-2 border-[var(--status-red)] border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-[var(--status-red-bg)] border border-[var(--status-red)]/20 rounded-2xl p-4 mb-6">
        <p class="text-[var(--status-red)] text-sm font-bold">{{ error }}</p>
      </div>

      <!-- Results -->
      <div v-else class="grid grid-cols-4 xl:grid-cols-6 gap-4">
        <div
          v-for="result in results"
          :key="result.id"
          class="group relative"
        >
          <div
            class="relative aspect-[2/3] rounded-2xl overflow-hidden bg-[var(--bg-card)] border transition-all duration-300"
            :class="importedIds.has(result.id)
              ? 'border-[var(--status-green)]/50'
              : 'border-[var(--border-ui)] hover:border-[var(--status-red)]/50 group-hover:scale-105'"
          >
            <img
              v-if="result.poster_path"
              :src="`https://image.tmdb.org/t/p/w300${result.poster_path}`"
              :alt="result.title"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <i class="bi bi-camera-video text-[var(--text-muted)] opacity-20 text-3xl"></i>
            </div>

            <!-- Imported overlay -->
            <div v-if="importedIds.has(result.id)" class="absolute inset-0 bg-black/50 flex items-center justify-center">
              <i class="bi bi-check-circle-fill text-[var(--status-green)] text-4xl"></i>
            </div>

            <!-- Hover overlay -->
            <div v-else class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-stretch justify-end p-2 gap-1.5">
              <span v-if="importing === result.id || (previewLoading && previewSource?.id === result.id)" class="text-[10px] font-black text-white uppercase tracking-widest flex items-center justify-center gap-1 py-1">
                <span class="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></span>
                Lädt...
              </span>
              <template v-else>
                <button
                  @click.stop="openPreview(result)"
                  class="w-full bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-colors"
                >
                  <i class="bi bi-plus-lg mr-1"></i>Sammlung
                </button>
                <button
                  @click.stop="listPickerFor = listPickerFor === result.id ? null : result.id"
                  class="w-full bg-white/20 hover:bg-white/30 text-white text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-colors"
                >
                  <i class="bi bi-collection-fill mr-1"></i>Liste
                </button>
              </template>
            </div>
          </div>

          <!-- List picker dropdown -->
          <div
            v-if="listPickerFor === result.id"
            class="absolute z-50 top-full mt-1 left-0 right-0 bg-[var(--bg-elevated)] border border-[var(--border-ui)] rounded-xl shadow-xl overflow-hidden"
          >
            <div v-if="listStore.lists.length === 0" class="px-3 py-2 text-xs text-[var(--text-muted)] opacity-50">Keine Listen vorhanden</div>
            <button
              v-for="list in listStore.lists"
              :key="list.id"
              @click.stop="addToList(result, list.id)"
              class="w-full text-left px-3 py-2 text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors truncate"
            >
              <i class="bi bi-collection-fill text-red-500 mr-2"></i>{{ list.name }}
            </button>
          </div>

          <p class="mt-2 text-xs font-bold truncate"
            :class="importedIds.has(result.id) ? 'text-[var(--status-green)]' : 'text-[var(--text-main)] opacity-70'">
            {{ result.title }}
          </p>
          <p class="text-[10px] text-[var(--text-muted)] opacity-50">{{ result.release_date?.slice(0, 4) }}</p>
        </div>
      </div>
    </template>
  </div>

  <!-- Edit-before-import Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="previewForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="previewForm = null; previewSource = null" />
        <div class="relative bg-[var(--bg-app)] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--border-ui)] shadow-2xl flex flex-col">
          <!-- Header -->
          <div class="flex gap-5 p-6 border-b border-[var(--border-ui)] flex-shrink-0">
            <img v-if="previewForm.cover_path" :src="previewForm.cover_path" class="w-14 aspect-[2/3] rounded-xl object-cover flex-shrink-0" />
            <div>
              <h2 class="text-lg font-black text-[var(--text-main)] uppercase tracking-tight mb-1">Vor dem Import bearbeiten</h2>
              <p class="text-xs text-[var(--text-muted)] opacity-60">Daten prüfen und anpassen – dann importieren.</p>
            </div>
          </div>
          <!-- Form -->
          <div class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 opacity-60">Titel *</label>
                <input v-model="previewForm.title" type="text" class="modal-input" />
              </div>
              <div>
                <label class="block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 opacity-60">Jahr</label>
                <input v-model.number="previewForm.year" type="number" min="1900" max="2099" class="modal-input" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 opacity-60">Typ</label>
                <select v-model="previewForm.collection_type" class="modal-input">
                  <option>Film</option>
                  <option>Serie</option>
                  <option>Dokumentation</option>
                  <option>Kurzfilm</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 opacity-60">Format-Tag</label>
                <select v-model="previewForm.tag" class="modal-input">
                  <option value="">—</option>
                  <option>DVD</option>
                  <option>BluRay</option>
                  <option>4K</option>
                  <option>Streaming</option>
                  <option>Digital</option>
                  <option>VHS</option>
                  <option>Leihe</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 opacity-60">Genre</label>
                <input v-model="previewForm.genre" type="text" class="modal-input" />
              </div>
              <div>
                <label class="block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 opacity-60">Regisseur</label>
                <input v-model="previewForm.director" type="text" class="modal-input" />
              </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 opacity-60">Laufzeit (min)</label>
                <input v-model.number="previewForm.runtime" type="number" class="modal-input" />
              </div>
              <div>
                <label class="block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 opacity-60">Bewertung (0–10)</label>
                <input v-model.number="previewForm.rating" type="number" min="0" max="10" step="0.1" class="modal-input" />
              </div>
              <div>
                <label class="block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 opacity-60">FSK</label>
                <input v-model.number="previewForm.rating_age" type="number" class="modal-input" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 opacity-60">Beschreibung</label>
              <textarea v-model="previewForm.overview" rows="4" class="modal-input resize-none" />
            </div>
            <div>
              <label class="block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 opacity-60">Trailer URL</label>
              <input v-model="previewForm.trailer_url" type="url" class="modal-input" placeholder="https://www.youtube.com/watch?v=..." />
            </div>
            <div>
              <label class="block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 opacity-60">Hinzugefügt am</label>
              <input v-model="previewForm.created_at" type="date" class="modal-input" />
            </div>
          </div>
          <!-- Footer -->
          <div class="flex gap-3 p-6 border-t border-[var(--border-ui)] flex-shrink-0">
            <button
              @click="confirmImport"
              :disabled="importing === previewSource?.id || !previewForm.title"
              class="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
            >
              <span v-if="importing === previewSource?.id" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <i v-else class="bi bi-plus-lg"></i>
              {{ importing === previewSource?.id ? 'Wird importiert...' : 'Importieren' }}
            </button>
            <button
              @click="previewForm = null; previewSource = null"
              class="px-6 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] text-[var(--text-muted)] font-bold py-3 rounded-xl transition-colors text-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useApi } from '@/composables/useApi'
import { useSettingsStore } from '@/stores/settings'
import { useListStore } from '@/stores/lists'
import { useMovieStore } from '@/stores/movies'

const TMDB_BASE = 'https://api.themoviedb.org/3'

interface TmdbResult {
  id: number
  title: string
  poster_path: string | null
  release_date: string
}

const settings   = useSettingsStore()
const listStore  = useListStore()
const movieStore = useMovieStore()
const { apiGet, apiPost, isOnline } = useApi()

const query       = ref('')
const results     = ref<TmdbResult[]>([])
const loading     = ref(false)
const importing   = ref<number | null>(null)
const importedIds = ref(new Set<number>())
const error       = ref('')
const toast       = ref('')
const importToCollection = ref(true)
const listPickerFor  = ref<number | null>(null)
const previewForm    = ref<Record<string, any> | null>(null)
const previewSource  = ref<TmdbResult | null>(null)
const previewLoading = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => listStore.fetchLists())

function showToast(message: string) {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = message
  toastTimer = setTimeout(() => { toast.value = '' }, 3000)
}

const canSearch = computed(() => isOnline.value || settings.hasTmdb)

async function search() {
  if (!query.value.trim()) return
  loading.value = true
  error.value = ''
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
    // Mark already-imported films
    if (results.value.length > 0) {
      const tmdbIds = results.value.map(r => r.id)
      const existing = await window.electron.db.movies.checkTmdbIds(tmdbIds)
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
    const m = detailRes.data
    const director = (m.credits?.crew ?? []).find((c: any) => c.job === 'Director')?.name ?? ''
    const actorsNames = (m.credits?.cast ?? []).slice(0, 10).map((c: any) => c.name).join(', ')
    const trailer = (videoRes.data.results ?? []).find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
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
      cover_path:      m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      backdrop_path:   m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
      actors_names:    actorsNames,
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
    const res = await window.electron.media.download(coverUrl, movie.id, 'cover')
    if (res?.success) updates.cover_path = `movie-resource://${movie.id}.jpg`
  }
  if (backdropUrl) {
    const res = await window.electron.media.download(backdropUrl, movie.id, 'backdrop')
    if (res?.success) updates.backdrop_path = `movie-resource://${movie.id}_backdrop.jpg`
  }
  if (Object.keys(updates).length) {
    await window.electron.db.movies.update(movie.id, updates)
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
    const movie = await window.electron.db.movies.create({
      ...previewForm.value,
      in_collection: importToCollection.value ? 1 : 0,
      remote_id: null,
    })
    await downloadImages(movie, coverUrl, backdropUrl)
    importedIds.value = new Set(importedIds.value).add(result.id)
    movieStore.clearCache()
    showToast(`„${previewForm.value.title}" wurde zur Sammlung hinzugefügt.`)
    previewForm.value = null
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

  const m = detailRes.data
  const director = (m.credits?.crew ?? []).find((c: any) => c.job === 'Director')?.name ?? ''
  const actorsNames = (m.credits?.cast ?? []).slice(0, 10).map((c: any) => c.name).join(', ')
  const trailer = (videoRes.data.results ?? []).find(
    (v: any) => v.site === 'YouTube' && v.type === 'Trailer'
  )
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : ''

  const movieData = {
    title:           m.title,
    year:            m.release_date ? parseInt(m.release_date.slice(0, 4)) : null,
    genre:           (m.genres ?? []).map((g: any) => g.name).join(', '),
    director,
    runtime:         m.runtime ?? null,
    rating:          m.vote_average ?? null,
    rating_age:      null,
    overview:        m.overview ?? '',
    cover_path:      m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    backdrop_path:   m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
    actors_names:    actorsNames,
    trailer_url:     trailerUrl,
    collection_type: 'Film',
    tag:             null,
    tmdb_id:         m.id,
    remote_id:       null,
    in_collection:   inCollection,
  }

  const movie = await window.electron.db.movies.create(movieData)
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
    let localId: number

    if (existing?.id) {
      localId = existing.id
    } else {
      // Vollständige TMDb-Infos holen, aber in_collection=0
      const created = await importLocally(result.id, 0) as any
      localId = created?.id
    }

    if (localId) {
      await listStore.addMovie(listId, localId)
      const listName = listStore.lists.find(l => l.id === listId)?.name ?? 'Liste'
      showToast(`„${result.title}" zu „${listName}" hinzugefügt.`)
    }
  } catch (e: any) {
    error.value = `Fehler: ${e.message}`
  }
}
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translateY(12px); }
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; transform: scale(0.97); }
.modal-input {
  @apply w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-red-500/50 transition-colors;
}
</style>
