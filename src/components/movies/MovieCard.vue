<template>
  <div
    class="group cursor-pointer"
    @click="onClick"
  >
    <!-- Wrapper for card image area -->
    <div class="relative aspect-[2/3]" :class="{ 'card-perspective': movie.is_boxset }">
      <div class="absolute inset-0" :class="[movie.is_boxset ? 'card-flipper transition-transform duration-500' : '', { 'is-flipped': flipped }]">
      <div
        :class="[
          'absolute inset-0 rounded-2xl overflow-hidden bg-[var(--bg-card)] border transition-all duration-300 shadow-[var(--shadow-main)]',
          movie.is_boxset ? 'card-face' : '',
          flipped ? 'pointer-events-none' : '',
          selected
            ? 'border-red-500 scale-[0.97]'
            : 'border-[var(--border-ui)] group-hover:border-blue-500/50 group-hover:-translate-y-1',
        ]"
      >
        <img
          v-if="resolveMediaUrl(movie.cover_url || movie.cover_path, movie.remote_id ?? undefined)"
          :src="resolveMediaUrl(movie.cover_url || movie.cover_path, movie.remote_id ?? undefined)!"
          :alt="movie.title"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full bg-gradient-to-br from-[var(--bg-app)] via-[var(--bg-sidebar)] to-[var(--bg-app)] flex flex-col items-center justify-center p-4 text-center">
          <i class="bi bi-film text-[var(--text-muted)] opacity-20 text-4xl mb-3"></i>
          <span class="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-tight leading-snug line-clamp-4">{{ movie.title }}</span>
          <span v-if="movie.year" class="text-[9px] text-[var(--text-muted)] opacity-40 font-bold mt-2">{{ movie.year }}</span>
        </div>

        <!-- Cover gradient overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>

        <!-- Format-Badge (oben rechts; weicht der Bulk-Checkbox) -->
        <div
          v-if="movie.tag && !bulkMode"
          :class="['absolute top-2.5 right-2.5 z-20 px-1.5 py-0.5 rounded-md border border-white/15 backdrop-blur-sm flex items-center gap-1 pointer-events-none', tagStyle(movie.tag).bg]"
        >
          <MediaFormatIcon :format="movie.tag" class="w-3 h-3 text-white" />
          <span class="text-[9px] font-black text-white uppercase tracking-widest">{{ tagStyle(movie.tag).label }}</span>
        </div>

        <!-- Watched- und Rating-Badge (oben links, damit sie nicht unter der Banderole liegen) -->
        <div class="absolute top-2.5 left-2.5 z-20 flex items-center gap-1">
          <div v-if="movie.is_watched" class="bg-green-600/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-green-500/30 flex items-center">
            <i class="bi bi-eye-fill text-[9px] text-white"></i>
          </div>
          <div v-if="movie.rating" class="bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-white/10 flex items-center gap-1">
            <i class="bi bi-star-fill text-[9px] text-yellow-400"></i>
            <span class="text-[10px] font-black text-white">{{ movie.rating.toFixed(1) }}</span>
          </div>
        </div>

        <!-- Boxset Badge (bottom left); beim Hover uebernimmt der Icon-Button in der Aktionsleiste -->
        <div v-if="movie.is_boxset" class="absolute bottom-3 left-3 z-20 transition-opacity duration-200" :class="{ 'group-hover:opacity-0': !bulkMode }">
          <span class="text-[9px] font-black text-white/90 uppercase tracking-widest bg-red-700/80 backdrop-blur-md px-2 py-1 rounded-lg border border-red-500/30 shadow-lg flex items-center gap-1">
            <i class="bi bi-collection-fill"></i> {{ $t('movies.boxset') }}
          </span>
        </div>

        <!-- Bulk mode: checkbox overlay -->
        <div v-if="bulkMode" class="absolute top-2.5 right-2.5 z-30">
          <div :class="['w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors', selected ? 'bg-red-600 border-red-500' : 'bg-black/40 border-white/40']">
            <i v-if="selected" class="bi bi-check text-white text-xs"></i>
          </div>
        </div>

        <!-- Normal hover overlay with actions (hidden in bulk mode) -->
        <div v-if="!bulkMode" class="absolute inset-x-0 bottom-0 z-20 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-end gap-1.5 pointer-events-none [&>button]:pointer-events-auto">
          <button
            v-if="movie.is_boxset"
            @click.stop="openChildren"
            class="w-8 h-8 mr-auto rounded-lg flex items-center justify-center text-sm bg-red-700/80 hover:bg-red-600 backdrop-blur-sm border border-red-500/30 text-white transition-colors"
            :title="$t('movieDetail.containedMovies')"
          >
            <i class="bi bi-collection-fill"></i>
          </button>
          <button
            @click.stop="router.push(`/movies/${movie.id}/edit`)"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-black/60 backdrop-blur-sm border border-white/10 text-white hover:bg-black/80 transition-colors"
            :title="$t('common.edit')"
          >
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button
            @click.stop="$emit('toggle-watched')"
            :class="['w-8 h-8 rounded-lg flex items-center justify-center text-sm backdrop-blur-sm border transition-colors', movie.is_watched ? 'bg-green-600/80 border-green-500/30 hover:bg-green-600 text-white' : 'bg-black/60 border-white/10 text-white hover:bg-black/80']"
            :title="$t('movies.toggleWatched')"
          >
            <i :class="movie.is_watched ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'"></i>
          </button>
          <button
            @click.stop="$emit('delete')"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-black/60 backdrop-blur-sm border border-white/10 text-white hover:bg-red-600 transition-colors"
            :title="$t('common.delete')"
          >
            <i class="bi bi-trash3-fill"></i>
          </button>
        </div>
      </div>

      <!-- Rueckseite: enthaltene Filme des Boxsets -->
      <div
        v-if="movie.is_boxset"
        :class="[
          'card-face card-back absolute inset-0 z-30 cursor-default rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-red-500/40 shadow-[var(--shadow-main)] flex flex-col',
          flipped ? '' : 'pointer-events-none',
        ]"
        @click.stop
      >
        <div class="flex items-center gap-1.5 px-2.5 py-2 border-b border-[var(--border-ui)] shrink-0">
          <i class="bi bi-collection-fill text-[10px] text-red-500"></i>
          <span class="text-[9px] font-black text-[var(--text-main)] uppercase tracking-widest truncate flex-1">{{ movie.title }}</span>
          <button
            @click.stop="flipped = false"
            class="w-5 h-5 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0"
            :title="$t('common.back')"
          >
            <i class="bi bi-x-lg text-[10px]"></i>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-1.5 py-1.5">
          <p v-if="childrenLoading" class="text-[10px] text-[var(--text-muted)] opacity-60 px-1.5 py-2">
            <i class="bi bi-arrow-repeat animate-spin mr-1"></i>{{ $t('common.loading') }}
          </p>
          <p v-else-if="children.length === 0" class="text-[10px] text-[var(--text-muted)] opacity-60 px-1.5 py-2">
            {{ $t('movies.noBoxsetChildren') }}
          </p>
          <button
            v-for="child in children"
            :key="child.id"
            @click.stop="router.push(`/movies/${child.id}`)"
            class="w-full text-left px-1.5 py-1 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1.5"
          >
            <i
              :class="child.is_watched ? 'bi bi-eye-fill text-green-500' : 'bi bi-dot text-[var(--text-muted)] opacity-40'"
              class="text-[9px] w-2.5 shrink-0"
            ></i>
            <span class="text-[10px] font-bold text-[var(--text-main)] truncate flex-1">{{ child.title }}</span>
            <span v-if="child.year" class="text-[9px] text-[var(--text-muted)] opacity-50 shrink-0">{{ child.year }}</span>
          </button>
        </div>

        <button
          @click.stop="router.push(`/movies/${movie.id}`)"
          class="shrink-0 px-2.5 py-1.5 border-t border-[var(--border-ui)] text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors text-left"
        >
          {{ $t('movies.openBoxset') }} <i class="bi bi-arrow-right ml-0.5"></i>
        </button>
      </div>
      </div>
    </div>

    <div class="mt-2 px-1">
      <p class="text-[12px] font-black text-[var(--text-main)] truncate uppercase tracking-tight opacity-90">{{ movie.title }}</p>
      <p class="text-[10px] text-[var(--text-muted)] font-bold">{{ movie.year }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import MediaFormatIcon from '@/components/icons/MediaFormatIcon.vue'
import type { Movie } from '@/stores/movies'

const props = defineProps<{
  movie: Movie
  bulkMode?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  delete:         []
  'toggle-watched': []
  'toggle-select':  []
}>()

const router = useRouter()
const { resolveMediaUrl } = useApi()

const flipped         = ref(false)
const children        = ref<any[]>([])
const childrenLoading = ref(false)
let childrenLoaded    = false

// Kinder erst beim ersten Aufklappen laden
async function openChildren() {
  flipped.value = true
  if (childrenLoaded) return
  childrenLoading.value = true
  try {
    children.value = await window.electron.db.movies.children(props.movie.id)
    childrenLoaded = true
  } finally {
    childrenLoading.value = false
  }
}

function onClick() {
  if (props.bulkMode) {
    emit('toggle-select')
  } else if (!flipped.value) {
    router.push(`/movies/${props.movie.id}`)
  }
}

const TAG_MAP: Record<string, { label: string; bg: string }> = {
  DVD:       { label: 'DVD',     bg: 'bg-orange-800/80' },
  BluRay:    { label: 'Blu-ray', bg: 'bg-blue-800/80'   },
  '4K':      { label: '4K UHD',  bg: 'bg-cyan-800/80'   },
  Streaming: { label: 'Stream',  bg: 'bg-emerald-800/80' },
  Digital:   { label: 'Digital', bg: 'bg-violet-800/80' },
  VHS:       { label: 'VHS',     bg: 'bg-stone-600/80'  },
  Leihe:     { label: 'Leihe',   bg: 'bg-amber-800/80'  },
}

function tagStyle(tag: string) {
  return TAG_MAP[tag] ?? { label: tag, bg: 'bg-black/50' }
}
</script>

<style scoped>
.card-perspective { perspective: 1200px; }

.card-flipper { transform-style: preserve-3d; }
.card-flipper.is-flipped { transform: rotateY(180deg); }

.card-face {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.card-back { transform: rotateY(180deg); }

@media (prefers-reduced-motion: reduce) {
  .card-flipper { transition: none; }
}
</style>
