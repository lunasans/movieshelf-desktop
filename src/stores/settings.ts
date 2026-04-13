import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const mode     = ref<'standalone' | 'online'>('standalone')
  const theme    = ref<'light' | 'dark' | 'system'>('dark')
  const shelfUrl = ref('')
  const token    = ref('')

  const isOnline = computed(() => mode.value === 'online' && !!shelfUrl.value && !!token.value)

  const appVersion      = ref('0.0.0')
  const newestVersion   = ref('')
  const updateAvailable = ref(false)

  async function load() {
    const all = await window.electron.settings.getAll()
    mode.value     = all.mode     === 'online' ? 'online' : 'standalone'
    theme.value    = all.theme    ?? 'dark'
    shelfUrl.value = all.shelf_url  ?? ''
    token.value    = all.shelf_token ?? ''
    
    // Load app version from electron
    appVersion.value = await window.electron.getVersion()
  }

  async function save() {
    await window.electron.settings.set('mode',         mode.value)
    await window.electron.settings.set('theme',        theme.value)
    await window.electron.settings.set('shelf_url',    shelfUrl.value)
    await window.electron.settings.set('shelf_token',  token.value)
  }

  return { mode, theme, shelfUrl, token, isOnline, load, save }
})
