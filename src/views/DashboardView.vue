<template>
  <div class="p-8">
    <!-- Hero-Slider wie in der Shelf (movies/partials/streaming-layout.blade.php):
         zufällige Titel mit Hintergrundbild, alle 8 Sekunden weiter.
         Randlos bis an die Kanten, deshalb die negativen Außenabstände.
         Kein overflow-hidden: die Suchleiste steht bewusst über die Unterkante
         hinaus. Das Beschneiden übernimmt der innere Backdrop-Rahmen. -->
    <section
      v-if="featured.length > 0"
      class="relative -mx-8 -mt-8 mb-20 h-[70vh] min-h-[420px] rounded-b-[3rem] group"
    >
      <Transition name="hero" mode="out-in">
        <div :key="active" class="absolute inset-0 z-0">
          <!-- Backdrop mit langsamer Fahrt -->
          <div class="absolute inset-0 overflow-hidden rounded-b-[3rem]">
            <img
              v-if="heroImage(featured[active])"
              :src="heroImage(featured[active])!"
              :alt="featured[active].title"
              class="w-full h-full object-cover hero-pan"
            />
            <div v-else class="w-full h-full bg-gradient-to-br from-[var(--bg-sidebar)] to-[var(--bg-app)]"></div>
            <!-- Dreifacher Verlauf wie in der Shelf: unten, oben, links -->
            <div class="absolute inset-0 bg-gradient-to-t from-[var(--bg-app)] via-[var(--bg-app)]/60 to-transparent"></div>
            <div class="absolute inset-0 bg-gradient-to-b from-[var(--bg-app)] via-[var(--bg-app)]/20 to-transparent"></div>
            <div class="absolute inset-0 bg-gradient-to-r from-[var(--bg-app)] via-transparent to-transparent"></div>
          </div>

          <!-- Inhalt -->
          <div class="absolute inset-0 z-10 flex flex-col justify-center px-12 max-w-3xl">
            <div class="mb-4 flex items-center gap-3">
              <span class="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-widest">
                {{ $t('dashboard.featured') }}
              </span>
              <span class="text-[var(--text-muted)] text-xs font-bold">
                {{ [featured[active].year, featured[active].collection_type].filter(Boolean).join(' • ') }}
              </span>
            </div>

            <h1 class="text-4xl xl:text-6xl font-black text-[var(--text-main)] tracking-tighter mb-4 drop-shadow-2xl break-words">
              {{ featured[active].title }}
            </h1>

            <p class="text-[var(--text-muted)] text-base line-clamp-3 mb-8 max-w-xl font-medium">
              {{ plainOverview(featured[active].overview) || $t('dashboard.featuredFallback') }}
            </p>

            <div>
              <router-link
                :to="`/movies/${featured[active].id}`"
                class="inline-flex items-center gap-3 px-8 py-4 bg-[var(--text-main)] text-[var(--bg-app)] rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                <i class="bi bi-play-fill text-2xl"></i>
                {{ $t('dashboard.heroDetails') }}
              </router-link>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Suchleiste sitzt wie in der Shelf auf der Unterkante des Heros.
           Sie ersetzt das Feld in der Filmliste: die Eingabe führt über ?q=
           dorthin. -->
      <div class="absolute bottom-0 left-0 right-0 z-40 translate-y-1/2">
        <form @submit.prevent="submitSearch" class="relative group">
          <input
            ref="searchEl"
            v-model="searchTerm"
            type="text"
            :placeholder="$t('movies.searchPlaceholder')"
            class="w-full bg-white/10 border-y border-white/20 py-4 pl-20 pr-12 text-xl xl:text-2xl font-light tracking-wide text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none backdrop-blur-3xl transition-all shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] focus:bg-white/20 focus:border-red-500/50 group-hover:bg-white/15"
          />
          <div class="absolute left-10 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-red-400 transition-colors">
            <i class="bi bi-search text-2xl"></i>
          </div>
          <!-- Hinweis auf das Tastenkürzel, verschwindet beim Tippen -->
          <div
            v-if="!searchTerm"
            class="absolute right-12 top-1/2 -translate-y-1/2 px-5 py-2 rounded-2xl bg-black/40 border border-white/10 text-[10px] font-black text-[var(--text-muted)] pointer-events-none flex items-center gap-3 uppercase tracking-[0.3em] group-focus-within:opacity-0 transition-opacity"
          >
            <span>{{ $t('common.search') }}</span>
            <span class="bg-white/10 px-2 py-1 rounded">/</span>
          </div>
        </form>
      </div>

      <!-- Indikatoren -->
      <div v-if="featured.length > 1" class="absolute bottom-12 right-12 z-20 flex gap-3">
        <button
          v-for="(movie, i) in featured"
          :key="movie.id"
          @click="select(i)"
          :aria-label="movie.title"
          class="h-1.5 transition-all duration-500 rounded-full"
          :class="active === i ? 'w-12 bg-red-600' : 'w-4 bg-white/20 hover:bg-white/40'"
        ></button>
      </div>
    </section>

    <!-- Waagrechte Reihen wie im Streaming-Layout der Shelf.
         „Neu dabei" mischt Filme und Serien, darunter beide getrennt. -->
    <MediaRow :title="$t('dashboard.newArrivals')" :movies="recent" to="/movies" />
    <MediaRow :title="$t('dashboard.moviesRow')"   :movies="movies" to="/movies" />
    <MediaRow :title="$t('dashboard.seriesRow')"   :movies="series" to="/series" />

    <div v-if="recent.length === 0" class="film-list-area p-8 text-center text-sm text-[var(--text-muted)] opacity-40">
      {{ $t('dashboard.noMovies') }}
    </div>

    <!-- Die Kennzahlen saßen früher hier; sie liegen jetzt wie in der Shelf
         auf einer eigenen Seite, erreichbar über die Seitenleiste. -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import MediaRow from '@/components/movies/MediaRow.vue'

const router = useRouter()
const { resolveMediaUrl } = useApi()

const searchEl   = ref<HTMLInputElement | null>(null)
const searchTerm = ref('')

// Die Filmliste liest die Suche aus ?q= — dort landet die Eingabe.
function submitSearch() {
  const q = searchTerm.value.trim()
  if (!q) return
  router.push({ path: '/movies', query: { q } })
}

const recent   = ref<any[]>([])
const movies   = ref<any[]>([])
const series   = ref<any[]>([])
const featured = ref<any[]>([])
const active   = ref(0)

const HERO_INTERVAL = 8000
let heroTimer: ReturnType<typeof setInterval> | undefined

// Die Handlung kommt aus der Shelf mit HTML und Shortcodes. Als Teaser braucht
// der Hero reinen Text — sonst steht dort wörtlich "<p>Liebe und Rebellion...".
// Gleiches Vorgehen wie parsedOverview in der Detailansicht.
function plainOverview(raw?: string | null): string {
  if (!raw) return ''
  const text = new DOMParser().parseFromString(raw, 'text/html').body.textContent ?? ''
  return text.replace(/\{!Actor\}(.*?)\}|\(\[!Actor\](.*?)\)\)?/g, (_m, a, b) => a ?? b ?? '').trim()
}

// Für den Hero zählt das Backdrop; ohne eines trägt das Cover den Platz.
function heroImage(movie: any): string | null {
  return resolveMediaUrl(movie.backdrop_url || movie.backdrop_path, movie.remote_id ?? undefined, 'backdrop')
    ?? resolveMediaUrl(movie.cover_url || movie.cover_path, movie.remote_id ?? undefined)
}

function startHeroTimer() {
  stopHeroTimer()
  if (featured.value.length < 2) return
  heroTimer = setInterval(() => {
    active.value = (active.value + 1) % featured.value.length
  }, HERO_INTERVAL)
}

function stopHeroTimer() {
  if (heroTimer) clearInterval(heroTimer)
  heroTimer = undefined
}

// Nach einem Klick auf einen Indikator wieder von vorn zählen, sonst springt
// die Anzeige gleich nach der Auswahl weiter.
function select(index: number) {
  active.value = index
  startHeroTimer()
}

onMounted(async () => {
  const [recentMovies, moviesList, seriesList] = await Promise.all([
    window.electron.db.movies.recent(20),
    // Sortierung wie in der Film- bzw. Serienansicht (Titel aufsteigend, siehe
    // Voreinstellung in stores/movies.ts), damit „Alle ansehen" dieselbe
    // Reihenfolge fortsetzt. excludeType statt collectionType: alles außer
    // Serien zählt als Film, auch Einträge ohne gesetzten Typ.
    window.electron.db.movies.list({ excludeType: 'Serie', perPage: 20, sortBy: 'title', sortDir: 'ASC' }),
    window.electron.db.movies.list({ collectionType: 'Serie', perPage: 20, sortBy: 'title', sortDir: 'ASC' }),
  ])
  recent.value = recentMovies as any[]
  movies.value = ((moviesList as any)?.data ?? []) as any[]
  series.value = ((seriesList as any)?.data ?? []) as any[]

  // Der Hero ist Beiwerk: getrennt geladen, damit ein Fehler dort nicht das
  // ganze Dashboard leer lässt. Ohne Treffer entfällt er einfach.
  try {
    featured.value = await window.electron.db.movies.featured(5) as any[]
    startHeroTimer()
  } catch (e) {
    console.error('Hero konnte nicht geladen werden', e)
  }
})

onUnmounted(stopHeroTimer)
</script>

<style scoped>
/* Langsame Fahrt über das Backdrop, wie die duration-[20s]-Skalierung der Shelf */
.hero-pan {
  animation: hero-pan 20s ease-out forwards;
}
@keyframes hero-pan {
  from { transform: scale(1); }
  to   { transform: scale(1.1); }
}

.hero-enter-active,
.hero-leave-active { transition: opacity 0.8s ease, transform 0.8s ease; }
.hero-enter-from   { opacity: 0; transform: scale(1.05); }
.hero-leave-to     { opacity: 0; transform: scale(0.95); }

@media (prefers-reduced-motion: reduce) {
  .hero-pan { animation: none; }
  .hero-enter-active, .hero-leave-active { transition: opacity 0.2s ease; }
  .hero-enter-from, .hero-leave-to { transform: none; }
}
</style>
