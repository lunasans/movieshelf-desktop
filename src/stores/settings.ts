import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const mode        = ref<'standalone' | 'online'>('standalone')
  const theme       = ref<'light' | 'dark' | 'system'>('dark')
  const shelfUrl    = ref('')
  const token       = ref('')
  const tmdbApiKey  = ref('')

  const isOnline = computed(() => mode.value === 'online' && !!shelfUrl.value && !!token.value)
  const hasTmdb  = computed(() => !!tmdbApiKey.value)

  const appVersion      = ref('0.0.0')
  const newestVersion   = ref('')
  const updateAvailable = ref(false)
  const updateUrl       = ref('')
  const updateSha256    = ref('')

  async function load() {
    const all = await window.electron.settings.getAll()
    mode.value       = all.mode     === 'online' ? 'online' : 'standalone'
    theme.value      = all.theme    ?? 'dark'
    shelfUrl.value   = all.shelf_url  ?? ''
    token.value      = all.shelf_token ?? ''
    tmdbApiKey.value = all.tmdb_api_key ?? ''
    
    // Load app version from electron
    appVersion.value = await window.electron.getVersion()
  }

  async function save() {
    await window.electron.settings.set('mode',          mode.value)
    await window.electron.settings.set('theme',         theme.value)
    await window.electron.settings.set('shelf_url',     shelfUrl.value)
    await window.electron.settings.set('shelf_token',   token.value)
    await window.electron.settings.set('tmdb_api_key',  tmdbApiKey.value)
  }

  return { mode, theme, shelfUrl, token, tmdbApiKey, isOnline, hasTmdb, load, save, appVersion, newestVersion, updateAvailable, updateUrl, updateSha256 }
})
