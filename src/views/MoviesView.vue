<template>
  <div class="p-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">{{ isSeries ? 'Serien' : 'Filme' }}</h1>
        <p class="text-sm text-[var(--text-muted)] opacity-60">{{ store.total }} {{ isSeries ? 'Serien' : 'Filme' }} in der Sammlung</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Ansicht umschalten -->
        <div class="flex items-center bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-0.5">
          <button
            v-for="v in viewOptions"
            :key="v.mode"
            @click="setViewMode(v.mode)"
            :title="v.label"
            :class="[
              'p-1.5 rounded-lg transition-colors',
              viewMode === v.mode
                ? 'bg-[var(--status-red)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]',
            ]"
          >
            <i :class="`bi bi-${v.icon}`"></i>
          </button>
        </div>
        <button
          @click="showRandom = true"
          class="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-ui)] hover:border-purple-500/50 text-[var(--text-muted)] hover:text-purple-400 transition-colors"
          title="Zufälligen Film wählen"
        >
          <i class="bi bi-dice-6-fill"></i>
        </button>
        <button
          @click="toggleBulkMode"
          :class="[
            'p-2 rounded-xl border transition-colors',
            store.bulkMode
              ? 'bg-red-600 border-red-500 text-white'
              : 'bg-[var(--bg-card)] border-[var(--border-ui)] text-[var(--text-muted)] hover:border-red-500/50',
          ]"
          title="Mehrfachauswahl"
        >
          <i class="bi bi-check2-square"></i>
        </button>
        <router-link
          to="/movies/new"
          class="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          <i class="bi bi-plus-lg"></i> Film hinzufügen
        </router-link>
      </div>
    </div>

    <!-- Search -->
    <div class="relative mb-4">
      <i class="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-40"></i>
      <input
        ref="searchEl"
        v-model="query"
        @input="onSearch"
        type="text"
        placeholder="Titel, Regisseur, Genre suchen..."
        class="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl pl-12 pr-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-red-500/50 transition-colors"
      />
    </div>

    <!-- Sort + Genre controls -->
    <div class="flex flex-wrap items-center gap-2 mb-6">
      <select
        v-model="sortKey"
        @change="onFiltersChange"
        class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--text-main)] focus:outline-none focus:border-red-500/50"
      >
        <option value="title">Titel</option>
        <option value="year">Jahr</option>
        <option value="rating">Bewertung</option>
        <option value="runtime">Laufzeit</option>
        <option value="created_at">Hinzugefügt</option>
      </select>
      <button
        @click="toggleSortDir"
        class="px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-ui)] text-xs font-black text-[var(--text-muted)] hover:border-red-500/50 transition-colors"
        :title="sortDirLocal === 'ASC' ? 'Aufsteigend' : 'Absteigend'"
      >
        <i :class="sortDirLocal === 'ASC' ? 'bi bi-sort-up' : 'bi bi-sort-down'"></i>
      </button>
      <template v-if="availableGenres.length">
        <button
          v-for="genre in availableGenres"
          :key="genre"
          @click="toggleGenre(genre)"
          :class="[
            'px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors',
            store.selectedGenres.includes(genre)
              ? 'bg-red-600 border-red-500 text-white'
              : 'bg-[var(--bg-card)] border-[var(--border-ui)] text-[var(--text-muted)] hover:border-red-500/50',
          ]"
        >{{ genre }}</button>
      </template>
    </div>

    <!-- Width measurer (invisible sentinel) -->
    <div ref="measureEl" class="w-full h-0"></div>

    <!-- Tabellen-Kopf -->
    <div
      v-if="viewMode === 'table' && !store.loading && store.movies.length > 0"
      class="grid items-center gap-3 px-3 py-2 grid-cols-[40px_1fr_56px_56px_72px_minmax(0,90px)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 border-b border-[var(--border-ui)] mb-1"
    >
      <span></span>
      <span>Titel</span>
      <span class="text-center">Jahr</span>
      <span class="text-center">Note</span>
      <span class="text-center">Laufzeit</span>
      <span class="text-right">Typ</span>
    </div>

    <!-- Loading (Initial) -->
    <div v-if="store.loading && !store.loadingMore" class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
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

    <!-- Virtual Grid -->
    <div
      v-if="!store.loading && store.movies.length > 0"
      ref="gridEl"
      :style="{ height: virtualizer.getTotalSize() + 'px', position: 'relative' }"
    >
      <div
        v-for="row in virtualizer.getVirtualItems()"
        :key="String(row.key)"
        :style="{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          transform: 'translateY(' + (row.start - scrollMarginV) + 'px)',
        }"
      >
        <!-- Raster -->
        <div v-if="viewMode === 'grid'" class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6 pb-6">
          <MovieCard
            v-for="movie in getRowMovies(row.index)"
            :key="movie.id"
            :movie="movie"
            :bulk-mode="store.bulkMode"
            :selected="store.selectedIds.includes(movie.id)"
            @delete="store.deleteMovie(movie.id)"
            @toggle-watched="store.toggleMovieWatched(movie.id)"
            @toggle-select="store.toggleSelect(movie.id)"
          />
        </div>

        <!-- Liste -->
        <div v-else-if="viewMode === 'list'" :style="{ height: rowHeight + 'px' }" class="overflow-hidden">
          <MovieListRow
            v-for="movie in getRowMovies(row.index)"
            :key="movie.id"
            :movie="movie"
            :bulk-mode="store.bulkMode"
            :selected="store.selectedIds.includes(movie.id)"
            @toggle-select="store.toggleSelect(movie.id)"
          />
        </div>

        <!-- Tabelle -->
        <div v-else :style="{ height: rowHeight + 'px' }" class="overflow-hidden">
          <MovieTableRow
            v-for="movie in getRowMovies(row.index)"
            :key="movie.id"
            :movie="movie"
            :bulk-mode="store.bulkMode"
            :selected="store.selectedIds.includes(movie.id)"
            @toggle-select="store.toggleSelect(movie.id)"
          />
        </div>
      </div>
    </div>

    <!-- Loading More -->
    <div v-if="store.loadingMore" class="flex items-center justify-center py-10">
      <div class="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Random Picker -->
    <RandomPickerModal
      v-if="showRandom"
      :collection-type="isSeries ? 'Serie' : undefined"
      @close="showRandom = false"
    />

    <!-- Bulk Action Bar -->
    <BulkActionBar
      v-if="store.bulkMode && store.selectedIds.length > 0"
      :count="store.selectedIds.length"
      @bulk-delete="onBulkDelete"
      @bulk-tag="onBulkTag"
      @close="toggleBulkMode"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useMovieStore } from '@/stores/movies'
import { useSettingsStore } from '@/stores/settings'
import type { Movie } from '@/stores/movies'
import MovieCard from '@/components/movies/MovieCard.vue'
import MovieListRow from '@/components/movies/MovieListRow.vue'
import MovieTableRow from '@/components/movies/MovieTableRow.vue'
import RandomPickerModal from '@/components/RandomPickerModal.vue'
import BulkActionBar from '@/components/BulkActionBar.vue'

const route    = useRoute()
const store    = useMovieStore()
const settings = useSettingsStore()

// ── State ─────────────────────────────────────────────────────────────────────

const query        = ref('')
const sortKey      = ref<'title' | 'year' | 'runtime' | 'rating' | 'created_at'>('title')
const sortDirLocal = ref<'ASC' | 'DESC'>('ASC')
const showRandom   = ref(false)
const availableGenres = ref<string[]>([])

// ── Ansicht (Raster / Liste / Tabelle), dauerhaft gemerkt ──────────────────────
type ViewMode = 'grid' | 'list' | 'table'
const VIEW_KEY = 'movieshelf:moviesViewMode'
const viewMode = ref<ViewMode>((localStorage.getItem(VIEW_KEY) as ViewMode) || 'grid')

function setViewMode(mode: ViewMode) {
  if (viewMode.value === mode) return
  viewMode.value = mode
  localStorage.setItem(VIEW_KEY, mode)
}

const viewOptions: { mode: ViewMode; icon: string; label: string }[] = [
  { mode: 'grid',  icon: 'grid-3x3-gap-fill', label: 'Raster' },
  { mode: 'list',  icon: 'list-ul',           label: 'Liste'  },
  { mode: 'table', icon: 'table',             label: 'Tabelle' },
]

const measureEl = ref<HTMLElement | null>(null)
const gridEl    = ref<HTMLElement | null>(null)
const searchEl  = ref<HTMLInputElement | null>(null)

const isSeries = computed(() => route.path === '/series')
const listKey  = computed(() => isSeries.value ? 'Serie' : '!Serie')

// ── Virtual scrolling ─────────────────────────────────────────────────────────

const ROW_HEIGHTS = { grid: 290, list: 72, table: 48 } as const
const ITEM_MIN   = 160
const GAP        = 24

const containerWidth = ref(1200)
const scrollMarginV  = ref(0)

const rowHeight = computed(() => ROW_HEIGHTS[viewMode.value])
const cols      = computed(() => viewMode.value === 'grid'
  ? Math.max(1, Math.floor((containerWidth.value + GAP) / (ITEM_MIN + GAP)))
  : 1)
const rowCount  = computed(() => Math.max(0, Math.ceil(store.movies.length / cols.value)))

const virtualizer = useVirtualizer({
  get count() { return rowCount.value },
  getScrollElement: () => document.querySelector('main') as HTMLElement,
  estimateSize: () => rowHeight.value,
  overscan: 2,
  get scrollMargin() { return scrollMarginV.value },
})

// Beim Ansichtswechsel Zeilenhöhen/Spalten neu vermessen.
watch(viewMode, async () => {
  await nextTick()
  virtualizer.value.measure()
  updateMeasurements()
})

function getRowMovies(rowIdx: number): Movie[] {
  const start = rowIdx * cols.value
  return store.movies.slice(start, start + cols.value)
}

function updateMeasurements() {
  if (measureEl.value) containerWidth.value = measureEl.value.offsetWidth
  const main = document.querySelector('main') as HTMLElement
  if (main && gridEl.value) {
    const gr = gridEl.value.getBoundingClientRect()
    const mr = main.getBoundingClientRect()
    scrollMarginV.value = Math.max(0, gr.top - mr.top + main.scrollTop)
  }
}

let resizeObs: ResizeObserver | null = null

// ── Params ────────────────────────────────────────────────────────────────────

function listParams(extra: Record<string, unknown> = {}) {
  const base = isSeries.value
    ? { collectionType: 'Serie' }
    : { excludeType: 'Serie' }
  return {
    ...base,
    sortBy: sortKey.value,
    sortDir: sortDirLocal.value,
    genres: store.selectedGenres.length ? [...store.selectedGenres] : undefined,
    ...extra,
  }
}

// ── Infinite load ─────────────────────────────────────────────────────────────

async function loadMore() {
  if (store.loading || store.loadingMore || store.movies.length >= store.total) return
  await store.fetchMovies({ ...listParams(), page: store.page + 1 } as Parameters<typeof store.fetchMovies>[0], true)
  await nextTick()
  updateMeasurements()
}

watch(
  () => virtualizer.value.range,
  () => {
    const range = virtualizer.value.range
    if (!range) return
    if (range.endIndex >= rowCount.value - 3) loadMore()
  },
)

watch(() => store.movies.length, async () => {
  await nextTick()
  updateMeasurements()
})

// ── Filters ───────────────────────────────────────────────────────────────────

let searchTimeout: ReturnType<typeof setTimeout>

function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => onFiltersChange(), 300)
}

async function onFiltersChange() {
  store.sortBy  = sortKey.value
  store.sortDir = sortDirLocal.value
  await store.fetchMovies(listParams({ q: query.value || undefined }) as Parameters<typeof store.fetchMovies>[0])
  await nextTick()
  updateMeasurements()
}

function toggleSortDir() {
  sortDirLocal.value = sortDirLocal.value === 'ASC' ? 'DESC' : 'ASC'
  onFiltersChange()
}

function toggleGenre(genre: string) {
  const idx = store.selectedGenres.indexOf(genre)
  if (idx >= 0) store.selectedGenres.splice(idx, 1)
  else store.selectedGenres.push(genre)
  onFiltersChange()
}

async function loadList() {
  const q = route.query.q as string | undefined
  query.value = q ?? ''
  await store.fetchMovies(listParams(q ? { q } : {}) as Parameters<typeof store.fetchMovies>[0])
  await nextTick()
  updateMeasurements()
}

// ── Bulk actions ──────────────────────────────────────────────────────────────

function toggleBulkMode() {
  store.bulkMode = !store.bulkMode
  if (!store.bulkMode) store.selectedIds.splice(0)
}

async function onBulkDelete() {
  await store.bulkDeleteSelected()
  await nextTick()
  updateMeasurements()
}

async function onBulkTag(tag: string) {
  await store.bulkTagSelected(tag)
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  try {
    const stats = await window.electron.stats.get()
    availableGenres.value = stats.genres.slice(0, 12).map(g => g.name)
  } catch { /* stats optional */ }

  const scrollTop = store.restoreFromCache(listKey.value)
  if (scrollTop !== null && !route.query.q) {
    await nextTick()
    const main = document.querySelector('main') as HTMLElement
    if (main) main.scrollTop = scrollTop
    await nextTick()
    updateMeasurements()
  } else {
    await loadList()
  }

  resizeObs = new ResizeObserver(() => {
    if (measureEl.value) containerWidth.value = measureEl.value.offsetWidth
  })
  if (measureEl.value) resizeObs.observe(measureEl.value)
})

onUnmounted(() => {
  resizeObs?.disconnect()
})

onBeforeRouteLeave(() => {
  const main = document.querySelector('main') as HTMLElement
  store.saveToCache(listKey.value, main?.scrollTop ?? 0)
})

// ── Watchers ──────────────────────────────────────────────────────────────────

watch(() => route.query.q, () => loadList())

watch(() => route.path, async (newPath, oldPath) => {
  const listPaths = ['/movies', '/series']
  if (!listPaths.includes(newPath) || !listPaths.includes(oldPath)) return

  const oldKey = oldPath === '/series' ? 'Serie' : '!Serie'
  query.value = ''
  store.selectedGenres.splice(0)
  store.bulkMode = false
  store.selectedIds.splice(0)

  const main = document.querySelector('main') as HTMLElement
  store.saveToCache(oldKey, main?.scrollTop ?? 0)

  const scrollTop = store.restoreFromCache(listKey.value)
  if (scrollTop !== null) {
    await nextTick()
    if (main) main.scrollTop = scrollTop
    await nextTick()
    updateMeasurements()
  } else {
    await loadList()
  }
})
</script>
