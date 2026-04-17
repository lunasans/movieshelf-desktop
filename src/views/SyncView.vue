<template>
  <div class="p-8 max-w-4xl mx-auto">
    <h1 class="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">Synchronisation</h1>
    <p class="text-sm text-[var(--text-muted)] opacity-60 mb-8">Lokale Sammlung mit deiner MovieShelf abgleichen</p>

    <div v-if="!settings.isOnline" class="bg-[var(--status-yellow-bg)] border border-[var(--status-yellow)]/20 rounded-2xl p-8 text-center shadow-lg">
      <div class="w-16 h-16 bg-[var(--status-yellow)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <i class="bi bi-cloud-slash text-2xl text-[var(--status-yellow)]"></i>
      </div>
      <p class="text-[var(--status-yellow)] text-lg font-black uppercase tracking-tight mb-2">Nicht verbunden</p>
      <p class="text-[var(--text-muted)] opacity-70 text-sm max-w-xs mx-auto">Bitte zuerst in den Einstellungen eine MovieShelf-Verbindung einrichten, um deine Filme zu synchronisieren.</p>
      <router-link to="/settings" class="inline-block mt-6 px-6 py-3 bg-[var(--bg-elevated)] border border-[var(--border-ui)] rounded-xl text-[var(--status-red)] text-sm font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
        Zu den Einstellungen →
      </router-link>
    </div>

    <template v-else>
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-ui)] p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <i class="bi bi-cloud-download text-[var(--status-red)]"></i>
              <p class="text-sm font-bold text-[var(--text-main)]">Shelf → Desktop (Pull)</p>
            </div>
            <p class="text-xs text-[var(--text-muted)] opacity-60 mb-6">Filme von deiner Cloud herunterladen</p>
          </div>
          <button
            @click="() => syncFromShelf()"
            :disabled="syncing"
            class="w-full bg-[var(--bg-app)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] text-[var(--text-main)] text-sm font-bold px-4 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <i class="bi bi-download" v-if="!syncing"></i>
            {{ syncing ? 'Läuft...' : 'Metadaten importieren' }}
          </button>
        </div>

        <div class="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-ui)] p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <i class="bi bi-cloud-upload text-[var(--status-red)]"></i>
              <p class="text-sm font-bold text-[var(--text-main)]">Desktop → Shelf (Push)</p>
            </div>
            <p class="text-xs text-[var(--text-muted)] opacity-60 mb-6">Lokale Änderungen hochladen</p>
          </div>
          <button
            @click="syncToShelf"
            :disabled="syncing"
            class="w-full bg-[var(--status-red)]/10 hover:bg-[var(--status-red)] text-[var(--status-red)] hover:text-white text-sm font-bold px-4 py-3 rounded-xl border border-[var(--status-red)]/20 transition-all flex items-center justify-center gap-2"
          >
            <i class="bi bi-upload" v-if="!syncing"></i>
            {{ syncing ? 'Läuft...' : 'Änderungen hochladen' }}
          </button>
        </div>
      </div>

      <div class="bg-[var(--status-red)] rounded-3xl p-8 mb-6 flex items-center justify-between shadow-xl shadow-red-900/10">
        <div class="flex items-center gap-6">
          <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white text-3xl">
            <i class="bi bi-arrow-repeat" :class="{ 'animate-spin': syncing }"></i>
          </div>
          <div>
            <p class="text-white font-black uppercase tracking-widest text-[10px] opacity-80 mb-1">Empfohlen</p>
            <p class="text-2xl font-black text-white leading-tight">Vollständiger Abgleich</p>
            <p class="text-white/70 text-xs mt-1">Beide Richtungen gleichzeitig synchronisieren</p>
          </div>
        </div>
        <button
          @click="fullSync"
          :disabled="syncing"
          class="bg-white text-[var(--status-red)] px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-3"
        >
          <i class="bi bi-arrow-repeat" v-if="!syncing"></i>
          {{ syncing ? 'Synchronisiere...' : 'JETZT SYNCHRONISIEREN' }}
        </button>
      </div>

      <div v-if="log.length > 0" class="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-ui)] p-6">
        <p class="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] opacity-40 mb-4">Protokoll</p>
        <div class="space-y-1.5 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
          <p v-for="(line, i) in log" :key="i" class="text-xs font-mono opacity-70"
            :class="line.type === 'error' ? 'text-red-400' : line.type === 'bold' ? 'text-[var(--text-main)] font-bold' : 'text-[var(--text-main)]'">
            {{ line.text }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useApi } from '@/composables/useApi'

const settings = useSettingsStore()
const { apiGet, apiPost, apiPut, apiDelete, resolveMediaUrl } = useApi()

type LogLine = { text: string; type: 'info' | 'bold' | 'error' }

const syncing = ref(false)
const log = ref<LogLine[]>([])

function logInfo(text: string)  { log.value.push({ text, type: 'info' }) }
function logBold(text: string)  { log.value.push({ text, type: 'bold' }) }
function logError(text: string) { log.value.push({ text, type: 'error' }) }

async function fullSync() {
  await syncFromShelf(false)
  await syncToShelf()
}

async function syncToShelf() {
  syncing.value = true
  if (log.value.length === 0) log.value = []
  logBold('Push-Sync gestartet...')

  try {
    const dirty = await window.electron.db.movies.sync.dirty() as any[]
    if (dirty.length === 0) {
      logInfo('Keine lokalen Änderungen zum Hochladen gefunden.')
      return
    }

    logInfo(`${dirty.length} lokale Änderungen werden verarbeitet...`)

    for (const movie of dirty) {
      try {
        if (movie.is_deleted) {
          if (movie.remote_id) {
            logInfo(`Lösche remote: ${movie.title}...`)
            await apiDelete(`/admin/movies/${movie.remote_id}`)
          }
          await window.electron.db.movies.sync.hardDelete(movie.id)
        }
        else if (!movie.remote_id) {
          logInfo(`Erstelle remote: ${movie.title}...`)
          let res
          if (movie.tmdb_id) {
            res = await apiPost('/tmdb/import', {
              tmdb_id: movie.tmdb_id,
              type: movie.collection_type === 'Serie' ? 'tv' : 'movie'
            })
          } else {
            res = await apiPost('/admin/movies', {
              title: movie.title,
              year: movie.year,
              genre: movie.genre,
              director: movie.director,
              runtime: movie.runtime,
              rating: movie.rating,
              rating_age: movie.rating_age,
              overview: movie.overview,
              collection_type: movie.collection_type,
              tag: movie.tag,
              tmdb_id: movie.tmdb_id,
              trailer_url: movie.trailer_url
            })
          }

          await window.electron.db.movies.sync.markSynced({
            id: movie.id,
            remote_id: res.data.id,
            synced_at: new Date().toISOString()
          })
        }
        else {
          logInfo(`Aktualisiere remote: ${movie.title}...`)
          await apiPut(`/admin/movies/${movie.remote_id}`, {
            title: movie.title,
            year: movie.year,
            genre: movie.genre,
            director: movie.director,
            runtime: movie.runtime,
            rating: movie.rating,
            rating_age: movie.rating_age,
            overview: movie.overview,
            collection_type: movie.collection_type,
            tag: movie.tag,
            tmdb_id: movie.tmdb_id,
            trailer_url: movie.trailer_url
          })

          await window.electron.db.movies.sync.markSynced({
            id: movie.id,
            remote_id: movie.remote_id,
            synced_at: new Date().toISOString()
          })
        }
      } catch (e: any) {
        logError(`Fehler bei ${movie.title}: ${e.message}`)
      }
    }
    logInfo('✓ Push-Sync abgeschlossen.')
  } catch (e: any) {
    logError(`Fataler Fehler: ${e.message}`)
  } finally {
    syncing.value = false
  }
}

async function syncFromShelf(resetLog = true) {
  syncing.value = true
  if (resetLog) log.value = []
  logBold('Pull-Sync gestartet...')

  try {
    logInfo('Verbinde mit MovieShelf...')
    const data = await apiGet('/admin/export')
    logInfo(`${data.count} Filme in der Cloud gefunden.`)

    logInfo('Synchronisiere Metadaten...')
    for (const movie of data.movies) {
      // Create/Update locally
      const localMovie = await window.electron.db.movies.create({
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

      if (!localMovie) continue

      // Update synced_at to prevent immediate re-push
      await window.electron.db.movies.sync.markSynced({
        id: localMovie.id,
        remote_id: movie.id,
        synced_at: new Date().toISOString()
      })

      // Link Actors
      if (movie.actors && Array.isArray(movie.actors)) {
        for (const actorData of movie.actors) {
          const localActorId = await window.electron.db.movies.actors.upsert({
            remote_id: actorData.id,
            name: actorData.name,
            bio: actorData.bio,
            birthday: actorData.birthday,
            place_of_birth: actorData.place_of_birth,
            tmdb_id: actorData.tmdb_id,
            image_path: actorData.image_url
          })

          await window.electron.db.movies.actors.link({
            film_id: localMovie.id,
            actor_id: localActorId,
            role: actorData.role,
            is_main_role: actorData.is_main_role
          })
        }
      }
    }

    logInfo('✓ Metadaten erfolgreich aktualisiert.')

    // Media Sync
    logInfo('Prüfe auf neue Medien (Bilder)...')
    let downloaded = 0
    const processedActors = new Set<number>()

    for (const movie of data.movies) {
      const coverUrl = resolveMediaUrl(movie.cover_url)
      if (coverUrl) {
        const res = await window.electron.db.movies.download(coverUrl, movie.id, 'cover')
        if (res.success) downloaded++
      }

      const backdropUrl = resolveMediaUrl(movie.backdrop_url)
      if (backdropUrl) {
        const res = await window.electron.db.movies.download(backdropUrl, movie.id, 'backdrop')
        if (res.success) downloaded++
      }

      if (movie.actors && Array.isArray(movie.actors)) {
        for (const actorData of movie.actors) {
          if (!processedActors.has(actorData.id) && actorData.image_url) {
            const actorImgUrl = resolveMediaUrl(actorData.image_url)
            if (actorImgUrl) {
              const res = await window.electron.db.movies.download(actorImgUrl, actorData.id, 'actor')
              if (res.success) downloaded++
            }
            processedActors.add(actorData.id)
          }
        }
      }
    }
    logInfo(`✓ Medien-Sync abgeschlossen. ${downloaded} Dateien verarbeitet.`)
  } catch (e: any) {
    logError(`Fehler: ${e.message}`)
    console.error(e)
  } finally {
    if (resetLog) syncing.value = false
  }
}
</script>
