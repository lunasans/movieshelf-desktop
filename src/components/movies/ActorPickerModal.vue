<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="emit('close')" />
        <div class="relative bg-[var(--bg-app)] w-full max-w-lg rounded-3xl border border-[var(--border-ui)] shadow-2xl flex flex-col max-h-[85vh]">

          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--border-ui)] flex-shrink-0">
            <h2 class="text-base font-black text-[var(--text-main)] uppercase tracking-tight">Schauspieler hinzufügen</h2>
            <button @click="emit('close')" class="text-[var(--text-muted)] opacity-50 hover:opacity-100 transition-opacity">
              <i class="bi bi-x-lg text-lg"></i>
            </button>
          </div>

          <!-- Source toggle -->
          <div class="flex gap-2 px-6 pt-4 flex-shrink-0">
            <button
              @click="mode = 'local'"
              class="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              :class="mode === 'local'
                ? 'bg-[var(--status-red)] text-white'
                : 'bg-[var(--bg-card)] border border-[var(--border-ui)] text-[var(--text-muted)] hover:border-red-500/40'"
            >
              <i class="bi bi-database mr-1.5"></i>Lokal
            </button>
            <button
              @click="mode = 'tmdb'"
              class="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              :class="mode === 'tmdb'
                ? 'bg-[var(--status-red)] text-white'
                : 'bg-[var(--bg-card)] border border-[var(--border-ui)] text-[var(--text-muted)] hover:border-red-500/40'"
            >
              <i class="bi bi-stars mr-1.5"></i>TMDb
            </button>
          </div>

          <!-- Search -->
          <div class="px-6 pt-3 pb-2 flex-shrink-0">
            <input
              v-model="query"
              @input="onQueryInput"
              type="text"
              :placeholder="mode === 'tmdb' ? 'Person auf TMDb suchen...' : 'Name suchen...'"
              class="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-red-500/50 transition-colors"
            />
          </div>

          <!-- Results list -->
          <div class="overflow-y-auto flex-1 px-6 pb-3">
            <div v-if="searchLoading" class="flex justify-center py-8">
              <div class="w-6 h-6 border-2 border-[var(--status-red)] border-t-transparent rounded-full animate-spin"></div>
            </div>

            <div v-else-if="results.length === 0 && query.trim().length >= 2"
              class="text-center py-8 text-sm text-[var(--text-muted)] opacity-50">
              Keine Ergebnisse
            </div>

            <div v-else class="space-y-1 mt-1">
              <button
                v-for="actor in results"
                :key="actor.id"
                @click="selectActor(actor)"
                class="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--bg-card)] transition-colors text-left"
                :class="selected?.id === actor.id ? 'bg-[var(--bg-card)] ring-1 ring-red-500/30' : ''"
              >
                <div class="w-9 h-9 rounded-full overflow-hidden bg-[var(--bg-elevated)] flex-shrink-0 flex items-center justify-center">
                  <img v-if="actor.image_url" :src="actor.image_url" class="w-full h-full object-cover" />
                  <i v-else class="bi bi-person text-[var(--text-muted)] opacity-30"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-bold text-[var(--text-main)] truncate">{{ actor.name }}</p>
                  <p v-if="actor.known_for" class="text-xs text-[var(--text-muted)] opacity-50 truncate">{{ actor.known_for }}</p>
                </div>
                <i v-if="selected?.id === actor.id" class="bi bi-check-circle-fill text-[var(--status-red)] flex-shrink-0"></i>
              </button>
            </div>
          </div>

          <!-- Role fields (shown after selection) -->
          <div v-if="selected" class="px-6 pb-4 flex-shrink-0 space-y-3 border-t border-[var(--border-ui)] pt-4">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-7 h-7 rounded-full overflow-hidden bg-[var(--bg-elevated)] flex-shrink-0 flex items-center justify-center">
                <img v-if="selected.image_url" :src="selected.image_url" class="w-full h-full object-cover" />
                <i v-else class="bi bi-person text-[var(--text-muted)] opacity-30 text-xs"></i>
              </div>
              <span class="text-sm font-bold text-[var(--text-main)]">{{ selected.name }}</span>
              <button @click="selected = null" class="ml-auto text-[var(--text-muted)] opacity-40 hover:opacity-80 transition-opacity">
                <i class="bi bi-x"></i>
              </button>
            </div>
            <div>
              <label class="field-label">Rolle (optional)</label>
              <input v-model="role" type="text" placeholder="z. B. Neo" class="picker-input" />
            </div>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" v-model="isMainRole" class="w-4 h-4 accent-red-600 rounded" />
              <span class="text-sm font-bold text-[var(--text-main)]">Hauptrolle</span>
            </label>
          </div>

          <!-- Footer -->
          <div class="flex gap-3 px-6 py-4 border-t border-[var(--border-ui)] flex-shrink-0">
            <button
              @click="confirm"
              :disabled="!selected || saving"
              class="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
            >
              <span v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <i v-else class="bi bi-plus-lg"></i>
              {{ saving ? 'Wird hinzugefügt...' : 'Hinzufügen' }}
            </button>
            <button
              @click="emit('close')"
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
import { ref, watch } from 'vue'
import axios from 'axios'
import { useSettingsStore } from '@/stores/settings'

const TMDB_BASE = 'https://api.themoviedb.org/3'

const props = defineProps<{ open: boolean; filmId: number }>()
const emit = defineEmits<{ close: []; added: [] }>()

const settings = useSettingsStore()

interface ActorOption {
  id: number
  tmdb_id: number | null
  name: string
  image_url: string | null
  known_for?: string
  _source: 'local' | 'tmdb'
}

const mode        = ref<'local' | 'tmdb'>('local')
const query       = ref('')
const results     = ref<ActorOption[]>([])
const selected    = ref<ActorOption | null>(null)
const role        = ref('')
const isMainRole  = ref(false)
const searchLoading = ref(false)
const saving      = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(mode, () => {
  results.value = []
  selected.value = null
  if (query.value.trim().length >= 2) doSearch()
})

watch(() => props.open, (v) => {
  if (!v) {
    query.value = ''
    results.value = []
    selected.value = null
    role.value = ''
    isMainRole.value = false
    mode.value = 'local'
  }
})

function onQueryInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(doSearch, 300)
}

async function doSearch() {
  const q = query.value.trim()
  if (q.length < 2) { results.value = []; return }
  searchLoading.value = true
  try {
    if (mode.value === 'local') {
      const raw = await window.electron.db.movies.actors.search(q) as any[]
      results.value = raw.map(a => ({
        id: a.id,
        tmdb_id: a.tmdb_id ?? null,
        name: a.name,
        image_url: a.image_path ? resolveImageUrl(a.image_path, a.id) : null,
        _source: 'local' as const,
      }))
    } else {
      if (!settings.tmdbApiKey) return
      const { data } = await axios.get(`${TMDB_BASE}/search/person`, {
        params: { api_key: settings.tmdbApiKey, query: q, language: 'de-DE' }
      })
      results.value = (data.results ?? []).slice(0, 10).map((p: any) => ({
        id: p.id,
        tmdb_id: p.id,
        name: p.name,
        image_url: p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : null,
        known_for: (p.known_for ?? []).slice(0, 2).map((k: any) => k.title ?? k.name).join(', '),
        _source: 'tmdb' as const,
      }))
    }
  } finally {
    searchLoading.value = false
  }
}

function resolveImageUrl(imagePath: string, actorId: number): string {
  if (imagePath.startsWith('http')) return imagePath
  return `movie-resource://${actorId}_actor.jpg`
}

function selectActor(actor: ActorOption) {
  selected.value = selected.value?.id === actor.id ? null : actor
}

async function confirm() {
  if (!selected.value) return
  saving.value = true
  try {
    let actorId: number

    if (selected.value._source === 'tmdb') {
      // Create or find existing actor by tmdb_id
      actorId = await window.electron.db.movies.actors.upsert({
        name: selected.value.name,
        tmdb_id: selected.value.tmdb_id,
        remote_id: null,
      })
      // Download profile image if available
      if (selected.value.image_url && actorId) {
        await window.electron.db.movies.download(selected.value.image_url, actorId, 'actor')
      }
    } else {
      actorId = selected.value.id
    }

    await window.electron.db.movies.actors.link({
      film_id: props.filmId,
      actor_id: actorId,
      role: role.value || undefined,
      is_main_role: isMainRole.value,
    })

    emit('added')
    emit('close')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
@reference "tailwindcss";
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; transform: scale(0.97); }
.field-label {
  @apply block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 opacity-60;
}
.picker-input {
  @apply w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-red-500/50 transition-colors;
}
</style>
