<template>
  <div
    class="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--border-ui)] cursor-pointer transition-colors"
    @click="router.push(`/movies/${movie.id}`)"
  >
    <div class="w-10 aspect-[2/3] rounded-lg overflow-hidden bg-[var(--bg-app)] border border-[var(--border-ui)] flex-shrink-0">
      <img v-if="resolveMediaUrl(movie.cover_url || movie.cover_path, movie.remote_id)" :src="resolveMediaUrl(movie.cover_url || movie.cover_path, movie.remote_id)!" :alt="movie.title" class="w-full h-full object-cover" />
      <div v-else class="w-full h-full flex items-center justify-center text-[var(--text-muted)] opacity-20 text-xs">🎬</div>
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-bold text-[var(--text-main)] truncate opacity-90">{{ movie.title }}</p>
      <p class="text-xs text-[var(--text-muted)] opacity-60">{{ movie.year }} · {{ movie.genre }}</p>
    </div>
    <div class="text-xs text-[var(--text-muted)] opacity-40 font-bold uppercase tracking-tighter">{{ movie.collection_type }}</div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import type { Movie } from '@/stores/movies'

defineProps<{ movie: Movie }>()
const router = useRouter()
const { resolveMediaUrl } = useApi()
</script>
