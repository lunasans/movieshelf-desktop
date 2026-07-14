<template>
  <div class="mt-4">
    <button @click="open = !open" class="text-xs text-[var(--status-yellow)] font-bold flex items-center gap-1">
      <i :class="open ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
      {{ $t('sync.showErrors', { count: errors.length }) }}
    </button>
    <div v-if="open" class="mt-2 bg-[var(--bg-card)] border border-[var(--status-yellow)]/20 rounded-xl p-4 space-y-1 max-h-40 overflow-y-auto">
      <p v-for="(e, i) in errors" :key="i" class="text-xs font-mono text-[var(--status-yellow)] opacity-80">{{ e }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ errors: string[] }>()
const open = ref(false)
</script>
