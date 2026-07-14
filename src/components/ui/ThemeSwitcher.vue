<template>
  <div class="flex items-center bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-lg p-0.5">
    <button
      v-for="mode in modes"
      :key="mode.id"
      @click="setTheme(mode.id as any)"
      class="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200"
      :class="settings.theme === mode.id 
        ? 'bg-red-600/10 text-red-500 shadow-sm shadow-red-500/10' 
        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-ui)]'"
      :title="mode.label"
    >
      <i :class="`bi bi-${mode.icon}`" class="text-sm"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const { t } = useI18n()

const modes = computed(() => [
  { id: 'light',  icon: 'sun-fill',         label: t('settings.appearance.themeLight') },
  { id: 'dark',   icon: 'moon-stars-fill',  label: t('settings.appearance.themeDark') },
  { id: 'system', icon: 'laptop',           label: t('settings.appearance.themeSystem') }
])

const setTheme = (mode: 'light' | 'dark' | 'system') => {
  settings.theme = mode
  settings.save()
}
</script>
