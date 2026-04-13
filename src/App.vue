<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <!-- Custom Title Bar -->
    <TitleBar />

    <!-- Main Layout -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <Sidebar />

      <!-- Content -->
      <main class="flex-1 overflow-y-auto">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useUpdateService } from '@/services/updateService'
import TitleBar from '@/components/layout/TitleBar.vue'
import Sidebar from '@/components/layout/Sidebar.vue'

const settings = useSettingsStore()
const { checkForUpdates } = useUpdateService()

const applyTheme = (theme: string) => {
  let finalTheme = theme
  if (theme === 'system') {
    finalTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  
  document.documentElement.classList.remove('theme-light', 'theme-dark')
  document.documentElement.classList.add(`theme-${finalTheme}`)
}

onMounted(async () => {
  await settings.load()
  applyTheme(settings.theme)
  
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
</script>
