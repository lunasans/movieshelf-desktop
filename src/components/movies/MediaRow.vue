<template>
  <!-- Waagrecht scrollende Reihe wie im Streaming-Layout der Shelf
       (movies/partials/streaming-layout.blade.php). -->
  <section v-if="movies.length > 0" class="relative group/row mb-4">
    <div class="flex items-center justify-between mb-6 px-2">
      <h2 class="text-2xl font-black text-[var(--text-main)] tracking-tight">
        {{ title }}
      </h2>
      <router-link
        v-if="to"
        :to="to"
        class="text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
      >
        {{ $t('dashboard.viewAll') }}
      </router-link>
    </div>

    <!-- Pfeile erscheinen beim Überfahren der Reihe -->
    <button
      v-show="canScrollLeft"
      @click="scrollBy(-600)"
      :aria-label="$t('dashboard.scrollLeft')"
      class="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all hover:bg-red-600 shadow-2xl"
    >
      <i class="bi bi-chevron-left text-xl"></i>
    </button>
    <button
      v-show="canScrollRight"
      @click="scrollBy(600)"
      :aria-label="$t('dashboard.scrollRight')"
      class="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all hover:bg-red-600 shadow-2xl"
    >
      <i class="bi bi-chevron-right text-xl"></i>
    </button>

    <div
      ref="slider"
      @scroll.passive="checkScroll"
      class="flex gap-6 overflow-x-auto no-scrollbar pb-8 px-2 scroll-smooth"
    >
      <div
        v-for="movie in movies"
        :key="movie.id"
        @click="router.push(`/movies/${movie.id}`)"
        class="w-[160px] xl:w-[200px] shrink-0 aspect-[2/3] relative rounded-[2rem] overflow-hidden glass border-white/10 group cursor-pointer hover:border-red-500/50 hover:scale-105 transition-all duration-500 shadow-2xl"
      >
        <img
          v-if="cover(movie)"
          :src="cover(movie)!"
          :alt="movie.title"
          class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div v-else class="w-full h-full bg-gradient-to-br from-[var(--bg-app)] via-[var(--bg-sidebar)] to-[var(--bg-app)] flex items-center justify-center">
          <i class="bi bi-film text-3xl text-[var(--text-muted)] opacity-20"></i>
        </div>

        <!-- Dauerhafter Verlauf für Lesbarkeit auf hellen Covern, weicht dem Hover-Verlauf -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-0 transition-opacity duration-500"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <div class="absolute bottom-0 left-0 right-0 p-5 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
          <h4 class="text-xs font-black text-white uppercase tracking-wider mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
            {{ movie.title }}
          </h4>
          <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
            <span v-if="movie.year" class="text-[8px] font-black text-red-400 uppercase tracking-widest">{{ movie.year }}</span>
            <div v-if="movie.year && movie.collection_type" class="h-1 w-1 bg-white/20 rounded-full"></div>
            <span v-if="movie.collection_type" class="text-[8px] font-black text-white/40 uppercase tracking-widest">{{ movie.collection_type }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'

const props = defineProps<{
  title: string
  movies: any[]
  to?: string
}>()

const router = useRouter()
const { resolveMediaUrl } = useApi()

const slider = ref<HTMLElement | null>(null)
const canScrollLeft  = ref(false)
const canScrollRight = ref(false)

function cover(movie: any): string | null {
  return resolveMediaUrl(movie.cover_url || movie.cover_path, movie.remote_id ?? undefined)
}

function checkScroll() {
  const el = slider.value
  if (!el) return
  canScrollLeft.value  = el.scrollLeft > 10
  canScrollRight.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 10
}

function scrollBy(left: number) {
  slider.value?.scrollBy({ left, behavior: 'smooth' })
}

// Die Pfeile hängen an der Breite: nach dem Laden der Filme und bei jeder
// Fenstergröße neu bestimmen, sonst zeigt eine kurze Reihe einen Pfeil ins Leere.
watch(() => props.movies, () => nextTick(checkScroll), { deep: false })

onMounted(() => {
  nextTick(checkScroll)
  window.addEventListener('resize', checkScroll)
})
onUnmounted(() => window.removeEventListener('resize', checkScroll))
</script>
