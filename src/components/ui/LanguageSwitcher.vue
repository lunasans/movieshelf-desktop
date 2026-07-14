<template>
  <div class="flex items-center bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-lg p-0.5">
    <button
      v-for="lang in languages"
      :key="lang.id"
      @click="setLanguage(lang.id)"
      class="h-7 px-2 rounded-md flex items-center justify-center text-xs font-bold uppercase tracking-widest transition-all duration-200"
      :class="settings.language === lang.id
        ? 'bg-red-600/10 text-red-500 shadow-sm shadow-red-500/10'
        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-ui)]'"
      :title="lang.label"
    >
      {{ lang.id.toUpperCase() }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const { t } = useI18n()

const languages = computed(() => [
  { id: 'de' as const, label: t('settings.appearance.languageGerman') },
  { id: 'en' as const, label: t('settings.appearance.languageEnglish') },
])

const setLanguage = (lang: 'de' | 'en') => {
  settings.language = lang
  settings.save()
}
</script>
