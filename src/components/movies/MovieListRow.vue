<template>
  <div
    class="group cursor-pointer flex items-center gap-6 p-4 rounded-3xl glass transition-all duration-300"
    :class="selected
      ? 'border-red-500/60 bg-red-500/10'
      : 'border-white/5 hover:border-red-500/30 hover:bg-white/5'"
    @click="onClick"
  >
    <i
      v-if="bulkMode"
      class="bi flex-shrink-0 text-lg"
      :class="selected ? 'bi-check-square-fill text-red-500' : 'bi-square text-[var(--text-muted)] opacity-50'"
    ></i>

    <!-- Miniatur -->
    <div class="relative w-20 aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shrink-0">
      <img v-if="cover" :src="cover" :alt="movie.title" class="w-full h-full object-cover" />
      <div v-else class="w-full h-full bg-gradient-to-br from-[var(--bg-app)] via-[var(--bg-sidebar)] to-[var(--bg-app)] flex flex-col items-center justify-center p-2 text-center">
        <i class="bi bi-film text-lg text-[var(--text-muted)] opacity-20 mb-1"></i>
        <span class="text-[8px] font-black text-[var(--text-muted)] opacity-50 uppercase tracking-tight leading-snug line-clamp-3">{{ movie.title }}</span>
      </div>

      <!-- Gesehen-Ring -->
      <div v-if="movie.is_watched" class="absolute top-2 left-2">
        <div class="w-6 h-6 bg-red-500/90 backdrop-blur-md rounded-full border border-white/20 shadow-md flex items-center justify-center">
          <i class="bi bi-eye-fill text-white text-[10px] leading-none"></i>
        </div>
      </div>

      <!-- Format-Banderole -->
      <div
        v-if="movie.tag"
        :class="['absolute top-[12px] -right-[28px] z-20 w-[100px] py-[3px] rotate-45 text-center shadow-md pointer-events-none', tagStyle(movie.tag).bg]"
      >
        <span class="text-[7px] font-black text-white uppercase tracking-wider drop-shadow-sm">{{ tagStyle(movie.tag).label }}</span>
      </div>
    </div>

    <!-- Infospalte -->
    <div class="flex-grow min-w-0">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <h3 class="text-base font-bold text-[var(--text-main)] group-hover:text-red-400 transition-colors truncate uppercase tracking-tight">
            {{ movie.title }}
          </h3>
          <div class="flex items-center gap-3 mt-1">
            <span v-if="movie.year" class="text-xs text-[var(--text-muted)] font-bold italic">{{ movie.year }}</span>
            <span v-if="movie.year && movie.genre" class="w-1 h-1 bg-red-500 rounded-full opacity-40"></span>
            <span v-if="movie.genre" class="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider truncate">{{ movie.genre }}</span>
            <template v-if="movie.collection_type">
              <span class="w-1 h-1 bg-red-500 rounded-full opacity-40"></span>
              <span class="text-[10px] text-red-400 font-black uppercase tracking-widest">{{ movie.collection_type }}</span>
            </template>
            <template v-if="movie.is_boxset">
              <span class="w-1 h-1 bg-red-500 rounded-full opacity-40"></span>
              <span class="text-[10px] text-red-400 font-black uppercase tracking-widest flex items-center gap-1">
                <i class="bi bi-collection-fill"></i>{{ $t('movies.boxset') }}
              </span>
            </template>
          </div>
        </div>

        <!-- Bewertung -->
        <div v-if="movie.rating" class="flex flex-col items-end shrink-0">
          <div class="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
            <i class="bi bi-star-fill text-xs text-yellow-400"></i>
            <span class="text-sm font-black text-[var(--text-main)]">{{ movie.rating.toFixed(1) }}</span>
          </div>
        </div>
      </div>

      <p v-if="movie.overview" class="mt-3 text-xs text-[var(--text-muted)] opacity-70 line-clamp-2 leading-relaxed">
        {{ movie.overview }}
      </p>
    </div>

    <!-- Pfeil -->
    <div class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pr-2">
      <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
        <i class="bi bi-chevron-right text-lg"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import type { Movie } from '@/stores/movies'

const props = defineProps<{ movie: Movie; bulkMode?: boolean; selected?: boolean }>()
const emit = defineEmits<{ 'toggle-select': [] }>()

const router = useRouter()
const { resolveMediaUrl } = useApi()

const cover = computed(() => resolveMediaUrl(props.movie.cover_url || props.movie.cover_path, props.movie.remote_id ?? undefined))

function onClick() {
  if (props.bulkMode) emit('toggle-select')
  else router.push(`/movies/${props.movie.id}`)
}

// Gleiche Zuordnung wie in MovieCard und der Shelf
const TAG_MAP: Record<string, { label: string; bg: string }> = {
  DVD:       { label: 'DVD',     bg: 'bg-orange-800/80' },
  BluRay:    { label: 'Blu-ray', bg: 'bg-rose-800/80'   },
  '4K':      { label: '4K',      bg: 'bg-cyan-800/80'   },
  Streaming: { label: 'Stream',  bg: 'bg-emerald-800/80' },
  Digital:   { label: 'Digital', bg: 'bg-violet-800/80' },
  VHS:       { label: 'VHS',     bg: 'bg-stone-600/80'  },
  Leihe:     { label: 'Leihe',   bg: 'bg-amber-800/80'  },
}

function tagStyle(tag: string) {
  return TAG_MAP[tag] ?? { label: tag, bg: 'bg-black/50' }
}
</script>
