<template>
  <div ref="root" class="relative">
    <!-- Trigger: zeigt das aktive Farbschema als Swatch -->
    <button
      @click="open = !open"
      class="flex items-center gap-2 h-8 pl-1.5 pr-2.5 rounded-lg border border-[var(--border-ui)] bg-[var(--bg-app)] hover:bg-[var(--bg-elevated)] transition-colors"
      :title="$t('settings.appearance.themePickerTitle')"
    >
      <span class="w-5 h-5 rounded-md shadow-inner" :style="{ background: activeTheme.swatch }"></span>
      <i class="bi bi-chevron-down text-[9px] text-[var(--text-muted)]"></i>
    </button>

    <!-- Panel im Shelf-Stil: Grid mit Farbkacheln, saisonale Themes abgesetzt -->
    <Transition name="theme-pop">
      <!-- Bewusst kein .glass: über dem dichten Filmraster liest man durch den
           Glasschleier hindurch. Die Shelf nimmt für ihr Dropdown aus demselben
           Grund eine fast deckende Fläche (bg-gray-950/80). -->
      <div
        v-if="open"
        class="absolute right-0 top-10 z-50 w-64 p-5 rounded-3xl shadow-2xl
               bg-[var(--bg-elevated)] border border-[var(--border-ui)] backdrop-blur-2xl"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] flex items-center gap-2">
            <i class="bi bi-stars text-red-400"></i>
            {{ $t('settings.appearance.themePickerTitle') }}
          </h3>
          <button @click="open = false" class="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <i class="bi bi-x-lg text-xs"></i>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2.5 mb-5">
          <button
            v-for="theme in standardThemes"
            :key="theme.id"
            @click="setTheme(theme.id)"
            :class="settings.theme === theme.id
              ? 'border-red-500/50 bg-white/5'
              : 'border-[var(--border-ui)] bg-white/[0.02]'"
            class="p-2.5 rounded-2xl border flex flex-col items-center gap-2 hover:bg-white/[0.05] transition-all group"
          >
            <span class="w-9 h-9 rounded-lg shadow-inner group-hover:scale-110 transition-transform flex items-center justify-center" :style="{ background: theme.swatch }">
              <i v-if="theme.icon" :class="`bi bi-${theme.icon}`" class="text-white text-sm drop-shadow"></i>
            </span>
            <span class="text-[10px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
              {{ theme.label }}
            </span>
          </button>
        </div>

        <div class="flex items-center gap-2 mb-3">
          <div class="h-px flex-1 bg-[var(--border-ui)]"></div>
          <span class="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            {{ $t('settings.appearance.themeGroupSeasonal') }}
          </span>
          <div class="h-px flex-1 bg-[var(--border-ui)]"></div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="theme in seasonalThemes"
            :key="theme.id"
            @click="setTheme(theme.id)"
            :class="settings.theme === theme.id
              ? 'border-red-500/50 bg-white/5'
              : 'border-[var(--border-ui)] bg-white/[0.02]'"
            class="p-2 rounded-xl border flex flex-col items-center gap-1.5 hover:bg-white/[0.05] transition-all group text-center"
          >
            <span class="w-6 h-6 rounded shadow-inner group-hover:scale-110 transition-transform" :style="{ background: theme.swatch }"></span>
            <span class="text-[7px] font-bold uppercase leading-tight text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
              {{ theme.label }}
            </span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore, type Theme } from '@/stores/settings'

const settings = useSettingsStore()
const { t } = useI18n()

const root = ref<HTMLElement | null>(null)
const open = ref(false)

type ThemeOption = { id: Theme; label: string; swatch: string; icon?: string }

// Die Verläufe entsprechen den Akzentpaaren aus style.css, damit die Kachel
// zeigt, was das Theme tatsächlich anrichtet.
const standardThemes = computed<ThemeOption[]>(() => [
  { id: 'dark',   label: t('settings.appearance.themeDark'),   swatch: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)' },
  { id: 'light',  label: t('settings.appearance.themeLight'),  swatch: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)' },
  { id: 'system', label: t('settings.appearance.themeSystem'), swatch: 'linear-gradient(135deg, #52525b 0%, #18181b 100%)', icon: 'laptop' },
  { id: 'blue',   label: t('settings.appearance.themeBlue'),   swatch: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' },
  { id: 'green',  label: t('settings.appearance.themeGreen'),  swatch: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' },
  { id: 'red',    label: t('settings.appearance.themeRed'),    swatch: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' },
  { id: 'purple', label: t('settings.appearance.themePurple'), swatch: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)' },
])

// Die Kachel zeigt beide Farben des Themes — bei den saisonalen macht erst das
// Paar die Jahreszeit aus (Rot/Tanne, Kürbis/Hexe, Pink/Himmel).
const seasonalThemes = computed<ThemeOption[]>(() => [
  { id: 'christmas', label: t('settings.appearance.themeChristmas'), swatch: 'linear-gradient(135deg, #c41e3a 0%, #165b33 100%)' },
  { id: 'halloween', label: t('settings.appearance.themeHalloween'), swatch: 'linear-gradient(135deg, #ea580c 0%, #7e22ce 100%)' },
  { id: 'summer',    label: t('settings.appearance.themeSummer'),    swatch: 'linear-gradient(135deg, #db2777 0%, #0ea5e9 100%)' },
])

const activeTheme = computed<ThemeOption>(() =>
  [...standardThemes.value, ...seasonalThemes.value].find(x => x.id === settings.theme)
    ?? standardThemes.value[0]
)

const setTheme = (id: Theme) => {
  settings.theme = id
  settings.save()
  open.value = false
}

const onDocumentClick = (event: MouseEvent) => {
  if (open.value && root.value && !root.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<style scoped>
.theme-pop-enter-active,
.theme-pop-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.theme-pop-enter-from,
.theme-pop-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
</style>
