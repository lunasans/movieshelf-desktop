import { ref } from 'vue'
import { t } from '@/i18n'
import { useApi } from '@/composables/useApi'
import { useSettingsStore } from '@/stores/settings'

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

// Werte sind i18n-Keys — beim Befüllen der Preview via t() aufgelöst.
const FIELD_LABELS: Record<string, string> = {
  title: 'sync.fields.title', year: 'sync.fields.year', genre: 'sync.fields.genre', director: 'sync.fields.director',
  runtime: 'sync.fields.runtime', rating: 'sync.fields.rating', rating_age: 'sync.fields.ratingAge',
  overview: 'sync.fields.overview', collection_type: 'sync.fields.collectionType', tag: 'sync.fields.tag',
  trailer_url: 'sync.fields.trailer',
}

export function useSyncEngine() {
  const { apiGet, apiPost, apiPut, apiDelete, resolveMediaUrl } = useApi()
  const settings = useSettingsStore()

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
        d.toLocaleDateString(settings.dateLocale, { day: '2-digit', month: '2-digit', year: '2-digit' }) +
        ' ' + d.toLocaleTimeString(settings.dateLocale, { hour: '2-digit', minute: '2-digit' })
    }
  }

  function setPhase(p: Phase, label: string, detail = '', pct = 0) {
    phase.value       = p
    phaseLabel.value  = label
    phaseDetail.value = detail
    progressPct.value = pct
  }

  /** Vergleicht lokale Staffeln/Episoden mit dem Server-Stand einer Serie (nur Zählung,
   *  kein Feldabgleich) - erkennt z.B. eine auf der Shelf entfernte Staffel als Änderung. */
  async function seasonsDiffer(localId: number, serverSeasons: any[]): Promise<boolean> {
    const local = await window.electron.db.seasons.forMovie(localId) as any[]
    const localSig = local
      .map(s => `${s.season_number}:${(s.episodes ?? []).length}`)
      .sort()
      .join(',')
    const serverSig = (serverSeasons ?? [])
      .map(s => `${s.season_number}:${(s.episodes ?? []).length}`)
      .sort()
      .join(',')
    return localSig !== serverSig
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
            if (String(movie[field] ?? null) !== String((local as any)[field] ?? null)) changed.push(t(label))
          }
          if (movie.collection_type === 'Serie' && await seasonsDiffer((local as any).id, movie.seasons)) {
            changed.push(t('sync.fields.seasons'))
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

  async function pull(full = false): Promise<{ pulled: number; skipped: number; deleted: number; media: number; pullErrors: number; exportedAt: string | null }> {
    setPhase('connecting', t('sync.phases.connecting'), '', 0)

    const since  = full ? null : await window.electron.settings.get('last_sync_at') as string | null
    const data   = await apiGet('/admin/export', since ? { since } : {})
    const movies = data.movies as any[]
    // Server-autoritativer Zeitstempel (kein Client-Clock-Skew) als nächstes `since`-Wasserzeichen.
    const exportedAt = (data.exported_at as string | undefined) ?? null
    let pulled = 0, skipped = 0, deleted = 0, pullErrors = 0
    const remoteToLocalId = new Map<number, number>()

    setPhase('metadata', data.is_delta ? t('sync.phases.delta') : t('sync.phases.metadata'), '', 0)
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
        // Lokal bearbeitete, noch nicht gepushte Filme dürfen durch den Pull nicht
        // als synchronisiert gestempelt werden – sonst fallen sie aus der Dirty-Liste
        // und der Push lädt sie nie hoch (stille Divergenz zum Server).
        const locallyDirty = !!existing && (existing.synced_at == null || existing.updated_at > existing.synced_at)

        const local = await window.electron.db.movies.create({
          title: movie.title, year: movie.year, genre: movie.genre, director: movie.director,
          runtime: movie.runtime, rating: movie.rating, rating_age: movie.rating_age,
          overview: movie.overview, collection_type: movie.collection_type ?? 'Film',
          tag: movie.tag, tmdb_id: movie.tmdb_id, remote_id: movie.id, collection_no: movie.collection_no ?? null,
          cover_path: movie.cover_url, backdrop_path: movie.backdrop_url,
          actors_names: movie.actors_names, trailer_url: movie.trailer_url,
          created_at: movie.created_at, updated_at: movie.updated_at,
          is_boxset: movie.is_boxset ? 1 : 0, boxset_parent_id: movie.boxset_parent_id ?? null,
          view_count: movie.view_count ?? 0, is_watched: movie.is_watched ? 1 : 0,
          in_collection: movie.in_collection != null ? (movie.in_collection ? 1 : 0) : 1,
        }) as { id: number } | null

        if (local) {
          remoteToLocalId.set(movie.id, local.id)
          if (!locallyDirty) {
            await window.electron.db.movies.sync.markSynced({ id: local.id, remote_id: movie.id, synced_at: new Date().toISOString() })
          }
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
            // Auf der Shelf entfernte Staffeln auch lokal entfernen (Shelf ist Master)
            await window.electron.db.seasons.pruneRemote(local.id, movie.seasons.map((s: any) => s.id))
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
    setPhase('media', t('sync.phases.media'), '', 50)
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
    return { pulled, skipped, deleted, media, pullErrors, exportedAt }
  }

  async function push(): Promise<{ pushed: number; pushErrors: number; deleted: number }> {
    setPhase('push', t('sync.phases.push'), '', 0)
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
            const payload: Record<string, unknown> = { tmdb_id: movie.tmdb_id, type: movie.collection_type === 'Serie' ? 'tv' : 'movie', in_collection: movie.in_collection ?? 1 }
            if (movie.collection_type === 'Serie') {
              // Ohne `seasons` importiert der Server alle bei TMDb bekannten Staffeln -
              // wir besitzen aber ggf. nur einen Teil davon. Nur die lokal vorhandenen
              // Staffelnummern mitschicken, damit Desktop und Shelf deckungsgleich bleiben.
              const localSeasons = await window.electron.db.seasons.forMovie(movie.id) as any[]
              payload.seasons = localSeasons.map(s => s.season_number)
            }
            res = await apiPost('/tmdb/import', payload)
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

  // ── Listen-Sync (richtungsbewusst, immer UNION → kein Datenverlust) ──────────
  //
  // Wichtig: Listen werden NIE überschrieben. Ein Pull fügt nur lokal hinzu, ein
  // Push vereinigt die lokale Mitgliedschaft mit dem aktuellen Server-Stand.
  // Dadurch kann ein „Shelf → Desktop"-Sync nicht mehr serverseitig hinzugefügte
  // Filme löschen (und umgekehrt). Listen-Löschungen werden bewusst NICHT
  // propagiert (Vermeidung von Datenverlust).

  /** Sammlungsfilm aus Server-Daten lokal anlegen (inkl. Cover) und als synchronisiert markieren. */
  async function createLocalFromServerMovie(m: any): Promise<{ id: number } | null> {
    const local = await window.electron.db.movies.create({
      title: m.title, year: m.year, genre: m.genre, director: m.director,
      runtime: m.runtime, rating: m.rating, rating_age: m.rating_age,
      overview: m.overview, collection_type: m.collection_type ?? 'Film',
      tag: m.tag, tmdb_id: m.tmdb_id, remote_id: m.id, collection_no: m.collection_no ?? null,
      cover_path: m.cover_url, backdrop_path: m.backdrop_url,
      actors_names: m.actors_names, trailer_url: m.trailer_url,
      created_at: m.created_at, updated_at: m.updated_at,
      is_boxset: m.is_boxset ? 1 : 0, boxset_parent_id: m.boxset_parent_id ?? null,
      view_count: m.view_count ?? 0, is_watched: m.is_watched ? 1 : 0,
      in_collection: 1,
    }) as { id: number } | null
    if (local?.id) {
      await window.electron.db.movies.sync.markSynced({ id: local.id, remote_id: m.id, synced_at: new Date().toISOString() })
      const coverUrl = resolveMediaUrl(m.cover_url)
      if (coverUrl && !(await window.electron.db.movies.exists(m.id, 'cover'))) {
        const r = await window.electron.db.movies.download(coverUrl, m.id, 'cover')
        if (r.success) await window.electron.db.movies.update(local.id, { cover_path: `movie-resource://${m.id}.jpg` })
      }
    }
    return local
  }

  /** Externen Film aus Server-Daten lokal anlegen (Cover bleibt als Server-URL). */
  async function createLocalExternal(e: any): Promise<{ id: number } | null> {
    return await window.electron.db.external.create({
      remote_id: e.id, title: e.title, year: e.year, genre: e.genre, director: e.director,
      runtime: e.runtime, rating: e.rating, rating_age: e.rating_age, overview: e.overview,
      collection_type: e.collection_type, cover_path: e.cover_url, backdrop_path: e.backdrop_url,
      trailer_url: e.trailer_url, tmdb_id: e.tmdb_id, synced_at: new Date().toISOString(),
      created_at: e.created_at, updated_at: e.updated_at,
    }) as { id: number } | null
  }

  /** Lokalen Sammlungsfilm (neu) auf dem Server anlegen, neue remote_id lokal übernehmen. */
  async function createMovieOnServer(m: any): Promise<number | null> {
    let res
    if (m.tmdb_id) {
      const payload: Record<string, unknown> = { tmdb_id: m.tmdb_id, type: m.collection_type === 'Serie' ? 'tv' : 'movie' }
      if (m.collection_type === 'Serie') {
        // Siehe push(): ohne `seasons` importiert der Server alle TMDb-Staffeln statt
        // nur der lokal vorhandenen.
        const localSeasons = await window.electron.db.seasons.forMovie(m.id) as any[]
        payload.seasons = localSeasons.map(s => s.season_number)
      }
      res = await apiPost('/tmdb/import', payload)
    } else {
      res = await apiPost('/admin/movies', { title: m.title, year: m.year, genre: m.genre, director: m.director, runtime: m.runtime, rating: m.rating, rating_age: m.rating_age, overview: m.overview, collection_type: m.collection_type, tag: m.tag, tmdb_id: m.tmdb_id, trailer_url: m.trailer_url, in_collection: 1 })
    }
    const newId = res?.data?.id ?? null
    if (newId) {
      await window.electron.db.movies.sync.markSynced({ id: m.id, remote_id: newId, synced_at: new Date().toISOString() })
      m.remote_id = newId
    }
    return newId
  }

  /** Lokalen externen Film (neu) auf dem Server anlegen, neue remote_id lokal übernehmen. */
  async function createExternalOnServer(e: any): Promise<number | null> {
    const payload = e.tmdb_id
      ? { tmdb_id: e.tmdb_id, type: e.collection_type === 'Serie' ? 'tv' : 'movie' }
      : { title: e.title, year: e.year, genre: e.genre, director: e.director, runtime: e.runtime, rating: e.rating, rating_age: e.rating_age, overview: e.overview, collection_type: e.collection_type, trailer_url: e.trailer_url }
    const res = await apiPost('/external-movies', payload)
    const newId = res?.data?.id ?? null
    if (newId) {
      await window.electron.db.external.markSynced({ id: e.id, remote_id: newId, synced_at: new Date().toISOString() })
      e.remote_id = newId
    }
    return newId
  }

  /** Server-Listen → lokal: holt fehlende Items (Sammlung + extern), verknüpft sie.
   *  Verändert den Server nicht und entfernt lokal nichts. */
  async function pullLists(): Promise<number> {
    setPhase('lists', t('sync.phases.listsPull'), '', 0)
    let listErrors = 0
    try {
      const localLists  = await window.electron.db.lists.syncState() as any[]
      const serverData  = await apiGet('/lists')
      const serverLists: Array<{ id: number; name: string }> = serverData.lists ?? []
      const localByRemote = new Map<number, number>(
        localLists.filter((l: any) => l.remote_id != null).map((l: any) => [l.remote_id as number, l.id as number])
      )
      // Lokal entfernte Items (Tombstones) dürfen beim Pull nicht wieder
      // hinzugefügt werden – die Entfernung wird erst vom Push propagiert.
      const tombstonesByListId = new Map<number, Set<string>>(
        localLists.map((l: any) => [
          l.id as number,
          new Set<string>((l.tombstones ?? []).map((t: any) => `${t.type}:${t.remote_id}`)),
        ])
      )

      for (const serverList of serverLists) {
        phaseDetail.value = serverList.name
        try {
          let localListId = localByRemote.get(serverList.id)
          if (localListId == null) {
            const created = await window.electron.db.lists.create(serverList.name)
            await window.electron.db.lists.setRemoteId(created.id, serverList.id)
            localListId = created.id
            localByRemote.set(serverList.id, created.id)
          }
          // GET /lists/{id} liefert gemischte Items (Sammlung + extern). Fehlende lokal anlegen.
          const detail = await apiGet(`/lists/${serverList.id}`) as { items?: any[] }
          const tombstoned = tombstonesByListId.get(localListId) ?? new Set<string>()
          for (const it of detail.items ?? []) {
            const itemKey = `${it.item_type === 'external' ? 'external' : 'movie'}:${it.id}`
            if (tombstoned.has(itemKey)) continue
            if (it.item_type === 'external') {
              let local = await window.electron.db.external.getByRemoteId(it.id) as { id: number } | null
              if (!local?.id) local = await createLocalExternal(it)
              if (local?.id) await window.electron.db.lists.addItem(localListId, 'external', local.id)
            } else {
              let local = await window.electron.db.movies.getByRemoteId(it.id) as { id: number } | null
              if (!local?.id) local = await createLocalFromServerMovie(it)
              if (local?.id) await window.electron.db.lists.addItem(localListId, 'movie', local.id)
            }
          }
        } catch (e: any) {
          errors.value.push(`List pull "${serverList.name}": ${e.message}`)
          listErrors++
        }
      }
    } catch (e: any) {
      errors.value.push(`Listen laden: ${e.message}`)
      listErrors++
    }
    return listErrors
  }

  /** Lokale Listen → Server: legt fehlende/verwaiste Items an und schreibt die
   *  Mitgliedschaft als UNION mit dem Server-Stand (kein Überschreiben). */
  async function pushLists(): Promise<number> {
    setPhase('lists', t('sync.phases.listsPush'), '', 0)
    let listErrors = 0
    try {
      const localLists = await window.electron.db.lists.syncState() as any[]

      for (const list of localLists) {
        phaseDetail.value = list.name
        try {
          const full = await window.electron.db.lists.get(list.id) as { items: any[] } | null
          const items = full?.items ?? []

          // Items ohne remote_id zuerst auf dem Server anlegen.
          for (const it of items) {
            if (it.remote_id == null) {
              try {
                if (it.item_type === 'external') await createExternalOnServer(it)
                else await createMovieOnServer(it)
              } catch (e: any) { errors.value.push(`„${it.title}" anlegen: ${e.message}`); listErrors++ }
            }
          }

          const localItems = () => items
            .filter((it: any) => it.remote_id != null)
            .map((it: any) => ({ type: it.item_type as 'movie' | 'external', id: it.remote_id as number }))

          // Liste anlegen, falls auf dem Server noch nicht vorhanden.
          let listRemoteId: number | null = list.remote_id
          if (!listRemoteId) {
            const res = await apiPost('/lists', { name: list.name, items: localItems() })
            // Beide Antwortformen abdecken ({id} und {data:{id}}) – sonst bleibt die
            // remote_id leer und jeder Push legt die Liste erneut auf dem Server an.
            listRemoteId = res?.id ?? res?.data?.id ?? null
            if (listRemoteId == null) throw new Error(`Server lieferte keine ID für Liste "${list.name}"`)
            await window.electron.db.lists.setRemoteId(list.id, listRemoteId as number)
          }

          if (listRemoteId != null) {
            // Aktuellen Server-Stand holen
            const serverList = await apiGet(`/lists/${listRemoteId}`) as { items?: Array<{ id: number; item_type: string }> }
            const serverItems = (serverList.items ?? []).map(i => ({ type: i.item_type as 'movie' | 'external', id: i.id }))
            const serverKeys = new Set(serverItems.map(i => `${i.type}:${i.id}`))

            // Verwaiste lokale Items (remote_id existiert serverseitig nicht mehr) neu anlegen.
            const orphans = items.filter((it: any) =>
              it.remote_id != null && !serverKeys.has(`${it.item_type}:${it.remote_id}`))
            for (const it of orphans) {
              try {
                if (it.item_type === 'external') await createExternalOnServer(it)
                else await createMovieOnServer(it)
              } catch (e: any) { errors.value.push(`„${it.title}" neu anlegen: ${e.message}`); listErrors++ }
            }

            // UNION aus lokalen (inkl. frisch angelegter) + Server-Items, abzüglich
            // lokal entfernter Items (Tombstones) → Entfernungen werden propagiert,
            // serverseitige Ergänzungen bleiben erhalten.
            const byKey = new Map<string, { type: 'movie' | 'external'; id: number }>()
            for (const i of [...localItems(), ...serverItems]) byKey.set(`${i.type}:${i.id}`, i)
            for (const t of (list.tombstones ?? []) as Array<{ type: string; remote_id: number }>) {
              byKey.delete(`${t.type}:${t.remote_id}`)
            }
            await apiPut(`/lists/${listRemoteId}`, { name: list.name, items: Array.from(byKey.values()) })
            await window.electron.db.lists.markSynced(list.id)
            // Entfernungen sind jetzt auf dem Server angekommen – Merker löschen.
            await window.electron.db.lists.clearTombstones(list.id)
          }
        } catch (e: any) {
          errors.value.push(`List push "${list.name}": ${e.message}`)
          listErrors++
        }
      }
    } catch (e: any) {
      errors.value.push(`Listen hochladen: ${e.message}`)
      listErrors++
    }
    return listErrors
  }

  async function saveSyncTime(serverTime: string | null) {
    // Wasserzeichen für den Delta-Sync (`since`) ausschließlich aus dem
    // Server-Zeitstempel `exported_at` setzen – nie aus der Client-Uhr
    // (verhindert stillen Datenverlust bei Uhrzeit-Differenz Client/Server).
    // Push-only liefert kein `exported_at` -> Wasserzeichen bleibt unverändert,
    // da kein Server-Stand frisch gepullt wurde.
    if (!serverTime) return
    await window.electron.settings.set('last_sync_at', serverTime)
  }

  async function runPull() {
    errors.value = []
    result.value = null
    const start = Date.now()
    try {
      const { pulled, skipped, deleted, media, pullErrors, exportedAt } = await pull()
      // „Shelf → Desktop": nur Listen LADEN (Server nicht überschreiben).
      const listErrors = await pullLists()
      result.value = { pulled, skipped, deleted, pushed: 0, media, errors: pullErrors + listErrors, duration: ((Date.now() - start) / 1000).toFixed(1) }
      await saveSyncTime(exportedAt)
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
      // „Desktop → Shelf": Listen hochladen (UNION mit Server-Stand, kein Überschreiben).
      const listErrors = await pushLists()
      result.value = { pulled: 0, skipped: 0, deleted, pushed, media: 0, errors: pushErrors + listErrors, duration: ((Date.now() - start) / 1000).toFixed(1) }
      // Push-only: kein frischer Server-Pull -> Wasserzeichen NICHT vorrücken.
      await saveSyncTime(null)
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

      // Voll-Sync: erst Listen laden (Server-Ergänzungen holen), dann hochladen (UNION).
      let listErrors = await pullLists()
      listErrors += await pushLists()
      totalErrors += listErrors

      result.value = { pulled, skipped, deleted, pushed, media, errors: totalErrors, duration: ((Date.now() - start) / 1000).toFixed(1) }
      await saveSyncTime(pr.exportedAt)
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

      // Voll-Sync: erst Listen laden (Server-Ergänzungen holen), dann hochladen (UNION).
      let listErrors = await pullLists()
      listErrors += await pushLists()
      totalErrors += listErrors

      result.value = { pulled, skipped, deleted, pushed, media, errors: totalErrors, duration: ((Date.now() - start) / 1000).toFixed(1) }
      await saveSyncTime(pr.exportedAt)
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
