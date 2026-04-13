<template>
  <router-link
    :to="to"
    class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
    :class="[
      isActive
        ? 'bg-red-600/10 text-red-500 border border-red-500/20 shadow-sm'
        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-ui)] border border-transparent',
      ui.isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-3'
    ]"
    :title="ui.isSidebarCollapsed ? label : ''"
  >
    <i :class="`bi bi-${icon}`" class="text-base leading-none flex-shrink-0"></i>
    <span v-if="!ui.isSidebarCollapsed" class="truncate whitespace-nowrap">{{ label }}</span>
  </router-link>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUiStore } from '@/stores/ui'

const props = defineProps<{ to: string; icon: string; label: string }>()
const route = useRoute()
const ui = useUiStore()

const isActive = computed(() =>
  props.to === '/' ? route.path === '/' : route.path.startsWith(props.to)
)
</script>
