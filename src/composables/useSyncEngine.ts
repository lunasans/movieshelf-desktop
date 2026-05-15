import { ref } from 'vue'
import { useApi } from '@/composables/useApi'

export type Phase = 'idle' | 'connecting' | 'metadata' | 'media' | 'push' | 'lists'

export type PreviewItem = {
  remoteId: number | null
  title: string
  year: number | null
  action: 'new' | 'updated' | 'deleted'
  direction: 'pull' | 'push'
  changes: string[]
}

export type PreviewData = {
  items: PreviewItem[]
  new: number
  updated: number
  deleted: number
  pushNew: number
  pushUpdated: number
  pushDeleted: number
  overflow: number
  rawMovies: any[]
}

export type SyncResult = {
  pulled: number
  skipped: number
  deleted: number
  pushed: number
  media: number
  errors: number
  duration: string
}

const PREVIEW_LIMIT = 100

const FIELD_LABELS: Record<string, string> = {
  title: 'Titel', year: 'Jahr', genre: 'Genre', director: 'Regisseur',
  runtime: 'Laufzeit', rating: 'Bewertung', rating_age: 'FSK',
  overview: 'Beschreibung', collection_type: 'Typ', tag: 'Format',
  trailer_url: 'Trailer',
}

export function useSyncEngine() {
  const { apiGet, apiPost, apiPut, apiDelete, resolveMediaUrl } = useApi()

  const phase        = ref<Phase>('idle')
  const phaseLabel   = ref('')
  const phaseDetail  = ref('')
  const progressPct  = ref(0)

  const localCount    = ref(0)
  const dirtyCount    = ref(0)
  const lastSyncLabel = ref('–')

  const errors         = ref<string[]>([])
  const previewLoading = ref(false)
  const preview        = ref<PreviewData | null>(null)
  const result         = ref<SyncResult | null>(null)

  async function loadStats() {
    localCount.value = await window.electron.db.movies.count()
    const dirty = await window.electron.db.movies.sync.dirty() as any[]
    dirtyCount.value = dirty.length
    const ts = await window.electron.settings.get('last_sync_at') as string | null
    if (ts) {
      const d = new Date(ts)
      lastSyncLabel.value =
        d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
        ' ' + d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })
    }
  }

  function setPhase(p: Phase, label: string, detail = '', pct = 0) {
    phase.value       = p
    phaseLabel.value  = label
    phaseDetail.value = detail
    progressPct.value = pct
  }

  async function loadPreview() {
    previewLoading.value = true
    preview.value = null
    result.value  = null

    try {
      const since = await window.electron.settings.get('last_sync_at') as string | null
      const data   = await apiGet('/admin/export', since ? { since } : {})
      const movies = data.movies as any[]

      const items: PreviewItem[] = []
      let newCount = 0, updatedCount = 0, deletedCount = 0

      if (!since) {
        const exportedIds = new Set(movies.map((m: any) => m.id))
        const localMapped = await window.electron.db.movies.allRemoteIds()
        for (const row of localMapped) {
          if (!exportedIds.has(row.remote_id)) {
            deletedCount++
            const local = await window.electron.db.movies.getByRemoteId(row.remote_id) as any
            if (items.length < PREVIEW_LIMIT)
              items.push({ remoteId: row.remote_id, title: local?.title ?? `ID ${row.remote_id}`, year: local?.year ?? null, action: 'deleted', direction: 'pull', changes: [] })
          }
        }
      }

      for (const movie of movies) {
        if (movie.is_deleted) {
          deletedCount++
          if (items.length < PREVIEW_LIMIT)
            items.push({ remoteId: movie.id, title: movie.title, year: movie.year, action: 'deleted', direction: 'pull', changes: [] })
          continue
        }
        const local = await window.electron.db.movies.getByRemoteId(movie.id)
        if (!local) {
          newCount++
          if (items.length < PREVIEW_LIMIT)
            items.push({ remoteId: movie.id, title: movie.title, year: movie.year, action: 'new', direction: 'pull', changes: [] })
        } else {
          const changed: string[] = []
          for (const [field, label] of Object.entries(FIELD_LABELS)) {
            if (String(movie[field] ?? null) !== String((local as any)[field] ?? null)) changed.push(label)
          }
          if (changed.length > 0) {
            updatedCount++
            if (items.length < PREVIEW_LIMIT)
              items.push({ remoteId: movie.id, title: movie.title, year: movie.year, action: 'updated', direction: 'pull', changes: changed })
          }
        }
      }

      // Push-side: locally dirty records
      const dirty = await window.electron.db.movies.sync.dirty() as any[]
      let pushNew = 0, pushUpdated = 0, pushDeleted = 0
      for (const m of dirty) {
        if (m.is_deleted) {
          if (m.remote_id) {
            pushDeleted++
            if (items.length < PREVIEW_LIMIT)
              items.push({ remoteId: m.remote_id, title: m.title, year: m.year, action: 'deleted', direction: 'push', changes: [] })
          }
        } else if (!m.remote_id) {
          pushNew++
          if (items.length < PREVIEW_LIMIT)
            items.push({ remoteId: null, title: m.title, year: m.year, action: 'new', direction: 'push', changes: [] })
        } else {
          pushUpdated++
          if (items.length < PREVIEW_LIMIT)
            items.push({ remoteId: m.remote_id, title: m.title, year: m.year, action: 'updated', direction: 'push', changes: [] })
        }
      }

      const total = newCount + updatedCount + deletedCount + pushNew + pushUpdated + pushDeleted
      preview.value = { items, new: newCount, updated: updatedCount, deleted: deletedCount, pushNew, pushUpdated, pushDeleted, overflow: Math.max(0, total - items.length), rawMovies: movies }
    } catch (e: any) {
      errors.value = [e.message]
    } finally {
      previewLoading.value = false
    }
  }

  async function applyPull() {
    if (!preview.value) return
    preview.value = null
    await runPull()
  }

  async function pull(full = false): Promise<{ pulled: number; skipped: number; deleted: number; media: number; pullErrors: number }> {
    setPhase('connecting', 'Verbinde mit Shelf…', '', 0)

    const since  = full ? null : await window.electron.settings.get('last_sync_at') as string | null
    const data   = await apiGet('/admin/export', since ? { since } : {})
    const movies = data.movies as any[]
    let pulled = 0, skipped = 0, deleted = 0, pullErrors = 0
    const remoteToLocalId = new Map<number, number>()

    setPhase('metadata', data.is_delta ? 'Delta laden' : 'Metadaten laden', '', 0)
    const exportedRemoteIds = full ? new Set(movies.map((m: any) => m.id)) : null

    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i]
      phaseDetail.value = movie.title
      progressPct.value = Math.round((i / movies.length) * 50)

      try {
        if (movie.is_deleted) {
          const r = await window.electron.db.movies.deleteByRemoteId(movie.id)
          if (r.success && r.localId != null) { await window.electron.db.movies.sync.hardDelete(r.localId); deleted++ }
          continue
        }

        const existing = await window.electron.db.movies.getByRemoteId(movie.id) as any
        const needsUpdate = !existing || (existing.updated_at ?? '') < (movie.updated_at ?? '')

        const local = await window.electron.db.movies.create({
          title: movie.title, year: movie.year, genre: movie.genre, director: movie.director,
          runtime: movie.runtime, rating: movie.rating, rating_age: movie.rating_age,
          overview: movie.overview, collection_type: movie.collection_type ?? 'Film',
          tag: movie.tag, tmdb_id: movie.tmdb_id, remote_id: movie.id,
          cover_path: movie.cover_url, backdrop_path: movie.backdrop_url,
          actors_names: movie.actors_names, trailer_url: movie.trailer_url,
          created_at: movie.created_at, updated_at: movie.updated_at,
          is_boxset: movie.is_boxset ? 1 : 0, boxset_parent_id: movie.boxset_parent_id ?? null,
          view_count: movie.view_count ?? 0, is_watched: movie.is_watched ? 1 : 0,
          in_collection: movie.in_collection != null ? (movie.in_collection ? 1 : 0) : 1,
        }) as { id: number } | null

        if (local) {
          remoteToLocalId.set(movie.id, local.id)
          await window.electron.db.movies.sync.markSynced({ id: local.id, remote_id: movie.id, synced_at: new Date().toISOString() })
          if (Array.isArray(movie.actors)) {
            for (const a of movie.actors) {
              const aid = await window.electron.db.movies.actors.upsert({ remote_id: a.id, name: a.name, bio: a.bio, birthday: a.birthday, place_of_birth: a.place_of_birth, tmdb_id: a.tmdb_id, image_path: a.image_url })
              await window.electron.db.movies.actors.link({ film_id: local.id, actor_id: aid, role: a.role, is_main_role: a.is_main_role })
            }
          }
          if (movie.collection_type === 'Serie' && Array.isArray(movie.seasons)) {
            for (const season of movie.seasons) {
              const localSeasonId = await window.electron.db.seasons.upsert({ remote_id: season.id, movie_id: local.id, season_number: season.season_number, title: season.title, overview: season.overview })
              if (localSeasonId && Array.isArray(season.episodes)) {
                for (const ep of season.episodes) {
                  await window.electron.db.episodes.upsert({ remote_id: ep.id, season_id: localSeasonId, episode_number: ep.episode_number, title: ep.title, overview: ep.overview })
                }
              }
            }
          }
          if (needsUpdate) pulled++
          else skipped++
        }
      } catch (e: any) {
        errors.value.push(`Pull ${movie.title}: ${e.message}`)
        pullErrors++
      }
    }

    if (exportedRemoteIds) {
      try {
        const localMapped = await window.electron.db.movies.allRemoteIds()
        for (const row of localMapped) {
          if (!exportedRemoteIds.has(row.remote_id)) {
            const r = await window.electron.db.movies.deleteByRemoteId(row.remote_id)
            if (r.success && r.localId != null) { await window.electron.db.movies.sync.hardDelete(r.localId); deleted++ }
          }
        }
      } catch { /* ignorieren */ }
    }

    let media = 0
    setPhase('media', 'Bilder herunterladen', '', 50)
    const processedActors = new Set<number>()
    let mediaTotal = 0
    for (const movie of movies) {
      if (movie.cover_url)    mediaTotal++
      if (movie.backdrop_url) mediaTotal++
      if (movie.actors) for (const a of movie.actors) if (!processedActors.has(a.id) && a.image_url) { mediaTotal++; processedActors.add(a.id) }
    }
    processedActors.clear()

    let mediaDone = 0
    for (const movie of movies) {
      phaseDetail.value = movie.title
      const localId = remoteToLocalId.get(movie.id)

      const coverUrl = resolveMediaUrl(movie.cover_url)
      if (coverUrl) {
        let available = await window.electron.db.movies.exists(movie.id, 'cover')
        if (!available) { const r = await window.electron.db.movies.download(coverUrl, movie.id, 'cover'); if (r.success) { media++; available = true } }
        if (available && localId) await window.electron.db.movies.update(localId, { cover_path: `movie-resource://${movie.id}.jpg` })
      }
      mediaDone++; progressPct.value = 50 + Math.round((mediaDone / Math.max(mediaTotal, 1)) * 50)

      const backdropUrl = resolveMediaUrl(movie.backdrop_url)
      if (backdropUrl) {
        let available = await window.electron.db.movies.exists(movie.id, 'backdrop')
        if (!available) { const r = await window.electron.db.movies.download(backdropUrl, movie.id, 'backdrop'); if (r.success) { media++; available = true } }
        if (available && localId) await window.electron.db.movies.update(localId, { backdrop_path: `movie-resource://${movie.id}_backdrop.jpg` })
      }
      mediaDone++; progressPct.value = 50 + Math.round((mediaDone / Math.max(mediaTotal, 1)) * 50)

      if (Array.isArray(movie.actors)) {
        for (const a of movie.actors) {
          if (!processedActors.has(a.id) && a.image_url) {
            if (!await window.electron.db.movies.exists(a.id, 'actor')) {
              const url = resolveMediaUrl(a.image_url)
              if (url) {
                const r = await window.electron.db.movies.download(url, a.id, 'actor')
                if (r.success) {
                  media++
                  await window.electron.db.movies.actors.upsert({ remote_id: a.id, name: a.name, image_path: `movie-resource://actor_${a.id}.jpg` })
                }
              }
            }
            mediaDone++; progressPct.value = 50 + Math.round((mediaDone / Math.max(mediaTotal, 1)) * 50)
            processedActors.add(a.id)
          }
        }
      }
    }

    progressPct.value = 100
    return { pulled, skipped, deleted, media, pullErrors }
  }

  async function push(): Promise<{ pushed: number; pushErrors: number; deleted: number }> {
    setPhase('push', 'Änderungen hochladen', '', 0)
    const dirty = await window.electron.db.movies.sync.dirty() as any[]
    let pushed = 0, pushErrors = 0, deleted = 0

    for (let i = 0; i < dirty.length; i++) {
      const movie = dirty[i]
      phaseDetail.value = movie.title
      progressPct.value = Math.round((i / Math.max(dirty.length, 1)) * 100)

      try {
        if (movie.is_deleted) {
          if (movie.remote_id) {
            try { await apiDelete(`/admin/movies/${movie.remote_id}`) } catch (e: any) {
              if (!e?.response || e.response.status !== 404) throw e
            }
          }
          await window.electron.db.movies.sync.hardDelete(movie.id)
          deleted++
        } else if (!movie.remote_id) {
          let res
          if (movie.tmdb_id) {
            res = await apiPost('/tmdb/import', { tmdb_id: movie.tmdb_id, type: movie.collection_type === 'Serie' ? 'tv' : 'movie', in_collection: movie.in_collection ?? 1 })
          } else {
            res = await apiPost('/admin/movies', { title: movie.title, year: movie.year, genre: movie.genre, director: movie.director, runtime: movie.runtime, rating: movie.rating, rating_age: movie.rating_age, overview: movie.overview, collection_type: movie.collection_type, tag: movie.tag, tmdb_id: movie.tmdb_id, trailer_url: movie.trailer_url, in_collection: movie.in_collection ?? 1 })
          }
          await window.electron.db.movies.sync.markSynced({ id: movie.id, remote_id: res.data.id, synced_at: new Date().toISOString() })
          pushed++
        } else {
          await apiPut(`/admin/movies/${movie.remote_id}`, { title: movie.title, year: movie.year, genre: movie.genre, director: movie.director, runtime: movie.runtime, rating: movie.rating, rating_age: movie.rating_age, overview: movie.overview, collection_type: movie.collection_type, tag: movie.tag, tmdb_id: movie.tmdb_id, trailer_url: movie.trailer_url, in_collection: movie.in_collection ?? 1 })
          await window.electron.db.movies.sync.markSynced({ id: movie.id, remote_id: movie.remote_id, synced_at: new Date().toISOString() })
          pushed++
        }
      } catch (e: any) {
        errors.value.push(`Push ${movie.title}: ${e.message}`)
        pushErrors++
      }
    }

    progressPct.value = 100
    return { pushed, pushErrors, deleted }
  }

  async function syncLists(): Promise<{ listsSynced: number; listErrors: number }> {
    setPhase('lists', 'Listen synchronisieren', '', 0)
    let listsSynced = 0, listErrors = 0

    try {
      const localLists  = await window.electron.db.lists.syncState()
      const serverData  = await apiGet('/lists')
      const serverLists: Array<{ id: number; name: string; movie_remote_ids: number[] }> = serverData.lists ?? []

      const preKnownRemoteIds = new Set(localLists.map((l: any) => l.remote_id).filter(Boolean))
      const pushedRemoteIds   = new Set<number>()

      for (const list of localLists) {
        phaseDetail.value = list.name
        try {
          if (!list.remote_id) {
            const res = await apiPost('/lists', { name: list.name, movie_remote_ids: list.movie_remote_ids })
            await window.electron.db.lists.setRemoteId(list.id, res.id)
            pushedRemoteIds.add(res.id)
          } else {
            await apiPut(`/lists/${list.remote_id}`, { name: list.name, movie_remote_ids: list.movie_remote_ids })
            await window.electron.db.lists.markSynced(list.id)
            pushedRemoteIds.add(list.remote_id)
          }
          listsSynced++
        } catch (e: any) {
          errors.value.push(`List push "${list.name}": ${e.message}`)
          listErrors++
        }
      }

      for (const serverList of serverLists) {
        if (!preKnownRemoteIds.has(serverList.id)) {
          try {
            const created = await window.electron.db.lists.create(serverList.name)
            await window.electron.db.lists.setRemoteId(created.id, serverList.id)
            for (const remoteId of serverList.movie_remote_ids) {
              const movie = await window.electron.db.movies.getByRemoteId(remoteId) as any
              if (movie?.id) await window.electron.db.lists.addMovie(created.id, movie.id)
            }
            listsSynced++
          } catch (e: any) {
            errors.value.push(`List pull "${serverList.name}": ${e.message}`)
            listErrors++
          }
        }
      }

      for (const serverList of serverLists) {
        if (preKnownRemoteIds.has(serverList.id) && !pushedRemoteIds.has(serverList.id)) {
          try { await apiDelete(`/lists/${serverList.id}`) } catch { listErrors++ }
        }
      }
    } catch (e: any) {
      errors.value.push(`Listen-Sync: ${e.message}`)
      listErrors++
    }

    return { listsSynced, listErrors }
  }

  async function saveSyncTime() {
    await window.electron.settings.set('last_sync_at', new Date().toISOString())
  }

  async function runPull() {
    errors.value = []
    result.value = null
    const start = Date.now()
    try {
      const { pulled, skipped, deleted, media, pullErrors } = await pull()
      const { listErrors } = await syncLists()
      result.value = { pulled, skipped, deleted, pushed: 0, media, errors: pullErrors + listErrors, duration: ((Date.now() - start) / 1000).toFixed(1) }
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
      const { pushed, pushErrors, deleted } = await push()
      const { listErrors } = await syncLists()
      result.value = { pulled: 0, skipped: 0, deleted, pushed, media: 0, errors: pushErrors + listErrors, duration: ((Date.now() - start) / 1000).toFixed(1) }
      await saveSyncTime()
    } catch (e: any) {
      errors.value.push(e.message)
    } finally {
      phase.value = 'idle'
      await loadStats()
    }
  }

  async function runPreviewSync() {
    errors.value = []
    result.value = null
    preview.value = null
    const start = Date.now()
    let pulled = 0, skipped = 0, deleted = 0, pushed = 0, media = 0, totalErrors = 0

    try {
      const pr = await pull(false)
      pulled = pr.pulled; skipped = pr.skipped; deleted = pr.deleted; media = pr.media; totalErrors += pr.pullErrors

      const sr = await push()
      pushed = sr.pushed; deleted += sr.deleted; totalErrors += sr.pushErrors

      const { listErrors } = await syncLists()
      totalErrors += listErrors

      result.value = { pulled, skipped, deleted, pushed, media, errors: totalErrors, duration: ((Date.now() - start) / 1000).toFixed(1) }
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
    preview.value = null
    const start = Date.now()
    let pulled = 0, skipped = 0, deleted = 0, pushed = 0, media = 0, totalErrors = 0

    try {
      const pr = await pull(true)
      pulled = pr.pulled; skipped = pr.skipped; deleted = pr.deleted; media = pr.media; totalErrors += pr.pullErrors

      const sr = await push()
      pushed = sr.pushed; deleted += sr.deleted; totalErrors += sr.pushErrors

      const { listErrors } = await syncLists()
      totalErrors += listErrors

      result.value = { pulled, skipped, deleted, pushed, media, errors: totalErrors, duration: ((Date.now() - start) / 1000).toFixed(1) }
      await saveSyncTime()
    } catch (e: any) {
      errors.value.push(e.message)
    } finally {
      phase.value = 'idle'
      await loadStats()
    }
  }

  return {
    phase, phaseLabel, phaseDetail, progressPct,
    localCount, dirtyCount, lastSyncLabel,
    errors, previewLoading, preview, result,
    loadStats, loadPreview, applyPull, runPull, runPush, runPreviewSync, runFullSync,
  }
}
