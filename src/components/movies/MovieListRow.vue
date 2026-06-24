<template>
  <div
    class="flex items-center gap-3 px-3 h-full rounded-xl hover:bg-[var(--border-ui)] cursor-pointer transition-colors"
    :class="selected ? 'bg-[var(--status-red)]/10 ring-1 ring-[var(--status-red)]/40' : ''"
    @click="onClick"
  >
    <i
      v-if="bulkMode"
      class="bi flex-shrink-0 text-lg"
      :class="selected ? 'bi-check-square-fill text-[var(--status-red)]' : 'bi-square text-[var(--text-muted)] opacity-50'"
    ></i>
    <div class="h-12 aspect-[2/3] rounded-md overflow-hidden bg-[var(--bg-app)] border border-[var(--border-ui)] flex-shrink-0">
      <img v-if="cover" :src="cover" :alt="movie.title" class="w-full h-full object-cover" />
      <div v-else class="w-full h-full flex items-center justify-center text-[var(--text-muted)] opacity-20 text-xs">🎬</div>
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-bold text-[var(--text-main)] truncate opacity-90">
        <i v-if="movie.is_watched" class="bi bi-eye-fill text-[var(--status-green)] mr-1.5 text-xs"></i>{{ movie.title }}
      </p>
      <p class="text-xs text-[var(--text-muted)] opacity-60 truncate">{{ [movie.year, movie.genre].filter(Boolean).join(' · ') }}</p>
    </div>
    <div v-if="movie.rating" class="text-xs font-black text-amber-400 flex items-center gap-1 flex-shrink-0">
      <i class="bi bi-star-fill"></i>{{ movie.rating.toFixed(1) }}
    </div>
    <div class="text-xs text-[var(--text-muted)] opacity-40 font-bold uppercase tracking-tighter flex-shrink-0 w-16 text-right">{{ movie.collection_type }}</div>
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
</script>
