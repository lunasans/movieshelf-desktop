<template>
  <div class="p-8">
    <div class="flex items-baseline justify-between mb-8">
      <div>
        <h1 class="text-2xl font-black text-[var(--text-main)] tracking-tight">
          {{ $t('wishlist.title') }}
        </h1>
        <p class="text-xs text-[var(--text-muted)] opacity-60 mt-1">
          {{ $t('wishlist.subtitle') }}
        </p>
      </div>
      <span v-if="movies.length" class="text-xs text-[var(--text-muted)] opacity-60">
        {{ $t('lists.movieCount', movies.length) }}
      </span>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-24">
      <div class="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="!movies.length" class="text-center py-24">
      <i class="bi bi-heart text-4xl text-[var(--text-muted)] opacity-20 block mb-4"></i>
      <p class="text-sm font-black text-[var(--text-main)]">{{ $t('wishlist.empty') }}</p>
      <p class="text-xs text-[var(--text-muted)] opacity-60 mt-2">{{ $t('wishlist.emptyHint') }}</p>
    </div>

    <!-- Dasselbe Raster wie in der Sammlung: eine Wunschliste ist keine andere
         Art von Liste, nur eine andere Auswahl. -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-5">
      <MovieCard
        v-for="movie in movies"
        :key="movie.id"
        :movie="movie"
        @click="$router.push('/movies/' + movie.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MovieCard from '@/components/movies/MovieCard.vue'
import type { Movie } from '@/stores/movies'

// Die Bruecke liefert rohe Zeilen; die Karte erwartet den Movie-Typ. Die
// Umwandlung passiert einmal hier statt in jeder Vorlage.
const movies  = ref<Movie[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    movies.value = (await window.electron.db.movies.wishlist()) as unknown as Movie[]
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
