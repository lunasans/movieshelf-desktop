<template>
  <router-link
    :to="to"
    class="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
    :class="[
      isActive
        ? 'bg-red-600/10 text-red-500 border border-red-500/20 shadow-sm'
        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-ui)] border border-transparent',
      ui.isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-3'
    ]"
    :title="ui.isSidebarCollapsed ? label : ''"
  >
    <span class="relative flex-shrink-0">
      <i :class="`bi bi-${icon}`" class="text-base leading-none block"></i>
      <span v-if="badge" class="absolute -top-1 -right-1 flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-green)] opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-[var(--status-green)]"></span>
      </span>
    </span>
    <span v-if="!ui.isSidebarCollapsed" class="truncate whitespace-nowrap">{{ label }}</span>
  </router-link>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUiStore } from '@/stores/ui'

const props = defineProps<{ to: string; icon: string; label: string; badge?: boolean; exact?: boolean }>()
const route = useRoute()
const ui = useUiStore()

const isActive = computed(() =>
  props.to === '/' || props.exact ? route.path === props.to : route.path.startsWith(props.to)
)
</script>
