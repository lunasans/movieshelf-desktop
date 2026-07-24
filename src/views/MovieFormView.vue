<template>
  <div class="p-8 max-w-4xl mx-auto">
    <div class="flex items-start justify-between mb-8">
      <div>
        <h1 class="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">
          {{ isEdit ? $t('movieForm.editTitle') : $t('movieForm.addTitle') }}
        </h1>
        <p class="text-sm text-[var(--text-muted)] opacity-60">{{ isEdit ? form.title : $t('movieForm.addSubtitle') }}</p>
      </div>
    </div>

    <!-- Cover & Backdrop preview (edit only) -->
    <div v-if="isEdit" class="flex gap-4 mb-6">
      <!-- Cover -->
      <div class="flex-shrink-0">
        <p class="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60 mb-2">Cover</p>
        <div
          class="relative w-28 rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-ui)] aspect-[2/3] cursor-pointer group"
          @click="coverInput?.click()"
          :title="$t('movieForm.uploadCover')"
        >
          <img v-if="coverDisplayUrl" :src="coverDisplayUrl" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-[var(--text-muted)] opacity-20">
            <i class="bi bi-image text-2xl"></i>
          </div>
          <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
            <i class="bi bi-upload text-white text-lg"></i>
            <span class="text-white text-[10px] font-bold">Upload</span>
          </div>
        </div>
        <input ref="coverInput" type="file" accept="image/*" class="hidden" @change="uploadImage('cover', $event)" />
      </div>

      <!-- Backdrop -->
      <div class="flex-1 min-w-0">
        <p class="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60 mb-2">Backdrop</p>
        <div
          class="relative w-full rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-ui)] aspect-video cursor-pointer group"
          @click="backdropInput?.click()"
          :title="$t('movieForm.uploadBackdrop')"
        >
          <img v-if="backdropDisplayUrl" :src="backdropDisplayUrl" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-[var(--text-muted)] opacity-20">
            <i class="bi bi-image text-2xl"></i>
          </div>
          <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
            <i class="bi bi-upload text-white text-lg"></i>
            <span class="text-white text-[10px] font-bold">Upload</span>
          </div>
        </div>
        <input ref="backdropInput" type="file" accept="image/*" class="hidden" @change="uploadImage('backdrop', $event)" />
      </div>
    </div>

    <form @submit.prevent="save" class="space-y-4">
      <FormRow :label="$t('movieForm.fieldTitle')">
        <input v-model="form.title" required type="text" class="input" />
      </FormRow>
      <div class="grid grid-cols-2 gap-4">
        <FormRow :label="$t('movieForm.fieldYear')">
          <input v-model.number="form.year" type="number" min="1900" max="2099" class="input" />
        </FormRow>
        <FormRow :label="$t('movieForm.fieldRuntime')">
          <input v-model.number="form.runtime" type="number" class="input" />
        </FormRow>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <FormRow :label="$t('movieForm.fieldType')">
          <!-- Option-Values sind DB-Werte und bleiben unübersetzt; nur Labels sind lokalisiert -->
          <select v-model="form.collection_type" class="input">
            <option value="Film">{{ $t('movieForm.typeMovie') }}</option>
            <option value="Serie">{{ $t('movieForm.typeSeries') }}</option>
          </select>
        </FormRow>
        <FormRow :label="$t('movieForm.fieldTag')">
          <select v-model="form.tag" class="input">
            <option value="">—</option>
            <option>DVD</option>
            <option>BluRay</option>
            <option>4K</option>
            <option>Streaming</option>
            <option>Digital</option>
            <option>VHS</option>
            <option>Leihe</option>
          </select>
        </FormRow>
      </div>
      <FormRow :label="$t('movieForm.fieldGenre')">
        <input v-model="form.genre" type="text" :placeholder="$t('movieForm.genrePlaceholder')" class="input" />
      </FormRow>
      <FormRow :label="$t('movieForm.fieldDirector')">
        <input v-model="form.director" type="text" class="input" />
      </FormRow>
      <div class="grid grid-cols-2 gap-4">
        <FormRow :label="$t('movieForm.fieldRating')">
          <input v-model.number="form.rating" type="number" min="0" max="100" step="0.1" class="input" />
        </FormRow>
        <FormRow :label="$t('movieForm.fieldRatingAge')">
          <input v-model.number="form.rating_age" type="number" class="input" />
        </FormRow>
      </div>
      <FormRow :label="$t('movieForm.fieldOverview')">
        <textarea v-model="form.overview" rows="4" class="input resize-none"></textarea>
      </FormRow>
      <FormRow :label="$t('movieForm.fieldTrailerUrl')">
        <div class="flex gap-2">
          <input v-model="form.trailer_url" type="url" class="input flex-1" placeholder="https://www.youtube.com/watch?v=..." />
          <button
            type="button"
            @click="searchYouTube"
            class="px-4 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] rounded-xl text-xs font-bold text-[var(--text-main)] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <i class="bi bi-youtube text-red-500"></i>
            {{ $t('movieForm.youtubeSearch') }}
          </button>
        </div>
      </FormRow>
      <div class="grid grid-cols-2 gap-4">
        <FormRow :label="$t('movieForm.fieldEdition')">
          <input v-model="form.edition" type="text" class="input" :placeholder="$t('movieForm.editionPlaceholder')" />
        </FormRow>
        <FormRow :label="$t('movieForm.fieldRegionCode')">
          <input v-model="form.region_code" type="text" class="input" placeholder="2, B, Free" />
        </FormRow>
      </div>
      <FormRow :label="$t('movieForm.fieldDiscLocation')">
        <input v-model="form.disc_location" type="text" class="input" :placeholder="$t('movieForm.discLocationPlaceholder')" />
      </FormRow>
      <div class="grid grid-cols-2 gap-4">
        <FormRow :label="$t('movieForm.fieldPurchaseDate')">
          <input v-model="form.purchase_date" type="date" class="input" />
        </FormRow>
        <FormRow :label="$t('movieForm.fieldPurchasePrice')">
          <input v-model.number="form.purchase_price" type="number" min="0" step="0.01" class="input" placeholder="0.00" />
        </FormRow>
      </div>
      <FormRow :label="$t('movieForm.fieldCondition')">
        <select v-model="form.condition" class="input">
          <option value="">—</option>
          <option value="new">{{ $t('movieForm.conditionNew') }}</option>
          <option value="like_new">{{ $t('movieForm.conditionLikeNew') }}</option>
          <option value="good">{{ $t('movieForm.conditionGood') }}</option>
          <option value="acceptable">{{ $t('movieForm.conditionAcceptable') }}</option>
          <option value="damaged">{{ $t('movieForm.conditionDamaged') }}</option>
        </select>
      </FormRow>
      <FormRow :label="$t('movieForm.fieldTmdbId')">
        <div class="flex gap-2">
          <input v-model.number="form.tmdb_id" type="number" class="input flex-1" />
          <button
            v-if="isEdit && form.tmdb_id"
            type="button"
            @click="reloadFromTmdb"
            :disabled="reloadingTmdb"
            class="px-4 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] rounded-xl text-xs font-bold text-[var(--text-main)] transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            <i class="bi bi-arrow-repeat" :class="{ 'animate-spin': reloadingTmdb }"></i>
            {{ reloadingTmdb ? $t('movieForm.reloading') : $t('movieForm.reloadFromTmdb') }}
          </button>
        </div>
        <p v-if="tmdbReloadError" class="text-xs text-red-500 mt-1.5">{{ tmdbReloadError }}</p>
        <p v-if="tmdbReloadSuccess" class="text-xs text-green-500 mt-1.5">{{ $t('movieForm.reloadSuccess') }}</p>
      </FormRow>
      <FormRow :label="$t('movieForm.fieldAddedAt')">
        <input v-model="form.created_at" type="date" class="input" />
      </FormRow>

      <!-- Actors section (edit mode only) -->
      <div v-if="isEdit" class="pt-2">
        <div class="flex items-center justify-between mb-3">
          <label class="block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">{{ $t('movieForm.actorsLabel') }}</label>
          <button
            type="button"
            @click="pickerOpen = true"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] rounded-xl text-xs font-bold text-[var(--text-main)] transition-colors"
          >
            <i class="bi bi-plus-lg text-red-500"></i>
            {{ $t('movieForm.addActor') }}
          </button>
        </div>

        <div v-if="actors.length === 0"
          class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl px-5 py-4 text-center">
          <p class="text-xs text-[var(--text-muted)] opacity-40">{{ $t('movieForm.noActors') }}</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="actor in actors"
            :key="actor.id"
            class="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl px-4 py-3"
          >
            <div class="w-9 h-9 rounded-full overflow-hidden bg-[var(--bg-elevated)] flex-shrink-0 flex items-center justify-center">
              <img v-if="actor.image_path" :src="resolveActorImage(actor)" class="w-full h-full object-cover" />
              <i v-else class="bi bi-person text-[var(--text-muted)] opacity-30"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-[var(--text-main)] truncate">{{ actor.name }}</p>
              <div class="flex items-center gap-2 mt-0.5">
                <span v-if="actor.role" class="text-xs text-[var(--text-muted)] opacity-60 truncate">{{ actor.role }}</span>
                <span
                  v-if="actor.is_main_role"
                  class="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded-md flex-shrink-0"
                >{{ $t('movieForm.mainRole') }}</span>
              </div>
            </div>
            <button
              type="button"
              @click="removeActor(actor.id)"
              class="text-[var(--text-muted)] opacity-30 hover:opacity-80 hover:text-red-500 transition-all flex-shrink-0"
            >
              <i class="bi bi-x-lg text-sm"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button type="submit" :disabled="saving"
          class="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 active:scale-95">
          <i class="bi bi-check-lg"></i>
          {{ saving ? $t('movieForm.saving') : $t('common.save') }}
        </button>
        <router-link to="/movies"
          class="flex-1 text-center bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] text-[var(--text-muted)] font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2">
          <i class="bi bi-x-lg"></i>
          {{ $t('common.cancel') }}
        </router-link>
      </div>
    </form>

    <ActorPickerModal
      :open="pickerOpen"
      :filmId="Number(route.params.id)"
      @close="pickerOpen = false"
      @added="loadActors"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import FormRow from '@/components/ui/FormRow.vue'
import ActorPickerModal from '@/components/movies/ActorPickerModal.vue'
import { useMovieStore } from '@/stores/movies'
import { useSettingsStore } from '@/stores/settings'

const TMDB_BASE = 'https://api.themoviedb.org/3'

const route       = useRoute()
const router      = useRouter()
const movieStore  = useMovieStore()
const settings    = useSettingsStore()

const isEdit = computed(() => !!route.params.id)
const saving = ref(false)
const pickerOpen = ref(false)
const actors = ref<any[]>([])
const reloadingTmdb = ref(false)
const tmdbReloadError = ref('')
const tmdbReloadSuccess = ref(false)

const coverInput    = ref<HTMLInputElement | null>(null)
const backdropInput = ref<HTMLInputElement | null>(null)
const coverPreview    = ref<string | null>(null)
const backdropPreview = ref<string | null>(null)

const form = ref({
  title: '', year: null as number | null, genre: '', director: '',
  runtime: null as number | null, rating: null as number | null,
  rating_age: null as number | null, overview: '', trailer_url: '',
  edition: '' as string | null, region_code: '' as string | null,
  disc_location: '' as string | null, purchase_date: '' as string | null,
  purchase_price: null as number | null, condition: '' as string | null,
  collection_type: 'Film', tag: '', tmdb_id: null as number | null,
  created_at: new Date().toISOString().slice(0, 10),
  cover_path: null as string | null,
  backdrop_path: null as string | null,
  remote_id: null as number | null,
})

const coverDisplayUrl = computed(() => {
  if (coverPreview.value) return coverPreview.value
  const p = form.value.cover_path
  if (!p) return null
  if (p.startsWith('http') || p.startsWith('movie-resource://')) return p
  const fileId = form.value.remote_id ?? route.params.id
  return `movie-resource://${fileId}.jpg`
})

const backdropDisplayUrl = computed(() => {
  if (backdropPreview.value) return backdropPreview.value
  const p = form.value.backdrop_path
  if (!p) return null
  if (p.startsWith('http') || p.startsWith('movie-resource://')) return p
  const fileId = form.value.remote_id ?? route.params.id
  return `movie-resource://${fileId}_backdrop.jpg`
})

async function uploadImage(type: 'cover' | 'backdrop', event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !isEdit.value) return
  const movieId = Number(route.params.id)
  // Use remote_id as file ID so sync sees the file and skips re-download
  const fileId = form.value.remote_id ?? movieId

  const buffer = await file.arrayBuffer()
  const result = await window.electron.db.movies.upload(buffer, fileId, type)

  if (result?.success) {
    const localUrl = URL.createObjectURL(file)
    if (type === 'cover') {
      coverPreview.value = localUrl
      form.value.cover_path = `movie-resource://${fileId}.jpg`
      await window.electron.db.movies.update(movieId, { cover_path: form.value.cover_path })
    } else {
      backdropPreview.value = localUrl
      form.value.backdrop_path = `movie-resource://${fileId}_backdrop.jpg`
      await window.electron.db.movies.update(movieId, { backdrop_path: form.value.backdrop_path })
    }
  }
  ;(event.target as HTMLInputElement).value = ''
}

function resolveActorImage(actor: any): string {
  if (!actor.image_path) return ''
  if (actor.image_path.startsWith('http')) return actor.image_path
  return `movie-resource://${actor.id}_actor.jpg`
}

function searchYouTube() {
  const query = `${form.value.title} ${form.value.year || ''} trailer`.trim()
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
  window.open(url, '_blank')
}

async function reloadFromTmdb() {
  if (!form.value.tmdb_id || !isEdit.value) return
  reloadingTmdb.value = true
  tmdbReloadError.value = ''
  tmdbReloadSuccess.value = false
  const movieId = Number(route.params.id)
  // Use remote_id as file ID (sync-compatible); fall back to local id
  const fileId  = form.value.remote_id ?? movieId
  const isTv    = form.value.collection_type === 'Serie'

  async function downloadAndSave(posterPath: string | null, backdropPath: string | null) {
    const dbUpdates: Record<string, string> = {}
    if (posterPath) {
      const res = await window.electron.db.movies.download(`https://image.tmdb.org/t/p/w500${posterPath}`, fileId, 'cover')
      console.log('[TMDb reload] cover download:', res)
      if (res?.success) {
        form.value.cover_path = `movie-resource://${fileId}.jpg`
        dbUpdates.cover_path  = form.value.cover_path
        coverPreview.value    = null
      }
    }
    if (backdropPath) {
      const res = await window.electron.db.movies.download(`https://image.tmdb.org/t/p/w1280${backdropPath}`, fileId, 'backdrop')
      console.log('[TMDb reload] backdrop download:', res)
      if (res?.success) {
        form.value.backdrop_path = `movie-resource://${fileId}_backdrop.jpg`
        dbUpdates.backdrop_path  = form.value.backdrop_path
        backdropPreview.value    = null
      }
    }
    if (Object.keys(dbUpdates).length) await window.electron.db.movies.update(movieId, dbUpdates)
  }

  try {
    if (isTv) {
      const { data: m } = await axios.get(`${TMDB_BASE}/tv/${form.value.tmdb_id}`, {
        params: { api_key: settings.tmdbApiKey, language: settings.tmdbLanguage, append_to_response: 'credits,videos' }
      })
      const creator = (m.created_by ?? [])[0]?.name ?? form.value.director
      const trailer = (m.videos?.results ?? []).find((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))
      Object.assign(form.value, {
        title:        m.name,
        year:         m.first_air_date ? parseInt(m.first_air_date.slice(0, 4)) : form.value.year,
        genre:        (m.genres ?? []).map((g: any) => g.name).join(', '),
        director:     creator,
        runtime:      (m.episode_run_time ?? [])[0] ?? form.value.runtime,
        rating:       m.vote_average != null ? Math.round(m.vote_average * 10) / 10 : form.value.rating,
        overview:     m.overview || form.value.overview,
        trailer_url:  trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : form.value.trailer_url,
        actors_names: (m.credits?.cast ?? []).slice(0, 10).map((c: any) => c.name).join(', '),
      })
      await downloadAndSave(m.poster_path ?? null, m.backdrop_path ?? null)
    } else {
      const [detailRes, videoRes] = await Promise.all([
        axios.get(`${TMDB_BASE}/movie/${form.value.tmdb_id}`, {
          params: { api_key: settings.tmdbApiKey, language: settings.tmdbLanguage, append_to_response: 'credits' }
        }),
        axios.get(`${TMDB_BASE}/movie/${form.value.tmdb_id}/videos`, {
          params: { api_key: settings.tmdbApiKey, language: settings.tmdbLanguage }
        }).catch(() => ({ data: { results: [] } }))
      ])
      const m        = detailRes.data
      const director = (m.credits?.crew ?? []).find((c: any) => c.job === 'Director')?.name ?? form.value.director
      const trailer  = (videoRes.data.results ?? []).find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
      Object.assign(form.value, {
        title:        m.title,
        year:         m.release_date ? parseInt(m.release_date.slice(0, 4)) : form.value.year,
        genre:        (m.genres ?? []).map((g: any) => g.name).join(', '),
        director,
        runtime:      m.runtime ?? form.value.runtime,
        rating:       m.vote_average != null ? Math.round(m.vote_average * 10) / 10 : form.value.rating,
        overview:     m.overview || form.value.overview,
        trailer_url:  trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : form.value.trailer_url,
        actors_names: (m.credits?.cast ?? []).slice(0, 10).map((c: any) => c.name).join(', '),
      })
      await downloadAndSave(m.poster_path ?? null, m.backdrop_path ?? null)
    }
    tmdbReloadSuccess.value = true
    setTimeout(() => { tmdbReloadSuccess.value = false }, 3000)
  } catch (e: any) {
    tmdbReloadError.value = e?.response?.data?.status_message ?? e.message
  } finally {
    reloadingTmdb.value = false
  }
}

async function loadActors() {
  if (!isEdit.value) return
  actors.value = await window.electron.db.movies.actors.getForMovie(Number(route.params.id)) as any[]
}

async function removeActor(actorId: number) {
  await window.electron.db.movies.actors.unlink(Number(route.params.id), actorId)
  await loadActors()
}

onMounted(async () => {
  if (isEdit.value) {
    const id = Number(route.params.id)
    const data = await window.electron.db.movies.get(id)
    Object.assign(form.value, data)
    if (form.value.rating != null) form.value.rating = Math.round((form.value.rating as number) * 10) / 10
    if (form.value.created_at) form.value.created_at = (form.value.created_at as string).slice(0, 10)
    await loadActors()
  }
})

async function save() {
  saving.value = true
  try {
    if (isEdit.value) {
      await window.electron.db.movies.update(Number(route.params.id), { ...form.value })
    } else {
      await window.electron.db.movies.create({ ...form.value })
      movieStore.clearCache()
    }
    router.push('/movies')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
@reference "tailwindcss";
.input {
  @apply w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-red-500/50 transition-colors;
}
</style>
