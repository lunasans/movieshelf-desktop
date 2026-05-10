<template>
  <div class="rounded-2xl p-5 mb-6 border"
    :class="result.errors > 0 ? 'bg-[var(--status-yellow-bg)] border-[var(--status-yellow)]/20' : 'bg-[var(--bg-card)] border-[var(--status-green)]/30'">
    <div class="flex items-center gap-3 mb-3">
      <i class="bi text-lg" :class="result.errors > 0 ? 'bi-exclamation-triangle text-[var(--status-yellow)]' : 'bi-check-circle text-[var(--status-green)]'"></i>
      <p class="font-black text-sm text-[var(--text-main)]">
        {{ result.errors > 0 ? 'Sync abgeschlossen mit Fehlern' : 'Sync erfolgreich' }}
      </p>
      <span class="ml-auto text-xs text-[var(--text-muted)] opacity-50">{{ result.duration }}s</span>
    </div>
    <div class="grid grid-cols-5 gap-3">
      <div class="text-center">
        <p class="text-xl font-black text-[var(--text-main)]">{{ result.pulled }}</p>
        <p class="text-xs text-[var(--text-muted)] opacity-50">Gezogen</p>
      </div>
      <div class="text-center">
        <p class="text-xl font-black text-[var(--text-main)]">{{ result.pushed }}</p>
        <p class="text-xs text-[var(--text-muted)] opacity-50">Hochgeladen</p>
      </div>
      <div class="text-center">
        <p class="text-xl font-black text-[var(--text-main)]">{{ result.deleted }}</p>
        <p class="text-xs text-[var(--text-muted)] opacity-50">Gelöscht</p>
      </div>
      <div class="text-center">
        <p class="text-xl font-black text-[var(--text-main)]">{{ result.media }}</p>
        <p class="text-xs text-[var(--text-muted)] opacity-50">Bilder</p>
      </div>
      <div class="text-center">
        <p class="text-xl font-black" :class="result.errors > 0 ? 'text-[var(--status-yellow)]' : 'text-[var(--text-muted)]'">{{ result.errors }}</p>
        <p class="text-xs text-[var(--text-muted)] opacity-50">Fehler</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SyncResult } from '@/composables/useSyncEngine'

defineProps<{ result: SyncResult }>()
</script>
