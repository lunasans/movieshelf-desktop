<template>
  <div v-if="movie" class="relative min-h-screen bg-[var(--bg-app)]">
    <!-- Backdrop Header -->
    <div class="relative min-h-[400px] h-[50vh] w-full overflow-hidden group">
      <img
        v-if="resolveMediaUrl((movie.backdrop_url || movie.backdrop_path) as string, Number(movie.remote_id), 'backdrop')"
        :src="resolveMediaUrl((movie.backdrop_url || movie.backdrop_path) as string, Number(movie.remote_id), 'backdrop')!"
        class="w-full h-full object-cover object-top opacity-40 shadow-inner group-hover:scale-105 transition-transform duration-1000"
      />
      <div v-else class="w-full h-full bg-gradient-to-br from-[var(--bg-sidebar)] to-[var(--bg-app)] opacity-50"></div>
      
      <!-- Gradient Overlay -->
      <div class="absolute inset-0 bg-gradient-to-t from-[var(--bg-app)] via-[var(--bg-app)]/60 to-transparent"></div>

      <!-- Manual Search Button (If no trailer) -->
      <div v-if="!movie.trailer_url" class="absolute inset-0 flex items-center justify-center z-20">
        <button 
          @click="searchYouTube"
          class="flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl border border-white/20 transition-all hover:scale-105 active:scale-95 group font-bold shadow-2xl"
        >
          <div class="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center group-hover:bg-red-500 transition-colors">
            <i class="bi bi-youtube"></i>
          </div>
          <span>{{ $t('movieDetail.searchTrailer') }}</span>
        </button>
      </div>
    </div>


    <!-- Content Over Backdrop -->
    <div class="px-12 -mt-32 relative z-10 pb-20">
      <div class="flex gap-10 items-end">
        <!-- Cover -->
        <div class="w-64 flex-shrink-0 shadow-[0_0_60px_rgba(0,0,0,0.8)] rounded-[2rem] overflow-hidden border border-white/10 aspect-[2/3] bg-[var(--bg-card)] transform hover:scale-[1.02] hover:rotate-1 transition-all duration-700">
          <img
            v-if="resolveMediaUrl((movie.cover_url || movie.cover_path) as string, Number(movie.remote_id))"
            :src="resolveMediaUrl((movie.cover_url || movie.cover_path) as string, Number(movie.remote_id))!"
            :alt="movie.title as string"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-[var(--text-muted)] opacity-20 text-4xl">🎬</div>
        </div>

        <!-- Info (Sticky Container) -->
        <div 
          ref="titleRef"
          class="flex-1 min-w-0 pb-4 sticky top-0 z-30 transition-all duration-300 -mx-12 px-12 py-4"
          :class="{ 'pointer-events-none': isSticky }"
        >
          <!-- Kennzeichen im Shelf-Stil: Sammlungstyp in der Akzentfarbe, Rest als Glas-Pille -->
          <div class="flex flex-wrap items-center gap-4 mb-6 transition-all duration-500" :class="{ 'opacity-0 scale-95 translate-y-[-10px]': isSticky }">
            <span v-if="movie.collection_type"
              class="px-6 py-2 bg-red-600 text-white rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase shadow-xl shadow-red-500/20"
            >
              {{ movie.collection_type }}
            </span>
            <span v-if="movie.year"
              class="px-6 py-2 bg-white/5 backdrop-blur-xl rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase border border-white/10 italic text-[var(--text-main)]"
            >
              {{ movie.year }}
            </span>
            <span v-if="movie.tag"
              class="px-6 py-2 bg-white/5 backdrop-blur-xl rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase border border-white/10 text-[var(--text-main)]"
            >
              {{ movie.tag }}
            </span>

            <!-- FSK wie in der Shelf: als Siegel, wenn es eine Grafik dafür gibt -->
            <img
              v-if="fskImage"
              :src="fskImage"
              :alt="`FSK ${movie.rating_age}`"
              class="h-10 w-auto drop-shadow-2xl"
            />
            <span v-else-if="movie.rating_age != null"
              class="px-6 py-2 bg-white/5 backdrop-blur-xl rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase border border-white/10 text-[var(--text-main)]"
            >
              FSK {{ movie.rating_age }}
            </span>
          </div>

          <h1
            class="font-black text-[var(--text-main)] uppercase tracking-tighter italic drop-shadow-2xl leading-[0.9] break-words transition-all duration-500"
            :class="isSticky ? 'text-2xl opacity-0 translate-y-[-10px]' : 'text-3xl xl:text-5xl mb-8 opacity-100'"
          >
            {{ movie.title }}
          </h1>
          
          <!-- Kernangaben als Icon-Zeile, wie in der Shelf -->
          <div
            class="flex flex-wrap items-center gap-x-6 gap-y-3 xl:gap-x-12 text-xs font-bold uppercase tracking-[0.2em] italic text-[var(--text-muted)] transition-all duration-500"
            :class="{ 'opacity-0 scale-95 translate-y-[-10px]': isSticky }"
          >
            <div v-if="movie.runtime" class="flex items-center gap-3">
              <i class="bi bi-clock text-red-500 text-lg"></i>
              <span class="text-[var(--text-main)]">{{ movie.runtime }} min</span>
            </div>
            <div v-if="movie.rating" class="flex items-center gap-3">
              <i class="bi bi-star-fill text-yellow-500 text-lg"></i>
              <span class="text-[var(--text-main)]">{{ Number(movie.rating).toFixed(1) }} / 10</span>
            </div>
            <div v-if="movie.genre" class="flex items-center gap-3">
              <i class="bi bi-tags-fill text-red-500 text-lg"></i>
              <span class="text-[var(--text-main)]">{{ movie.genre }}</span>
            </div>
            <div v-if="movie.director" class="flex items-center gap-3">
              <i class="bi bi-megaphone text-red-500 text-lg"></i>
              <span class="text-[var(--text-main)]">{{ movie.director }}</span>
            </div>
          </div>

          <!-- Eigene Bewertung, 5 Sterne wie in der Shelf. Der Durchschnitt aus
               mehreren Nutzern entfällt — der Desktop ist einplatzig. -->
          <div
            class="flex items-center gap-3 mt-8 transition-all duration-500"
            :class="{ 'opacity-0 scale-95 translate-y-[-10px]': isSticky }"
          >
            <span class="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              {{ $t('movieDetail.yourRating') }}
            </span>
            <div class="flex items-center gap-1" @mouseleave="hoverRating = 0">
              <button
                v-for="stern in 5"
                :key="stern"
                @click="setUserRating(stern)"
                @mouseenter="hoverRating = stern"
                :aria-label="$t('movieDetail.rateStars', { count: stern })"
                class="text-2xl leading-none transition-all active:scale-90"
                :class="(hoverRating || userRating) >= stern ? 'text-amber-400' : 'text-[var(--text-muted)] opacity-25 hover:opacity-50'"
              >
                <i class="bi bi-star-fill"></i>
              </button>
            </div>
            <span v-if="userRating > 0" class="text-xs font-medium text-[var(--text-muted)]">
              {{ userRating }}/5
            </span>
          </div>

          <!-- Physische Angaben als Pillen, wie im $hasPhysical-Block der Shelf -->
          <div
            v-if="hasPhysicalDetails"
            class="mt-8 flex flex-wrap items-center gap-2.5 transition-all duration-500"
            :class="{ 'opacity-0 scale-95 translate-y-[-10px]': isSticky }"
          >
            <span v-if="movie.collection_no" class="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <i class="bi bi-hash text-red-400"></i>{{ movie.collection_no }}
            </span>
            <span v-if="movie.edition" class="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <i class="bi bi-award text-red-400"></i>{{ movie.edition }}
            </span>
            <span v-if="movie.region_code" class="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <i class="bi bi-globe text-red-400"></i>{{ $t('movieDetail.labelRegionCode') }} {{ movie.region_code }}
            </span>
            <span v-if="movie.disc_location" class="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <i class="bi bi-geo-alt-fill text-red-400"></i>{{ movie.disc_location }}
            </span>
            <span v-if="movie.condition" class="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <i class="bi bi-patch-check-fill text-red-400"></i>{{ ({ new: $t('movieForm.conditionNew'), like_new: $t('movieForm.conditionLikeNew'), good: $t('movieForm.conditionGood'), acceptable: $t('movieForm.conditionAcceptable'), damaged: $t('movieForm.conditionDamaged') } as Record<string, string>)[movie.condition || ''] || movie.condition }}
            </span>
            <span v-if="movie.purchase_date" class="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <i class="bi bi-calendar-check text-red-400"></i>{{ movie.purchase_date }}
            </span>
            <span v-if="movie.purchase_price != null" class="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <i class="bi bi-tag-fill text-red-400"></i>{{ movie.purchase_price }} €
            </span>
          </div>
        </div>
      </div>

      <!-- Extended Info -->
      <div class="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div class="lg:col-span-2 space-y-12">
          <!-- Description -->
          <div>
            <h3 class="text-[var(--text-muted)] opacity-40 text-xs font-black uppercase tracking-[0.2em] mb-4">{{ $t('movieDetail.plot') }}</h3>
            <div v-if="movie.overview" class="text-lg text-[var(--text-main)] opacity-90 leading-relaxed font-medium">
               <template v-for="(segment, i) in parsedOverview" :key="i">
                <router-link 
                  v-if="segment.type === 'actor'" 
                  :to="(segment as any).id ? { name: 'actors.show', params: { id: (segment as any).id } } : { name: 'movies', query: { q: segment.value } }"
                  class="text-red-500 hover:text-red-600 underline decoration-red-500/30 underline-offset-4 hover:decoration-red-600 transition-all font-bold"
                >
                  {{ segment.value }}
                </router-link>
                <span v-else>{{ segment.value }}</span>
              </template>
            </div>
            <p v-else class="text-[var(--text-muted)] opacity-40 italic">{{ $t('movieDetail.noOverview') }}</p>
          </div>
          
          <!-- Cast Section -->
          <div v-if="linkedActors.length > 0">
            <h3 class="text-[var(--text-muted)] opacity-40 text-xs font-black uppercase tracking-[0.2em] mb-6">{{ $t('movieDetail.cast') }}</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <router-link 
                v-for="actor in linkedActors" 
                :key="actor.id"
                :to="{ name: 'actors.show', params: { id: actor.id } }"
                class="flex items-center gap-4 glass rounded-2xl p-3 transition-all hover:scale-[1.02] active:scale-95 group shadow-sm"
              >
                <div class="w-12 h-12 rounded-full overflow-hidden border border-[var(--border-ui)] flex-shrink-0 bg-[var(--bg-sidebar)]">
                  <img
                    v-if="resolveMediaUrl(actor.image_path, actor.remote_id, 'actor')"
                    :src="resolveMediaUrl(actor.image_path, actor.remote_id, 'actor')!"
                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)] opacity-40">👤</div>
                </div>
                <div>
                  <p class="text-[var(--text-main)] font-bold text-sm leading-tight">{{ actor.name }}</p>
                  <p v-if="actor.role" class="text-[var(--text-muted)] text-xs mt-0.5">{{ actor.role }}</p>
                </div>
              </router-link>
            </div>
          </div>

          <!-- Trailer -->
          <div v-if="movie.trailer_url">
            <h3 class="text-[var(--text-muted)] opacity-40 text-xs font-black uppercase tracking-[0.2em] mb-6">{{ $t('movieDetail.trailer') }}</h3>
            <div
              class="relative aspect-video rounded-2xl overflow-hidden glass cursor-pointer group"
              @click="openTrailer"
            >
              <img
                v-if="resolveMediaUrl((movie.backdrop_url || movie.backdrop_path) as string, Number(movie.remote_id), 'backdrop')"
                :src="resolveMediaUrl((movie.backdrop_url || movie.backdrop_path) as string, Number(movie.remote_id), 'backdrop')!"
                class="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-300"
              />
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-16 h-16 bg-red-600/90 rounded-full flex items-center justify-center shadow-2xl shadow-red-600/40 transition-all group-hover:scale-110">
                  <i class="bi bi-play-fill text-white text-3xl ml-1"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- Collection Parts (fehlende Teile einer Filmreihe) -->
          <CollectionPartsSection
            v-if="movie.tmdb_id && !movie.is_boxset && movie.collection_type !== 'Serie'"
            :tmdbId="movie.tmdb_id"
            :movieId="movie.id"
          />

          <!-- Boxset Children -->
          <div v-if="boxsetChildren.length > 0">
            <h3 class="text-[var(--text-muted)] opacity-40 text-xs font-black uppercase tracking-[0.2em] mb-6">{{ $t('movieDetail.containedMovies') }}</h3>
            <div class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4">
              <router-link
                v-for="child in boxsetChildren"
                :key="child.id"
                :to="`/movies/${child.id}`"
                class="group cursor-pointer"
              >
                <div class="relative aspect-[2/3] rounded-xl overflow-hidden glass group-hover:border-red-500/50 group-hover:scale-105 transition-all duration-300 shadow-[var(--shadow-main)]">
                  <img
                    v-if="resolveMediaUrl(child.cover_url || child.cover_path, child.remote_id)"
                    :src="resolveMediaUrl(child.cover_url || child.cover_path, child.remote_id)!"
                    :alt="child.title"
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <i class="bi bi-film text-[var(--text-muted)] opacity-20 text-2xl"></i>
                  </div>
                  <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

                  <!-- Watched badge -->
                  <div v-if="child.is_watched" class="absolute top-2 left-2 z-20">
                    <div class="bg-green-600/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-green-500/30 flex items-center">
                      <i class="bi bi-eye-fill text-[9px] text-white"></i>
                    </div>
                  </div>

                  <!-- Gesehen-Toggle -->
                  <button
                    @click.stop.prevent="toggleChildWatched(child)"
                    :class="['absolute bottom-2 right-2 z-20 w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-sm', child.is_watched ? 'bg-green-600/80 hover:bg-green-600' : 'bg-black/60 backdrop-blur-sm border border-white/10 hover:bg-black/80']"
                    :title="$t('movies.toggleWatched')"
                  >
                    <i :class="child.is_watched ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'" class="text-white"></i>
                  </button>
                </div>
                <p class="mt-1.5 text-[11px] font-black text-[var(--text-main)] truncate uppercase tracking-tight opacity-90">{{ child.title }}</p>
                <p class="text-[10px] text-[var(--text-muted)] font-bold">{{ child.year }}</p>
              </router-link>
            </div>
          </div>

          <!-- Seasons (Series) -->
          <div v-if="movie.collection_type === 'Serie' && (seasons.length > 0 || canBackfillSeasons)">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-[var(--text-muted)] opacity-40 text-xs font-black uppercase tracking-[0.2em]">{{ $t('movieDetail.seasons') }}</h3>
              <button
                v-if="canBackfillSeasons"
                @click="openSeasonBackfill"
                class="text-[10px] font-black uppercase tracking-widest text-[var(--status-red)] opacity-80 hover:opacity-100 transition-opacity"
              >
                <i class="bi bi-pencil-square mr-1"></i>{{ $t('movieDetail.backfillSeasons') }}
              </button>
            </div>
            <div class="space-y-3">
              <div v-for="season in seasons" :key="season.id" class="glass rounded-2xl overflow-hidden">
                <button
                  @click="toggleSeason(season.id)"
                  class="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-black text-[var(--text-main)] uppercase tracking-tight">
                      {{ $t('movieDetail.season', { number: season.season_number }) }}
                      <span v-if="season.title" class="font-normal normal-case tracking-normal text-[var(--text-muted)] opacity-60"> – {{ season.title }}</span>
                    </p>
                    <p v-if="season.overview" class="text-xs text-[var(--text-muted)] opacity-50 mt-0.5 truncate">{{ season.overview }}</p>
                  </div>
                  <div class="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span class="text-xs text-[var(--text-muted)] opacity-40">{{ $t('movieDetail.episodesCount', { count: season.episodes.length }) }}</span>
                    <i class="bi text-[var(--text-muted)] opacity-40 transition-transform" :class="openSeasons.has(season.id) ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
                  </div>
                </button>
                <div v-if="openSeasons.has(season.id)" class="border-t border-[var(--border-ui)]">
                  <div v-for="ep in season.episodes" :key="ep.id" class="px-5 py-3 border-b border-[var(--border-ui)] last:border-0">
                    <p class="text-sm font-bold text-[var(--text-main)]">
                      <span class="text-[var(--text-muted)] opacity-40 text-xs mr-2 font-mono">E{{ ep.episode_number }}</span>
                      {{ ep.title ?? $t('movieDetail.episodeFallback', { number: ep.episode_number }) }}
                    </p>
                    <p v-if="ep.overview" class="text-xs text-[var(--text-muted)] opacity-60 mt-1 leading-relaxed">{{ ep.overview }}</p>
                  </div>
                  <p v-if="season.episodes.length === 0" class="px-5 py-3 text-xs text-[var(--text-muted)] opacity-40 italic">{{ $t('movieDetail.noEpisodes') }}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Sidebar Actions -->
        <div class="space-y-4">
          <router-link :to="`/movies/${movie.id}/edit`"
            class="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-red-600/20">
            {{ $t('movieDetail.editMovie') }}
          </router-link>

          <!-- Listen -->
          <div class="glass rounded-2xl p-4 space-y-3">
            <p class="text-[var(--text-muted)] opacity-50 text-[10px] font-black uppercase tracking-[0.15em]">{{ $t('movieDetail.lists') }}</p>

            <div v-if="listStore.lists.length === 0" class="text-xs text-[var(--text-muted)] opacity-40 italic">
              {{ $t('movieDetail.noLists') }}
            </div>

            <div
              v-for="list in listStore.lists"
              :key="list.id"
              @click="toggleList(list.id)"
              class="flex items-center gap-3 cursor-pointer group"
            >
              <div
                class="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0"
                :class="movieListIds.has(list.id)
                  ? 'bg-red-600 border-red-600'
                  : 'border-[var(--border-ui)] group-hover:border-red-500/50'"
              >
                <i v-if="movieListIds.has(list.id)" class="bi bi-check text-white text-[10px] leading-none"></i>
              </div>
              <span class="text-sm text-[var(--text-main)] truncate">{{ list.name }}</span>
            </div>

            <router-link to="/lists"
              class="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-red-500 opacity-60 hover:opacity-100 transition-all pt-1">
              <i class="bi bi-plus-circle"></i> {{ $t('movieDetail.manageLists') }}
            </router-link>
          </div>

          <router-link to="/movies"
            class="flex items-center justify-center w-full bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--text-muted)] font-bold py-4 rounded-2xl transition-colors">
            {{ $t('movieDetail.backToCollection') }}
          </router-link>
        </div>
      </div>
    </div>

    <SeasonBackfillModal
      v-if="backfillOpen"
      :title="movie?.title ?? ''"
      :seasons="backfillSeasons"
      :existing="existingSeasonNumbers"
      :loading="backfillLoading"
      :importing="backfillImporting"
      :error="backfillError"
      @confirm="confirmSeasonBackfill"
      @cancel="backfillOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { useApi } from '@/composables/useApi'
import { useSeasonImport, type SeasonOption } from '@/composables/useSeasonImport'
import { useUiStore } from '@/stores/ui'
import { useListStore } from '@/stores/lists'
import { useSettingsStore } from '@/stores/settings'
import CollectionPartsSection from '@/components/movies/CollectionPartsSection.vue'
import SeasonBackfillModal from '@/components/movies/SeasonBackfillModal.vue'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const route = useRoute()
const { resolveMediaUrl, apiGet, apiPost } = useApi()
const { mapSeasons, fetchTvSeasons, importSeasonsLocally } = useSeasonImport()
const settings = useSettingsStore()
const ui = useUiStore()
const listStore = useListStore()
const movie = ref<any>(null)
const localMovieId = ref<number | null>(null)
const movieListIds = ref<Set<number>>(new Set())
const linkedActors = ref<any[]>([])
const boxsetChildren = ref<any[]>([])
const seasons = ref<any[]>([])
const openSeasons = ref(new Set<number>())
const isSticky = ref(false)

// Staffeln nachladen (wie in der Shelf): Dialog mit Auswahl, vorhandene gesperrt
const backfillOpen      = ref(false)
const backfillLoading   = ref(false)
const backfillImporting = ref(false)
const backfillSeasons   = ref<SeasonOption[]>([])
const backfillError     = ref<string | null>(null)

const hoverRating = ref(0)
const userRating  = computed(() => Number(movie.value?.user_rating ?? 0))

// Erneut auf denselben Stern zu klicken löscht die Bewertung; das entscheidet
// der Handler, hier wird nur das Ergebnis übernommen.
async function setUserRating(stern: number) {
  if (!movie.value) return
  const { user_rating } = await window.electron.db.movies.setUserRating(movie.value.id, stern)
  movie.value.user_rating = user_rating
  hoverRating.value = 0
}

// Nur für diese Stufen gibt es ein Siegel (public/img/fsk, aus der Shelf
// übernommen). TMDb liefert gelegentlich andere Werte — die bekommen eine
// Textpille, statt ein fehlendes Bild zu zeigen.
const FSK_STUFEN = [0, 6, 12, 16, 18]
const fskImage = computed(() => {
  const alter = movie.value?.rating_age
  return alter != null && FSK_STUFEN.includes(Number(alter))
    ? `/img/fsk/fsk-${Number(alter)}.svg`
    : null
})

// Entspricht dem $hasPhysical-Block der Shelf: die Pillenzeile erscheint nur,
// wenn zu diesem Exemplar überhaupt physische Angaben erfasst sind.
const hasPhysicalDetails = computed(() => {
  const m = movie.value
  if (!m) return false
  return !!(m.collection_no || m.edition || m.region_code || m.disc_location
    || m.condition || m.purchase_date || m.purchase_price != null)
})

const existingSeasonNumbers = computed(() => seasons.value.map((s: any) => Number(s.season_number)))
const canBackfillSeasons = computed(() =>
  !!movie.value?.tmdb_id && (settings.isOnline || settings.hasTmdb)
)

async function openSeasonBackfill() {
  backfillOpen.value = true
  backfillError.value = null
  if (backfillSeasons.value.length > 0) return
  backfillLoading.value = true
  try {
    if (settings.isOnline) {
      const data = await apiGet('/tmdb/details', { tmdb_id: movie.value.tmdb_id, type: 'tv' }) as any
      backfillSeasons.value = mapSeasons(data?.seasons ?? [])
    } else {
      backfillSeasons.value = await fetchTvSeasons(movie.value.tmdb_id)
    }
  } catch (e: any) {
    backfillError.value = e?.response?.data?.error ?? e.message
  } finally {
    backfillLoading.value = false
  }
}

async function confirmSeasonBackfill(changes: { add: number[]; remove: number[] }) {
  const { add, remove } = changes
  if (!movie.value || (add.length === 0 && remove.length === 0)) return
  backfillImporting.value = true
  backfillError.value = null
  try {
    const remoteId = movie.value.remote_id ?? (localMovieId.value === null ? movie.value.id : null)
    const localId = await ensureLocalMovie()
    if (localId === null) return

    if (settings.isOnline && remoteId) {
      // Shelf ist Master: Änderungen laufen auf dem Server, danach lokal spiegeln
      if (add.length) await apiPost('/tmdb/import-seasons', { movie_id: remoteId, seasons: add })
      if (remove.length) await apiPost('/tmdb/remove-seasons', { movie_id: remoteId, seasons: remove })
      await refreshSeasonsFromRemote(localId, remoteId)
    } else {
      if (add.length) {
        const knownNames: Record<number, string> = {}
        for (const s of backfillSeasons.value) knownNames[s.season_number] = s.name
        await importSeasonsLocally(localId, movie.value.tmdb_id, add, knownNames)
      }
      if (remove.length) await window.electron.db.seasons.remove(localId, remove)
    }

    seasons.value = await window.electron.db.seasons.forMovie(localId)
    backfillOpen.value = false
  } catch (e: any) {
    backfillError.value = e?.response?.data?.error ?? e.message
  } finally {
    backfillImporting.value = false
  }
}

function toggleSeason(seasonId: number) {
  if (openSeasons.value.has(seasonId)) {
    openSeasons.value.delete(seasonId)
  } else {
    openSeasons.value.add(seasonId)
  }
  openSeasons.value = new Set(openSeasons.value)
}

const titleRef = ref<HTMLElement | null>(null)

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  
  if (titleRef.value) {
    const rect = titleRef.value.getBoundingClientRect()
    isSticky.value = rect.top <= 64 // Etwas mehr Puffer
  } else {
    isSticky.value = target.scrollTop > 200
  }
  
  if (movie.value) {
    const newTitle = isSticky.value ? movie.value.title : ''
    // Nur aktualisieren, wenn sich der Titel wirklich ändert (Performance)
    if (ui.headerTitle !== newTitle) {
      ui.headerTitle = String(newTitle)
    }
  }
}


function openTrailer() {
  const url = movie.value?.trailer_url
  if (!url) return

  let videoId = ''
  if (url.includes('v='))        videoId = url.split('v=')[1].split('&')[0]
  else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0]
  else if (url.includes('embed/'))    videoId = url.split('embed/')[1].split('?')[0]
  else                                videoId = url

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`

  if (window.electron?.trailer) {
    window.electron.trailer.open(watchUrl)
  } else {
    window.open(watchUrl, '_blank')
  }
}

function searchYouTube() {
  const query = `${movie.value?.title} ${movie.value?.year || ''} trailer`.trim()
  window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank')
}

const parsedOverview = computed(() => {
  const text = movie.value?.overview as string
  if (!text) return []

  const cleaned = new DOMParser().parseFromString(text, 'text/html').body.textContent ?? ''
  const segments: { type: 'text' | 'actor', value: string, id?: number | null }[] = []
  const regex = /\{!Actor\}(.*?)\}|\(\[!Actor\](.*?)\)\)?/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: cleaned.slice(lastIndex, match.index) })
    }
    const actorName = match[1] || match[2]
    const foundActor = linkedActors.value.find(a => a.name === actorName)
    segments.push({ 
      type: 'actor', 
      value: actorName, 
      id: foundActor ? foundActor.id : null 
    })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < cleaned.length) {
    segments.push({ type: 'text', value: cleaned.slice(lastIndex) })
  }
  return segments
})

async function ensureLocalMovie(): Promise<number | null> {
  if (localMovieId.value !== null) return localMovieId.value
  if (!movie.value) return null
  // Film existiert noch nicht lokal — automatisch anlegen (ohne Cover-Download)
  const m = movie.value as any
  const created = await window.electron.db.movies.create({
    title:           m.title,
    year:            m.year,
    genre:           m.genre,
    director:        m.director,
    runtime:         m.runtime,
    rating:          m.rating,
    rating_age:      m.rating_age,
    overview:        m.overview,
    collection_type: m.collection_type ?? 'Film',
    tag:             m.tag,
    tmdb_id:         m.tmdb_id,
    remote_id:       m.id,
    cover_path:      m.cover_url ?? null,
    backdrop_path:   m.backdrop_url ?? null,
    actors_names:    m.actors_names ?? null,
    trailer_url:     m.trailer_url ?? null,
  }) as any
  if (!created?.id) return null
  localMovieId.value = created.id
  return created.id
}

async function toggleList(listId: number) {
  if (!movie.value) return
  const movieId = await ensureLocalMovie()
  if (movieId === null) return
  if (movieListIds.value.has(listId)) {
    await listStore.removeItem(listId, 'movie', movieId)
    movieListIds.value.delete(listId)
  } else {
    await listStore.addItem(listId, 'movie', movieId)
    movieListIds.value.add(listId)
  }
  // Force reactivity update
  movieListIds.value = new Set(movieListIds.value)
}

// Staffeln + Episoden vom Server in die lokale DB spiegeln (Upserts + Prune)
async function refreshSeasonsFromRemote(localId: number, remoteId: number) {
  try {
    const remote = await apiGet(`/movies/${remoteId}`) as any
    const remoteSeasonsData = remote?.data ?? remote
    if (remoteSeasonsData?.seasons && Array.isArray(remoteSeasonsData.seasons)) {
      for (const season of remoteSeasonsData.seasons) {
        const localSeasonId = await window.electron.db.seasons.upsert({
          remote_id: season.id, movie_id: localId,
          season_number: season.season_number, title: season.title, overview: season.overview,
        })
        if (localSeasonId && Array.isArray(season.episodes)) {
          for (const ep of season.episodes) {
            await window.electron.db.episodes.upsert({
              remote_id: ep.id, season_id: localSeasonId,
              episode_number: ep.episode_number, title: ep.title, overview: ep.overview,
            })
          }
        }
      }
      // Auf der Shelf entfernte Staffeln auch lokal entfernen (Shelf ist Master)
      await window.electron.db.seasons.pruneRemote(localId, remoteSeasonsData.seasons.map((s: any) => s.id))
    }
  } catch { /* offline oder kein Zugriff – ignorieren */ }
}

async function toggleChildWatched(child: any) {
  const result = await window.electron.db.movies.toggleWatched(child.id)
  child.is_watched = result.is_watched ? 1 : 0
}

async function loadMovie(id: number) {
  movie.value = await window.electron.db.movies.get(id)
  linkedActors.value = await window.electron.db.movies.actors.getForMovie(id)
  localMovieId.value = id
  boxsetChildren.value = []
  seasons.value = []
  openSeasons.value = new Set()
  backfillOpen.value = false
  backfillSeasons.value = []
  backfillError.value = null


  if (movie.value?.is_boxset) {
    boxsetChildren.value = await window.electron.db.movies.children(id)
  }

  if (movie.value?.collection_type === 'Serie') {
    seasons.value = await window.electron.db.seasons.forMovie(id)

    // Online-Fallback: Staffeln direkt von der API laden und lokal speichern
    if (seasons.value.length === 0 && settings.isOnline && movie.value.remote_id) {
      await refreshSeasonsFromRemote(id, movie.value.remote_id)
      seasons.value = await window.electron.db.seasons.forMovie(id)
    }

    // TMDb-Fallback: Folgen nachladen wenn Staffeln vorhanden aber Folgen fehlen
    if (settings.tmdbApiKey && movie.value?.tmdb_id) {
      const missing = seasons.value.filter(s => s.episodes.length === 0)
      if (missing.length > 0) {
        for (const season of missing) {
          try {
            const { data } = await axios.get(`${TMDB_BASE}/tv/${movie.value.tmdb_id}/season/${season.season_number}`, {
              params: { api_key: settings.tmdbApiKey, language: settings.tmdbLanguage },
            })
            for (const ep of (data.episodes ?? [])) {
              await window.electron.db.episodes.upsert({
                season_id: season.id,
                episode_number: ep.episode_number,
                title: ep.name ?? null,
                overview: ep.overview ?? null,
              })
            }
          } catch { /* ignorieren */ }
        }
        seasons.value = await window.electron.db.seasons.forMovie(id)
      }
    }

    if (seasons.value.length > 0) openSeasons.value = new Set([seasons.value[0].id])
  }

  await listStore.fetchLists()
  const ids = await window.electron.db.lists.forItem('movie', id)
  movieListIds.value = new Set(ids)
}

watch(() => route.params.id, (newId) => {
  if (newId) loadMovie(Number(newId))
})

onMounted(async () => {
  const scroller = document.querySelector('main')
  if (scroller) scroller.addEventListener('scroll', handleScroll)
  await loadMovie(Number(route.params.id))
})

onUnmounted(() => {
  const scroller = document.querySelector('main')
  if (scroller) {
    scroller.removeEventListener('scroll', handleScroll)
  }
  ui.setHeaderTitle('')
})
</script>
