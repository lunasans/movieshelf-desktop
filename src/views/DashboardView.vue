<template>
  <div class="p-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-black text-[var(--text-main)] mb-1 uppercase tracking-tight">{{ $t('dashboard.title') }}</h1>
        <p class="text-sm text-[var(--text-muted)] opacity-60">{{ $t('dashboard.welcome') }}</p>
      </div>
      <button
        @click="openStats"
        class="flex items-center gap-2 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] hover:border-red-500/40 text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm font-bold px-4 py-2 rounded-xl transition-all"
      >
        <i class="bi bi-bar-chart-fill text-red-500"></i> {{ $t('dashboard.statsButton') }}
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <StatCard :label="$t('dashboard.totalMovies')" :value="stats.total" icon="film" />
      <StatCard :label="$t('dashboard.watched')"     :value="stats.watched" icon="eye" />
      <StatCard :label="$t('dashboard.avgRating')"   :value="stats.avgRating" icon="star-fill" />
    </div>

    <div class="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-ui)] p-8 shadow-[var(--shadow-main)]">
      <h2 class="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] opacity-40 mb-6">{{ $t('dashboard.recentlyAdded') }}</h2>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div v-if="recent.length === 0" class="text-sm text-[var(--text-muted)] opacity-20 text-center py-8">
          {{ $t('dashboard.noMovies') }}
        </div>
        <MovieListRow v-for="movie in recent" :key="movie.id" :movie="movie" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import StatCard from '@/components/ui/StatCard.vue'
import MovieListRow from '@/components/movies/MovieListRow.vue'
const recent = ref<any[]>([])
const stats  = ref({ total: 0, watched: 0, avgRating: 0 })

function openStats() {
  window.electron.stats.openWindow()
}

onMounted(async () => {
  const [recentMovies, s] = await Promise.all([
    window.electron.db.movies.recent(10),
    window.electron.stats.get(),
  ])
  recent.value = recentMovies as any[]
  stats.value.total     = s.totalMovies   ?? 0
  stats.value.watched   = s.watchedMovies ?? 0
  stats.value.avgRating = s.avgRating     ?? 0
})
</script>
