<template>
  <aside 
    :class="ui.isSidebarCollapsed ? 'w-16' : 'w-56'"
    class="flex-shrink-0 bg-[var(--bg-sidebar)] bg-sidebar border-r border-[var(--border-ui)] border-ui flex flex-col py-4 transition-all duration-300 overflow-hidden"
  >
    <nav class="flex-1 px-3 space-y-1">
      <SidebarItem to="/" icon="speedometer2" :label="$t('nav.dashboard')" />
      <SidebarItem to="/movies" icon="film" :label="$t('nav.movies')" :exact="true" />
      <SidebarItem to="/series" icon="tv" :label="$t('nav.series')" />
      <SidebarItem to="/lists" icon="collection-fill" :label="$t('nav.lists')" />
      <SidebarItem to="/tmdb" icon="search" :label="$t('nav.tmdbSearch')" />
    </nav>

    <div class="px-3 mt-4 border-t border-[var(--border-ui)] border-ui pt-4 space-y-1">
      <SidebarItem to="/sync" icon="arrow-left-right" :label="$t('nav.sync')" />
      <SidebarItem to="/settings" icon="gear-fill" :label="$t('nav.settings')" :badge="settings.updateAvailable" />
      
      <!-- Version display -->
      <div v-if="!ui.isSidebarCollapsed" class="px-3 pt-4 opacity-20 hover:opacity-100 transition-opacity">
        <span class="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
          v{{ settings.appVersion }}
        </span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import SidebarItem from './SidebarItem.vue'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'

const ui = useUiStore()
const settings = useSettingsStore()
</script>
