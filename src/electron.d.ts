// ── Shared types ─────────────────────────────────────────────────────────────

type MediaType = 'cover' | 'backdrop' | 'actor'

type MovieListResult = { data: unknown[]; total: number; page: number; perPage: number }

type SyncState = Array<{
  id: number
  name: string
  remote_id: number | null
  synced_at: string | null
  updated_at: string
  items: Array<{ type: 'movie' | 'external'; remote_id: number }>
  tombstones: Array<{ type: 'movie' | 'external'; remote_id: number }>
}>

type SeasonWithEpisodes = {
  id: number
  remote_id: number | null
  movie_id: number
  season_number: number
  title: string | null
  overview: string | null
  episodes: Array<{
    id: number
    remote_id: number | null
    season_id: number
    episode_number: number
    title: string | null
    overview: string | null
  }>
}

type StatsResult = {
  totalMovies:   number
  totalRuntime:  number
  watchedMovies: number
  avgRating:     number
  genres:    { name: string; count: number }[]
  byYear:    { year: number; count: number }[]
  topActors: { name: string; remote_id: number | null; image_path: string | null; movie_count: number }[]
  byType:    { collection_type: string; count: number; films: { id: number; title: string; year: number | null }[] }[]
  byRuntime: { label: string; count: number }[]
}

// ── Window interface ──────────────────────────────────────────────────────────

interface Window {
  electron: {
    getIsDev:      () => Promise<boolean>
    getVersion:    () => Promise<string>
    getAutostart:  () => Promise<boolean>
    setAutostart:  (enabled: boolean) => Promise<boolean>

    window: {
      minimize: () => void
      maximize: () => void
      close:    () => void
    }

    db: {
      movies: {
        list:            (params?: {
          page?: number; perPage?: number; q?: string; collectionType?: string; excludeType?: string
          sortBy?: 'title' | 'year' | 'runtime' | 'rating' | 'created_at'
          sortDir?: 'ASC' | 'DESC'
          genres?: string[]
        }) => Promise<MovieListResult>
        recent:          (limit?: number) => Promise<unknown[]>
        get:             (id: number) => Promise<unknown>
        getByRemoteId:   (id: number) => Promise<Record<string, unknown> | null>
        create:          (data: Record<string, unknown>) => Promise<unknown>
        update:          (id: number, data: Record<string, unknown>) => Promise<unknown>
        delete:          (id: number) => Promise<{ success: boolean }>
        download:        (url: string, id: number, type: MediaType) => Promise<{ success: boolean; path?: string; error?: string }>
        exists:          (id: number, type: MediaType) => Promise<boolean>
        upload:          (data: ArrayBuffer, id: number, type: 'cover' | 'backdrop') => Promise<{ success: boolean; error?: string }>
        count:           () => Promise<number>
        children:        (id: number) => Promise<unknown[]>
        checkTmdbIds:    (ids: number[]) => Promise<number[]>
        deleteByRemoteId:(remoteId: number) => Promise<{ success: boolean; localId?: number }>
        clear:           () => Promise<{ success: boolean }>
        allRemoteIds:    () => Promise<{ id: number; remote_id: number }[]>
        random:          (filters?: { collectionType?: string; genre?: string }) => Promise<unknown>
        toggleWatched:   (id: number) => Promise<{ is_watched: boolean }>
        bulkDelete:      (ids: number[]) => Promise<{ deleted: number }>
        bulkTag:         (ids: number[], tag: string) => Promise<{ updated: number }>
        import:          (rows: Array<{ title: string; year?: number; rating?: number; tag?: string; is_watched?: boolean }>) => Promise<{ imported: number; skipped: number }>
        actors: {
          getForMovie: (movieId: number) => Promise<unknown[]>
          upsert:      (data: Record<string, unknown>) => Promise<number>
          link:        (params: { film_id: number; actor_id: number; role?: string; is_main_role?: boolean }) => Promise<unknown>
          get:         (id: number) => Promise<unknown>
          movies:      (actorId: number) => Promise<unknown[]>
          search:      (query: string) => Promise<unknown[]>
          unlink:      (filmId: number, actorId: number) => Promise<void>
        }
        sync: {
          dirty:      () => Promise<unknown[]>
          markSynced: (p: { id: number; remote_id: number; synced_at: string }) => Promise<unknown>
          hardDelete: (id: number) => Promise<unknown>
        }
      }
      seasons: {
        forMovie: (movieId: number) => Promise<SeasonWithEpisodes[]>
        upsert:   (data: Record<string, unknown>) => Promise<number | undefined>
        remove:   (movieId: number, seasonNumbers: number[]) => Promise<number>
        pruneRemote: (movieId: number, keepRemoteIds: number[]) => Promise<number>
      }
      episodes: {
        upsert: (data: Record<string, unknown>) => Promise<void>
      }
      lists: {
        list:            () => Promise<unknown[]>
        get:             (id: number) => Promise<unknown>
        create:          (name: string) => Promise<{ id: number; name: string; remote_id: number | null }>
        update:          (id: number, name: string) => Promise<unknown>
        delete:          (id: number) => Promise<{ success: boolean }>
        addItem:         (listId: number, itemType: 'movie' | 'external', itemId: number) => Promise<{ success: boolean }>
        removeItem:      (listId: number, itemType: 'movie' | 'external', itemId: number) => Promise<{ success: boolean }>
        forItem:         (itemType: 'movie' | 'external', itemId: number) => Promise<number[]>
        syncState:       () => Promise<SyncState>
        setRemoteId:     (id: number, remoteId: number) => Promise<{ success: boolean }>
        markSynced:      (id: number) => Promise<{ success: boolean }>
        clearTombstones: (id: number) => Promise<{ success: boolean }>
        deleteByRemoteId:(remoteId: number) => Promise<{ success: boolean }>
      }
      external: {
        getByRemoteId: (remoteId: number) => Promise<Record<string, unknown> | null>
        getByTmdbId:   (tmdbId: number) => Promise<Record<string, unknown> | null>
        get:           (id: number) => Promise<Record<string, unknown> | null>
        create:        (data: Record<string, unknown>) => Promise<{ id: number } & Record<string, unknown>>
        update:        (id: number, data: Record<string, unknown>) => Promise<{ success: boolean }>
        markSynced:    (params: { id: number; remote_id: number; synced_at: string }) => Promise<{ success: boolean }>
        delete:        (id: number) => Promise<{ success: boolean }>
      }
    }

    trailer?: {
      open: (url: string) => Promise<void>
    }

    stats: {
      openWindow: () => Promise<void>
      get:        () => Promise<StatsResult>
    }

    oauth: {
      openBrowser: (url: string) => Promise<void>
      onCallback:  (callback: (payload: { code: string; state: string }) => void) => void
    }

    onNavigate: (callback: (path: string) => void) => void

    update: {
      check:      () => Promise<unknown>
      download:   () => Promise<void>
      install:    () => Promise<void>
      onProgress: (callback: (percent: number) => void) => void
      onReady:    (callback: () => void) => void
      onError:    (callback: (message: string) => void) => void
    }

    settings: {
      get:    (key: string) => Promise<string | null>
      set:    (key: string, value: unknown) => Promise<boolean>
      getAll: () => Promise<Record<string, string>>
    }

    backup: {
      create:  () => Promise<{ success: boolean; canceled?: boolean; path?: string; movies?: number; error?: string }>
      restore: () => Promise<{ success: boolean; canceled?: boolean; movies?: number; actors?: number; error?: string }>
    }

    logs: {
      get:        () => Promise<string>
      clear:      () => Promise<boolean>
      openFolder: () => Promise<void>
    }
  }
}
