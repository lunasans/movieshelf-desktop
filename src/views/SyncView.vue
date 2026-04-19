<template>
  <div class="p-8 max-w-3xl mx-auto">
    <h1 class="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">Synchronisation</h1>
    <p class="text-sm text-[var(--text-muted)] opacity-60 mb-8">Lokale Sammlung mit deiner MovieShelf abgleichen</p>

    <!-- Not connected -->
    <div v-if="!settings.isOnline" class="bg-[var(--status-yellow-bg)] border border-[var(--status-yellow)]/20 rounded-2xl p-8 text-center">
      <i class="bi bi-cloud-slash text-3xl text-[var(--status-yellow)] block mb-3"></i>
      <p class="text-[var(--status-yellow)] text-base font-black uppercase tracking-tight mb-2">Nicht verbunden</p>
      <p class="text-[var(--text-muted)] opacity-70 text-sm max-w-xs mx-auto mb-6">Bitte zuerst in den Einstellungen eine MovieShelf-Verbindung einrichten.</p>
      <router-link to="/settings" class="inline-block px-6 py-3 bg-[var(--bg-elevated)] border border-[var(--border-ui)] rounded-xl text-[var(--status-red)] text-sm font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
        Zu den Einstellungen →
      </router-link>
    </div>

    <template v-else>

      <!-- Status row -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-4">
          <p class="text-xs text-[var(--text-muted)] opacity-50 font-bold uppercase tracking-widest mb-1">Lokal</p>
          <p class="text-2xl font-black text-[var(--text-main)]">{{ localCount }}</p>
          <p class="text-xs text-[var(--text-muted)] opacity-50 mt-0.5">Filme</p>
        </div>
        <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-4">
          <p class="text-xs text-[var(--text-muted)] opacity-50 font-bold uppercase tracking-widest mb-1">Ausstehend</p>
          <p class="text-2xl font-black" :class="dirtyCount > 0 ? 'text-[var(--status-yellow)]' : 'text-[var(--text-main)]'">{{ dirtyCount }}</p>
          <p class="text-xs text-[var(--text-muted)] opacity-50 mt-0.5">Änderungen</p>
        </div>
        <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-4">
          <p class="text-xs text-[var(--text-muted)] opacity-50 font-bold uppercase tracking-widest mb-1">Letzter Sync</p>
          <p class="text-sm font-black text-[var(--text-main)] leading-tight mt-1">{{ lastSyncLabel }}</p>
        </div>
      </div>

      <!-- Active sync progress -->
      <div v-if="phase !== 'idle'" class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-[var(--status-red)]/10 flex items-center justify-center">
              <i class="bi bi-arrow-repeat text-[var(--status-red)] animate-spin"></i>
            </div>
            <div>
              <p class="text-sm font-black text-[var(--text-main)]">{{ phaseLabel }}</p>
              <p class="text-xs text-[var(--text-muted)] opacity-50">{{ phaseDetail }}</p>
            </div>
          </div>
          <span class="text-xs font-black text-[var(--text-muted)] opacity-40">{{ progressPct }}%</span>
        </div>
        <div class="w-full bg-[var(--bg-app)] rounded-full h-1.5 overflow-hidden">
          <div
            class="h-1.5 bg-[var(--status-red)] rounded-full transition-all duration-300"
            :style="{ width: progressPct + '%' }"
          ></div>
        </div>
      </div>

      <!-- Result summary -->
      <div v-if="result && phase === 'idle'" class="rounded-2xl p-5 mb-6 border"
        :class="result.errors > 0
          ? 'bg-[var(--status-yellow-bg)] border-[var(--status-yellow)]/20'
          : 'bg-[var(--bg-card)] border-[var(--status-green)]/30'">
        <div class="flex items-center gap-3 mb-3">
          <i class="bi text-lg" :class="result.errors > 0 ? 'bi-exclamation-triangle text-[var(--status-yellow)]' : 'bi-check-circle text-[var(--status-green)]'"></i>
          <p class="font-black text-sm text-[var(--text-main)]">
            {{ result.errors > 0 ? 'Sync abgeschlossen mit Fehlern' : 'Sync erfolgreich' }}
          </p>
          <span class="ml-auto text-xs text-[var(--text-muted)] opacity-50">{{ result.duration }}s</span>
        </div>
        <div class="grid grid-cols-5 gap-3">
          <div class="text-center">
            <p class="text-xl font-black text-[var(--text-main)]">{{ result.pulled }}</p>
            <p class="text-xs text-[var(--text-muted)] opacity-50">Gezogen</p>
          </div>
          <div class="text-center">
            <p class="text-xl font-black text-[var(--text-main)]">{{ result.pushed }}</p>
            <p class="text-xs text-[var(--text-muted)] opacity-50">Hochgeladen</p>
          </div>
          <div class="text-center">
            <p class="text-xl font-black text-[var(--text-main)]">{{ result.deleted }}</p>
            <p class="text-xs text-[var(--text-muted)] opacity-50">Gelöscht</p>
          </div>
          <div class="text-center">
            <p class="text-xl font-black text-[var(--text-main)]">{{ result.media }}</p>
            <p class="text-xs text-[var(--text-muted)] opacity-50">Bilder</p>
          </div>
          <div class="text-center">
            <p class="text-xl font-black" :class="result.errors > 0 ? 'text-[var(--status-yellow)]' : 'text-[var(--text-muted)]'">{{ result.errors }}</p>
            <p class="text-xs text-[var(--text-muted)] opacity-50">Fehler</p>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <button @click="runPull" :disabled="phase !== 'idle'"
          class="bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] disabled:opacity-40 text-[var(--text-main)] text-sm font-bold px-4 py-4 rounded-2xl transition-all flex flex-col items-center gap-2">
          <i class="bi bi-cloud-download text-xl text-[var(--status-red)]"></i>
          <span>Shelf → Desktop</span>
          <span class="text-xs text-[var(--text-muted)] opacity-50">Metadaten + Bilder</span>
        </button>
        <button @click="runPush" :disabled="phase !== 'idle'"
          class="bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] disabled:opacity-40 text-[var(--text-main)] text-sm font-bold px-4 py-4 rounded-2xl transition-all flex flex-col items-center gap-2"
          :class="dirtyCount > 0 ? 'border-[var(--status-yellow)]/30' : ''">
          <i class="bi bi-cloud-upload text-xl text-[var(--status-red)]"></i>
          <span>Desktop → Shelf</span>
          <span class="text-xs text-[var(--text-muted)] opacity-50">{{ dirtyCount > 0 ? `${dirtyCount} Änderungen` : 'Keine Änderungen' }}</span>
        </button>
      </div>

      <button @click="runFullSync" :disabled="phase !== 'idle'"
        class="w-full bg-[var(--status-red)] hover:opacity-90 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all text-sm flex items-center justify-center gap-3 shadow-lg shadow-red-600/10">
        <i class="bi bi-arrow-repeat text-lg" :class="{ 'animate-spin': phase !== 'idle' }"></i>
        {{ phase !== 'idle' ? phaseLabel : 'Vollständig synchronisieren' }}
      </button>

      <!-- Error log (collapsible) -->
      <div v-if="errors.length > 0" class="mt-4">
        <button @click="showErrors = !showErrors" class="text-xs text-[var(--status-yellow)] font-bold flex items-center gap-1">
          <i :class="showErrors ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
          {{ errors.length }} Fehler anzeigen
        </button>
        <div v-if="showErrors" class="mt-2 bg-[var(--bg-card)] border border-[var(--status-yellow)]/20 rounded-xl p-4 space-y-1 max-h-40 overflow-y-auto">
          <p v-for="(e, i) in errors" :key="i" class="text-xs font-mono text-[var(--status-yellow)] opacity-80">{{ e }}</p>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useApi } from '@/composables/useApi'

const settings = useSettingsStore()
const { apiGet, apiPost, apiPut, apiDelete, resolveMediaUrl } = useApi()

// ── State ────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'connecting' | 'metadata' | 'media' | 'push'

const phase       = ref<Phase>('idle')
const phaseLabel  = ref('')
const phaseDetail = ref('')
const progressPct = ref(0)

const localCount  = ref(0)
const dirtyCount  = ref(0)
const lastSyncLabel = ref('–')

const showErrors  = ref(false)
const errors      = ref<string[]>([])

const result = ref<{ pulled: number; deleted: number; pushed: number; media: number; errors: number; duration: string } | null>(null)

// ── Init ─────────────────────────────────────────────────────────────────────

onMounted(loadStats)

async function loadStats() {
  const all = await window.electron.db.movies.list({ page: 1, perPage: 1 }) as any
  localCount.value = all.total

  const dirty = await window.electron.db.movies.sync.dirty() as any[]
  dirtyCount.value = dirty.length

  const ts = await window.electron.settings.get('last_sync_at') as string | null
  if (ts) {
    const d = new Date(ts)
    lastSyncLabel.value = d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: '2-digit' })
      + ' ' + d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })
  }
}

// ── Sync helpers ─────────────────────────────────────────────────────────────

function setPhase(p: Phase, label: string, detail = '', pct = 0) {
  phase.value       = p
  phaseLabel.value  = label
  phaseDetail.value = detail
  progressPct.value = pct
}

// ── Pull ─────────────────────────────────────────────────────────────────────

async function pull(): Promise<{ pulled: number; deleted: number; media: number; pullErrors: number }> {
  setPhase('connecting', 'Verbinde mit Shelf…', '', 0)

  const since = await window.electron.settings.get('last_sync_at') as string | null
  const data = await apiGet('/admin/export', since ? { since } : {})
  const movies = data.movies as any[]
  let pulled = 0, deleted = 0, media = 0, pullErrors = 0

  // Metadata
  setPhase('metadata', data.is_delta ? 'Delta laden' : 'Metadaten laden', `0 / ${movies.length}`, 0)
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i]
    phaseDetail.value = `${movie.title}`
    progressPct.value = Math.round((i / movies.length) * 50)

    try {
      // Auf dem Server gelöscht → lokal entfernen
      if (movie.is_deleted) {
        const r = await window.electron.db.movies.deleteByRemoteId(movie.id)
        if (r.success) deleted++
        continue
      }

      const local = await window.electron.db.movies.create({
        title:           movie.title,
        year:            movie.year,
        genre:           movie.genre,
        director:        movie.director,
        runtime:         movie.runtime,
        rating:          movie.rating,
        rating_age:      movie.rating_age,
        overview:        movie.overview,
        collection_type: movie.collection_type ?? 'Film',
        tag:             movie.tag,
        tmdb_id:         movie.tmdb_id,
        remote_id:       movie.id,
        cover_path:      movie.cover_url,
        backdrop_path:   movie.backdrop_url,
        actors_names:    movie.actors_names,
        trailer_url:     movie.trailer_url,
        updated_at:      movie.updated_at,
      }) as { id: number } | null

      if (local) {
        await window.electron.db.movies.sync.markSynced({
          id: local.id, remote_id: movie.id, synced_at: new Date().toISOString()
        })

        if (movie.actors && Array.isArray(movie.actors)) {
          for (const a of movie.actors) {
            const aid = await window.electron.db.movies.actors.upsert({
              remote_id: a.id, name: a.name, bio: a.bio, birthday: a.birthday,
              place_of_birth: a.place_of_birth, tmdb_id: a.tmdb_id, image_path: a.image_url
            })
            await window.electron.db.movies.actors.link({
              film_id: local.id, actor_id: aid, role: a.role, is_main_role: a.is_main_role
            })
          }
        }
        pulled++
      }
    } catch (e: any) {
      errors.value.push(`Pull ${movie.title}: ${e.message}`)
      pullErrors++
    }
  }

  // Media
  setPhase('media', 'Bilder herunterladen', '', 50)
  const processedActors = new Set<number>()
  let mediaTotal = 0

  // Count total media items first
  for (const movie of movies) {
    if (movie.cover_url) mediaTotal++
    if (movie.backdrop_url) mediaTotal++
    if (movie.actors) for (const a of movie.actors) if (!processedActors.has(a.id) && a.image_url) { mediaTotal++; processedActors.add(a.id) }
  }
  processedActors.clear()

  let mediaDone = 0
  for (const movie of movies) {
    phaseDetail.value = movie.title

    const coverUrl = resolveMediaUrl(movie.cover_url)
    if (coverUrl) {
      const r = await window.electron.db.movies.download(coverUrl, movie.id, 'cover')
      if (r.success) media++
      mediaDone++
      progressPct.value = 50 + Math.round((mediaDone / Math.max(mediaTotal, 1)) * 50)
    }

    const backdropUrl = resolveMediaUrl(movie.backdrop_url)
    if (backdropUrl) {
      const r = await window.electron.db.movies.download(backdropUrl, movie.id, 'backdrop')
      if (r.success) media++
      mediaDone++
      progressPct.value = 50 + Math.round((mediaDone / Math.max(mediaTotal, 1)) * 50)
    }

    if (movie.actors && Array.isArray(movie.actors)) {
      for (const a of movie.actors) {
        if (!processedActors.has(a.id) && a.image_url) {
          const url = resolveMediaUrl(a.image_url)
          if (url) {
            const r = await window.electron.db.movies.download(url, a.id, 'actor')
            if (r.success) media++
            mediaDone++
            progressPct.value = 50 + Math.round((mediaDone / Math.max(mediaTotal, 1)) * 50)
          }
          processedActors.add(a.id)
        }
      }
    }
  }

  progressPct.value = 100
  return { pulled, deleted, media, pullErrors }
}

// ── Push ─────────────────────────────────────────────────────────────────────

async function push(): Promise<{ pushed: number; pushErrors: number }> {
  setPhase('push', 'Änderungen hochladen', '', 0)

  const dirty = await window.electron.db.movies.sync.dirty() as any[]
  let pushed = 0, pushErrors = 0

  for (let i = 0; i < dirty.length; i++) {
    const movie = dirty[i]
    phaseDetail.value = movie.title
    progressPct.value = Math.round((i / Math.max(dirty.length, 1)) * 100)

    try {
      if (movie.is_deleted) {
        if (movie.remote_id) await apiDelete(`/admin/movies/${movie.remote_id}`)
        await window.electron.db.movies.sync.hardDelete(movie.id)
      } else if (!movie.remote_id) {
        let res
        if (movie.tmdb_id) {
          res = await apiPost('/tmdb/import', { tmdb_id: movie.tmdb_id, type: movie.collection_type === 'Serie' ? 'tv' : 'movie' })
        } else {
          res = await apiPost('/admin/movies', {
            title: movie.title, year: movie.year, genre: movie.genre, director: movie.director,
            runtime: movie.runtime, rating: movie.rating, rating_age: movie.rating_age,
            overview: movie.overview, collection_type: movie.collection_type,
            tag: movie.tag, tmdb_id: movie.tmdb_id, trailer_url: movie.trailer_url
          })
        }
        await window.electron.db.movies.sync.markSynced({ id: movie.id, remote_id: res.data.id, synced_at: new Date().toISOString() })
        pushed++
      } else {
        await apiPut(`/admin/movies/${movie.remote_id}`, {
          title: movie.title, year: movie.year, genre: movie.genre, director: movie.director,
          runtime: movie.runtime, rating: movie.rating, rating_age: movie.rating_age,
          overview: movie.overview, collection_type: movie.collection_type,
          tag: movie.tag, tmdb_id: movie.tmdb_id, trailer_url: movie.trailer_url
        })
        await window.electron.db.movies.sync.markSynced({ id: movie.id, remote_id: movie.remote_id, synced_at: new Date().toISOString() })
        pushed++
      }
    } catch (e: any) {
      errors.value.push(`Push ${movie.title}: ${e.message}`)
      pushErrors++
    }
  }

  progressPct.value = 100
  return { pushed, pushErrors }
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function runPull() {
  errors.value = []
  result.value = null
  const start = Date.now()
  try {
    const { pulled, deleted, media, pullErrors } = await pull()
    result.value = { pulled, deleted, pushed: 0, media, errors: pullErrors, duration: ((Date.now() - start) / 1000).toFixed(1) }
    await saveSyncTime()
  } catch (e: any) {
    errors.value.push(e.message)
  } finally {
    phase.value = 'idle'
    await loadStats()
  }
}

async function runPush() {
  errors.value = []
  result.value = null
  const start = Date.now()
  try {
    const { pushed, pushErrors } = await push()
    result.value = { pulled: 0, deleted: 0, pushed, media: 0, errors: pushErrors, duration: ((Date.now() - start) / 1000).toFixed(1) }
    await saveSyncTime()
  } catch (e: any) {
    errors.value.push(e.message)
  } finally {
    phase.value = 'idle'
    await loadStats()
  }
}

async function runFullSync() {
  errors.value = []
  result.value = null
  const start = Date.now()
  let pulled = 0, deleted = 0, pushed = 0, media = 0, totalErrors = 0

  try {
    const pullResult = await pull()
    pulled  = pullResult.pulled
    deleted = pullResult.deleted
    media   = pullResult.media
    totalErrors += pullResult.pullErrors

    const pushResult = await push()
    pushed = pushResult.pushed
    totalErrors += pushResult.pushErrors

    result.value = { pulled, deleted, pushed, media, errors: totalErrors, duration: ((Date.now() - start) / 1000).toFixed(1) }
    await saveSyncTime()
  } catch (e: any) {
    errors.value.push(e.message)
  } finally {
    phase.value = 'idle'
    await loadStats()
  }
}

async function saveSyncTime() {
  const now = new Date().toISOString()
  await window.electron.settings.set('last_sync_at', now)
}
</script>
