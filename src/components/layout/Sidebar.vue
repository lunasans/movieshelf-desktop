<template>
  <aside 
    :class="ui.isSidebarCollapsed ? 'w-16' : 'w-56'"
    class="flex-shrink-0 bg-[var(--bg-sidebar)] bg-sidebar border-r border-[var(--border-ui)] border-ui flex flex-col py-4 transition-all duration-300 overflow-hidden"
  >
    <nav class="flex-1 px-3 space-y-1">
      <SidebarItem to="/" icon="speedometer2" label="Dashboard" />
      <SidebarItem to="/movies" icon="film" label="Filme" />
      <SidebarItem to="/lists" icon="collection-fill" label="Listen" />
      <SidebarItem to="/tmdb" icon="search" label="TMDb Suche" />
    </nav>

    <div class="px-3 mt-4 border-t border-[var(--border-ui)] border-ui pt-4 space-y-1">
      <SidebarItem to="/sync" icon="arrow-left-right" label="Synchronisation" />
      <SidebarItem to="/settings" icon="gear-fill" label="Einstellungen" :badge="settings.updateAvailable" />
      
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
