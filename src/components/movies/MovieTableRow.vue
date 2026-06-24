<template>
  <div
    class="grid items-center gap-3 px-3 h-full rounded-lg cursor-pointer transition-colors text-xs"
    :class="[gridCols, selected ? 'bg-[var(--status-red)]/10 ring-1 ring-[var(--status-red)]/40' : 'hover:bg-[var(--border-ui)]']"
    @click="onClick"
  >
    <div class="flex items-center justify-center">
      <i
        v-if="bulkMode"
        class="bi text-base"
        :class="selected ? 'bi-check-square-fill text-[var(--status-red)]' : 'bi-square text-[var(--text-muted)] opacity-50'"
      ></i>
      <div v-else class="h-8 aspect-[2/3] rounded overflow-hidden bg-[var(--bg-app)] border border-[var(--border-ui)]">
        <img v-if="cover" :src="cover" :alt="movie.title" class="w-full h-full object-cover" />
        <div v-else class="w-full h-full flex items-center justify-center text-[var(--text-muted)] opacity-20 text-[9px]">🎬</div>
      </div>
    </div>
    <p class="font-bold text-[var(--text-main)] truncate opacity-90">
      <i v-if="movie.is_watched" class="bi bi-eye-fill text-[var(--status-green)] mr-1.5 text-[10px]"></i>{{ movie.title }}
    </p>
    <p class="text-[var(--text-muted)] opacity-60 text-center tabular-nums">{{ movie.year ?? '—' }}</p>
    <p class="text-center tabular-nums" :class="movie.rating ? 'text-amber-400 font-black' : 'text-[var(--text-muted)] opacity-30'">
      {{ movie.rating ? movie.rating.toFixed(1) : '—' }}
    </p>
    <p class="text-[var(--text-muted)] opacity-60 text-center tabular-nums">{{ movie.runtime ? movie.runtime + ' min' : '—' }}</p>
    <p class="text-[var(--text-muted)] opacity-40 font-bold uppercase tracking-tighter truncate text-right">{{ movie.collection_type }}</p>
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

// Geteiltes Spaltenraster – muss mit dem Header in MoviesView übereinstimmen.
const gridCols = 'grid-cols-[40px_1fr_56px_56px_72px_minmax(0,90px)]'
const cover = computed(() => resolveMediaUrl(props.movie.cover_url || props.movie.cover_path, props.movie.remote_id ?? undefined))

function onClick() {
  if (props.bulkMode) emit('toggle-select')
  else router.push(`/movies/${props.movie.id}`)
}
</script>
