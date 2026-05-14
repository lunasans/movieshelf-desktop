<template>
  <div class="p-8 max-w-4xl">
    <h1 class="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">
      {{ isEdit ? 'Film bearbeiten' : 'Film hinzufügen' }}
    </h1>
    <p class="text-sm text-[var(--text-muted)] opacity-60 mb-8">{{ isEdit ? form.title : 'Neuen Film zur Sammlung hinzufügen' }}</p>

    <form @submit.prevent="save" class="space-y-4">
      <FormRow label="Titel *">
        <input v-model="form.title" required type="text" class="input" />
      </FormRow>
      <div class="grid grid-cols-2 gap-4">
        <FormRow label="Jahr">
          <input v-model.number="form.year" type="number" min="1900" max="2099" class="input" />
        </FormRow>
        <FormRow label="Laufzeit (min)">
          <input v-model.number="form.runtime" type="number" class="input" />
        </FormRow>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <FormRow label="Typ">
          <select v-model="form.collection_type" class="input">
            <option>Film</option>
            <option>Serie</option>
            <option>Dokumentation</option>
            <option>Kurzfilm</option>
          </select>
        </FormRow>
        <FormRow label="Format-Tag">
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
      <FormRow label="Genre">
        <input v-model="form.genre" type="text" placeholder="Action, Drama, ..." class="input" />
      </FormRow>
      <FormRow label="Regisseur">
        <input v-model="form.director" type="text" class="input" />
      </FormRow>
      <div class="grid grid-cols-2 gap-4">
        <FormRow label="Bewertung (0–100)">
          <input v-model.number="form.rating" type="number" min="0" max="100" step="0.1" class="input" />
        </FormRow>
        <FormRow label="FSK">
          <input v-model.number="form.rating_age" type="number" class="input" />
        </FormRow>
      </div>
      <FormRow label="Beschreibung">
        <textarea v-model="form.overview" rows="4" class="input resize-none"></textarea>
      </FormRow>
      <FormRow label="Trailer URL">
        <div class="flex gap-2">
          <input v-model="form.trailer_url" type="url" class="input flex-1" placeholder="https://www.youtube.com/watch?v=..." />
          <button
            type="button"
            @click="searchYouTube"
            class="px-4 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] rounded-xl text-xs font-bold text-[var(--text-main)] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <i class="bi bi-youtube text-red-500"></i>
            YouTube Suche
          </button>
        </div>
      </FormRow>
      <FormRow label="TMDb ID">
        <input v-model.number="form.tmdb_id" type="number" class="input" />
      </FormRow>
      <FormRow label="Hinzugefügt am">
        <input v-model="form.created_at" type="date" class="input" />
      </FormRow>

      <!-- Actors section (edit mode only) -->
      <div v-if="isEdit" class="pt-2">
        <div class="flex items-center justify-between mb-3">
          <label class="block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">Schauspieler</label>
          <button
            type="button"
            @click="pickerOpen = true"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] rounded-xl text-xs font-bold text-[var(--text-main)] transition-colors"
          >
            <i class="bi bi-plus-lg text-red-500"></i>
            Hinzufügen
          </button>
        </div>

        <div v-if="actors.length === 0"
          class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl px-5 py-4 text-center">
          <p class="text-xs text-[var(--text-muted)] opacity-40">Noch keine Schauspieler zugeordnet.</p>
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
                >Hauptrolle</span>
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
          {{ saving ? 'Speichern...' : 'Speichern' }}
        </button>
        <router-link to="/movies"
          class="flex-1 text-center bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] text-[var(--text-muted)] font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2">
          <i class="bi bi-x-lg"></i>
          Abbrechen
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
import FormRow from '@/components/ui/FormRow.vue'
import ActorPickerModal from '@/components/movies/ActorPickerModal.vue'
import { useMovieStore } from '@/stores/movies'

const route       = useRoute()
const router      = useRouter()
const movieStore  = useMovieStore()

const isEdit = computed(() => !!route.params.id)
const saving = ref(false)
const pickerOpen = ref(false)
const actors = ref<any[]>([])

const form = ref({
  title: '', year: null as number | null, genre: '', director: '',
  runtime: null as number | null, rating: null as number | null,
  rating_age: null as number | null, overview: '', trailer_url: '',
  collection_type: 'Film', tag: '', tmdb_id: null as number | null,
  created_at: new Date().toISOString().slice(0, 10),
})

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
