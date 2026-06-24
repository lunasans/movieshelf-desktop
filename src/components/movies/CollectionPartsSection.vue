<template>
  <div v-if="missingParts.length > 0">
    <h3 class="text-[var(--text-muted)] opacity-40 text-xs font-black uppercase tracking-[0.2em] mb-6">
      Weitere Teile — {{ collectionName }}
    </h3>
    <div class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4">
      <div
        v-for="part in missingParts"
        :key="part.id"
        @click="addPart(part)"
        class="group cursor-pointer"
      >
        <div class="relative aspect-[2/3] rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-ui)] border-dashed group-hover:border-red-500/50 group-hover:scale-105 transition-all duration-300 shadow-[var(--shadow-main)]">
          <img
            v-if="part.poster_path"
            :src="`https://image.tmdb.org/t/p/w200${part.poster_path}`"
            :alt="part.title"
            class="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <i class="bi bi-film text-[var(--text-muted)] opacity-20 text-2xl"></i>
          </div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div class="w-10 h-10 bg-red-600/90 rounded-full flex items-center justify-center shadow-xl">
              <i class="bi bi-plus text-white text-xl"></i>
            </div>
          </div>
        </div>
        <p class="mt-1.5 text-[11px] font-black text-[var(--text-main)] truncate uppercase tracking-tight opacity-90">{{ part.title }}</p>
        <p class="text-[10px] text-[var(--text-muted)] font-bold">{{ part.release_date?.slice(0, 4) }}</p>
      </div>
    </div>

    <TmdbImportModal
      :previewForm="previewForm"
      :previewSource="previewSource"
      :importing="importing"
      :tmdbSeasons="tmdbSeasons"
      :selectedSeasons="selectedSeasons"
      @update:selectedSeasons="selectedSeasons = $event"
      @confirm="handleConfirm"
      @cancel="previewForm = null; previewSource = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import axios from 'axios'
import { useSettingsStore } from '@/stores/settings'
import { useTmdbSearch } from '@/composables/useTmdbSearch'
import TmdbImportModal from '@/components/tmdb/TmdbImportModal.vue'

const TMDB_BASE = 'https://api.themoviedb.org/3'

interface CollectionPart {
  id: number
  title: string
  release_date: string
  poster_path: string | null
}

const props = defineProps<{
  tmdbId: number
  movieId?: number
}>()

const emit = defineEmits<{
  imported: []
}>()

const settings = useSettingsStore()
const {
  previewForm, previewSource, importing,
  tmdbSeasons, selectedSeasons,
  openPreview, confirmImport,
} = useTmdbSearch()

const missingParts = ref<CollectionPart[]>([])
const collectionName = ref('')

async function load() {
  missingParts.value = []
  collectionName.value = ''
  if (!settings.tmdbApiKey || !props.tmdbId) return

  // Defensiv: Hat der Datensatz lokal Staffeln, ist er faktisch eine Serie –
  // dann gibt es keine Film-Reihe, und der /movie/-Aufruf (der bei TV-IDs mit
  // 404 quittiert wird) entfällt von vornherein.
  if (props.movieId) {
    try {
      const seasons = await window.electron.db.seasons.forMovie(props.movieId)
      if (seasons.length > 0) return
    } catch { /* Staffel-Lookup optional */ }
  }

  try {
    const { data: movie } = await axios.get(`${TMDB_BASE}/movie/${props.tmdbId}`, {
      params: { api_key: settings.tmdbApiKey, language: 'de-DE' },
    })
    if (!movie.belongs_to_collection) return

    collectionName.value = movie.belongs_to_collection.name

    const { data: col } = await axios.get(`${TMDB_BASE}/collection/${movie.belongs_to_collection.id}`, {
      params: { api_key: settings.tmdbApiKey, language: 'de-DE' },
    })

    const parts: CollectionPart[] = col.parts ?? []
    const partIds = parts.map((p: CollectionPart) => p.id)
    const localIds = new Set(await window.electron.db.movies.checkTmdbIds(partIds))
    missingParts.value = parts.filter(p => !localIds.has(p.id))
  } catch {
    // Silently ignore — no collection data available
  }
}

function addPart(part: CollectionPart) {
  openPreview({
    id: part.id,
    title: part.title,
    release_date: part.release_date,
    poster_path: part.poster_path ?? '',
    media_type: 'movie',
  })
}

async function handleConfirm() {
  await confirmImport()
  emit('imported')
  await load()
}

onMounted(load)
</script>
