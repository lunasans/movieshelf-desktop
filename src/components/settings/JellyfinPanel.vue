<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <img src="/jellyfin.svg" alt="" class="h-7 w-7 flex-shrink-0" />
      <p class="text-xs text-[var(--text-muted)]">{{ $t('jellyfin.subtitle') }}</p>
    </div>

    <!-- ── Verbindung ── -->
    <section v-if="!status.connected" class="space-y-4">
      <label class="block">
        <span class="block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">{{ $t('jellyfin.serverUrl') }}</span>
        <input v-model="form.url" type="url" placeholder="http://192.168.1.10:8096"
          class="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--status-red)]" />
      </label>
      <label class="block">
        <span class="block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">{{ $t('jellyfin.username') }}</span>
        <input v-model="form.username" type="text"
          class="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--status-red)]" />
      </label>
      <label class="block">
        <span class="block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">{{ $t('jellyfin.password') }}</span>
        <input v-model="form.password" type="password" placeholder="••••••••" @keyup.enter="doLogin"
          class="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--status-red)]" />
      </label>

      <button @click="doLogin" :disabled="loginLoading || !form.url || !form.username"
        class="w-full bg-[var(--status-red)] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
        <i class="bi bi-box-arrow-in-right"></i>
        {{ loginLoading ? $t('jellyfin.connecting') : $t('jellyfin.connect') }}
      </button>
      <p v-if="error" class="text-[var(--status-red)] text-xs text-center font-bold">{{ error }}</p>
    </section>

    <!-- ── Verbunden: Bibliotheken + Import ── -->
    <section v-else class="space-y-6">
      <div class="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl px-4 py-3">
        <div class="text-sm">
          <span class="inline-flex h-2 w-2 rounded-full bg-[var(--status-green)] mr-2"></span>
          <span class="font-bold">{{ status.user }}</span>
          <span class="text-[var(--text-muted)]"> · {{ status.url }}</span>
        </div>
        <button @click="doLogout" class="text-xs text-[var(--text-muted)] hover:text-[var(--status-red)] font-bold">
          {{ $t('jellyfin.disconnect') }}
        </button>
      </div>

      <div>
        <h2 class="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">{{ $t('jellyfin.libraries') }}</h2>
        <p v-if="!libraries.length" class="text-xs text-[var(--text-muted)]">{{ $t('jellyfin.noLibraries') }}</p>
        <div v-else class="space-y-2">
          <label v-for="lib in libraries" :key="lib.id"
            class="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl px-4 py-3 cursor-pointer">
            <input type="checkbox" :value="lib.id" v-model="selected" :disabled="running" class="accent-[var(--status-red)]" />
            <i :class="`bi bi-${lib.type === 'tvshows' ? 'tv' : 'film'} text-[var(--text-muted)]`"></i>
            <span class="text-sm font-medium">{{ lib.name }}</span>
          </label>
        </div>
      </div>

      <label class="flex items-start gap-3 bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl px-4 py-3"
        :class="settings.hasTmdb ? 'cursor-pointer' : 'opacity-50'">
        <input type="checkbox" v-model="verifyWithTmdb" :disabled="running || !settings.hasTmdb"
          class="mt-0.5 accent-[var(--status-red)]" />
        <span>
          <span class="block text-sm font-medium">{{ $t('jellyfin.verifyLabel') }}</span>
          <span class="block text-xs text-[var(--text-muted)]">
            {{ settings.hasTmdb ? $t('jellyfin.verifyHint') : $t('jellyfin.verifyNoKey') }}
          </span>
        </span>
      </label>

      <button @click="startImport" :disabled="running || !selected.length"
        class="w-full bg-[var(--status-red)] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
        <i class="bi bi-download"></i>
        {{ running ? $t('jellyfin.importing') : $t('jellyfin.startImport') }}
      </button>

      <!-- Fortschritt -->
      <div v-if="running || progress" class="space-y-2">
        <div class="h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
          <div class="h-full bg-[var(--status-red)] transition-all" :style="{ width: `${percent}%` }"></div>
        </div>
        <p class="text-xs text-[var(--text-muted)] truncate">
          <template v-if="progress?.phase === 'libraries'">{{ $t('jellyfin.readingLibraries') }}</template>
          <template v-else-if="progress">{{ progress.current }} / {{ progress.total }} · {{ progress.title }}</template>
        </p>
      </div>

      <!-- Ergebnis -->
      <div v-if="result" class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl p-4 space-y-2">
        <p v-if="result.error" class="text-[var(--status-red)] text-sm font-bold">{{ result.error }}</p>
        <template v-else>
          <p class="text-sm font-bold">{{ $t('jellyfin.resultTitle') }}</p>
          <ul class="text-sm text-[var(--text-muted)] space-y-1">
            <li>{{ $t('jellyfin.resultImported', { count: result.imported }) }}</li>
            <li>{{ $t('jellyfin.resultSkipped', { count: result.skipped }) }}</li>
            <li v-if="result.failed">{{ $t('jellyfin.resultFailed', { count: result.failed }) }}</li>
          </ul>
          <ul v-if="result.errors.length" class="text-xs text-[var(--status-red)] space-y-0.5 pt-2">
            <li v-for="(e, i) in result.errors.slice(0, 10)" :key="i">{{ e }}</li>
          </ul>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMovieStore } from '@/stores/movies'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const movies = useMovieStore()
const settings = useSettingsStore()

type Library = { id: string; name: string; type: string }
type Result = { success: boolean; error?: string; imported: number; skipped: number; failed: number; errors: string[] }

const status  = ref({ url: '', user: '', connected: false, lastImportAt: null as string | null })
const form    = ref({ url: '', username: '', password: '' })
const libraries = ref<Library[]>([])
const selected  = ref<string[]>([])
const progress  = ref<JellyfinProgress | null>(null)
const result    = ref<Result | null>(null)
const running   = ref(false)
const verifyWithTmdb = ref(true)
const loginLoading = ref(false)
const error     = ref('')

const percent = computed(() => {
  const p = progress.value
  if (!p || !p.total) return 0
  return Math.round((p.current / p.total) * 100)
})

async function refresh() {
  status.value = await window.electron.jellyfin.status()
  form.value.url = form.value.url || status.value.url
  form.value.username = form.value.username || status.value.user
  if (status.value.connected) await loadLibraries()
}

async function loadLibraries() {
  const res = await window.electron.jellyfin.libraries()
  libraries.value = res.libraries
  // Ohne vorherige Auswahl alle Bibliotheken vormerken – der Import ist als
  // Ein-Klick-Vollimport gedacht.
  if (!selected.value.length) selected.value = res.libraries.map(l => l.id)
  if (!res.success) error.value = res.error ?? ''
}

async function doLogin() {
  error.value = ''
  loginLoading.value = true
  try {
    const res = await window.electron.jellyfin.login({ ...form.value })
    if (!res.success) { error.value = res.error ?? t('jellyfin.loginFailed'); return }
    form.value.password = ''
    await refresh()
  } finally {
    loginLoading.value = false
  }
}

async function doLogout() {
  await window.electron.jellyfin.logout()
  libraries.value = []
  selected.value = []
  result.value = null
  progress.value = null
  await refresh()
}

async function startImport() {
  running.value = true
  result.value = null
  progress.value = null
  try {
    result.value = await window.electron.jellyfin.import(selected.value, {
      verifyWithTmdb: verifyWithTmdb.value && settings.hasTmdb,
    })
    // Der Store hält je Tab gecachte Seiten – die zeigen sonst den Stand vor dem Import.
    movies.clearCache()
  } finally {
    running.value = false
  }
}

onMounted(() => {
  window.electron.jellyfin.onProgress((p) => { progress.value = p })
  refresh()
})
</script>
