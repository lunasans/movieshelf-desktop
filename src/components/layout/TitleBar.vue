<template>
  <div
    class="flex items-center justify-between h-10 px-4 bg-[var(--bg-sidebar)] border-b border-[var(--border-ui)] select-none"
    style="-webkit-app-region: drag"
  >
    <!-- Logo & Toggle -->
    <div class="flex items-center gap-4" style="-webkit-app-region: no-drag">
      <button 
        @click="ui.toggleSidebar" 
        class="w-8 h-8 rounded-lg hover:bg-[var(--border-ui)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
        title="Sidebar umschalten"
      >
        <i class="bi bi-list text-lg"></i>
      </button>

      <div class="flex items-center gap-2">
        <img src="/logo_small.png" alt="MovieShelf" class="h-5 w-auto" />
      </div>
    </div>

    <!-- Center Section: Dynamic Title/Status -->
    <div class="flex-1 flex items-center justify-center min-w-0 px-8">
      <Transition name="header-fade" mode="out-in">
        <!-- Case 1: Active Movie Title -->
        <span 
          v-if="ui.headerTitle" 
          key="title"
          class="text-xs font-black text-[var(--text-main)] uppercase tracking-[0.2em] truncate whitespace-nowrap opacity-80"
        >
          {{ ui.headerTitle }}
        </span>

        <!-- Case 2: Online/Offline Status (Default) -->
        <div v-else key="status" class="flex items-center gap-2">
          <span
            :class="isOnline 
              ? 'border-[var(--status-green)]/20' 
              : 'border-[var(--border-ui)]'"
            :style="isOnline ? { color: 'var(--status-green)', backgroundColor: 'var(--status-green-bg)' } : {}"
            class="text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full border flex items-center gap-2 transition-all duration-300"
          >
            <div class="w-1 h-1 rounded-full bg-current"></div>
            {{ isOnline ? 'Online · ' + shelfUrl : 'Offline' }}
          </span>
        </div>
      </Transition>
    </div>

    <!-- Right Section: Theme Switcher & Window controls -->
    <div class="flex items-center gap-4" style="-webkit-app-region: no-drag">
      <!-- Theme Switcher -->
      <ThemeSwitcher />

      <!-- Window controls -->
      <div class="flex items-center gap-1">
        <button @click="minimize" class="w-8 h-8 rounded-lg hover:bg-[var(--border-ui)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
          <i class="bi bi-dash-lg text-sm"></i>
        </button>
        <button @click="maximize" class="w-8 h-8 rounded-lg hover:bg-[var(--border-ui)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
          <i class="bi bi-app text-[10px]"></i>
        </button>
        <button @click="close" class="w-8 h-8 rounded-lg hover:bg-red-500/80 flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-colors">
          <i class="bi bi-x-lg text-sm"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.vue'

const settings = useSettingsStore()
const ui = useUiStore()

const isOnline = computed(() => settings.mode === 'online')
const shelfUrl = computed(() => settings.shelfUrl)

const minimize = () => window.electron.window.minimize()
const maximize = () => window.electron.window.maximize()
const close    = () => window.electron.window.close()
</script>

<style scoped>
.header-fade-enter-active,
.header-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.header-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.header-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
