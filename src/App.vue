<template>
  <!-- Popup mode (stats window etc.) — no sidebar/titlebar -->
  <div v-if="isPopup" class="h-screen overflow-y-auto bg-[var(--bg-app)]">
    <router-view />
  </div>

  <!-- Normal app layout -->
  <div v-else class="flex flex-col h-screen overflow-hidden">
    <TitleBar />
    <div class="flex flex-1 overflow-hidden">
      <Sidebar />
      <main class="flex-1 overflow-y-auto">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { setLocale } from '@/i18n'
import { useUpdateService } from '@/services/updateService'
import { useKeyboard } from '@/composables/useKeyboard'
import TitleBar from '@/components/layout/TitleBar.vue'
import Sidebar from '@/components/layout/Sidebar.vue'

const isPopup = new URLSearchParams(window.location.search).get('popup') === '1'

const router   = useRouter()
const settings = useSettingsStore()
const { checkForUpdates } = useUpdateService()

useKeyboard({
  '/': () => {
    const el = document.querySelector<HTMLInputElement>('input[type=text], input:not([type])')
    el?.focus()
  },
  'Escape': () => {
    const el = document.activeElement as HTMLElement | null
    el?.blur()
  },
  'r': () => router.push('/movies'),
})

const applyTheme = (theme: string) => {
  let finalTheme = theme
  if (theme === 'system') {
    finalTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  document.documentElement.classList.remove('theme-light', 'theme-dark')
  document.documentElement.classList.add(`theme-${finalTheme}`)
}

// Theme sofort anwenden bevor Settings async geladen werden
applyTheme('dark')

onMounted(async () => {
  await settings.load()
  applyTheme(settings.theme)
  setLocale(settings.language)
  
  // Automatischer Update-Check beim Start
  checkForUpdates()
  
  // Watch for OS theme changes if in system mode
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    if (settings.theme === 'system') {
      applyTheme('system')
    }
  })
})

watch(() => settings.theme, (newTheme) => {
  applyTheme(newTheme)
})

watch(() => settings.language, (newLanguage) => {
  setLocale(newLanguage)
})
</script>
