<template>
  <div class="grid grid-cols-3 gap-3 mb-6">
    <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-4">
      <p class="text-xs text-[var(--text-muted)] opacity-50 font-bold uppercase tracking-widest mb-1">Lokal</p>
      <p class="text-2xl font-black text-[var(--text-main)]">{{ localCount }}</p>
      <p class="text-xs text-[var(--text-muted)] opacity-50 mt-0.5">Filme</p>
    </div>
    <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-4">
      <p class="text-xs text-[var(--text-muted)] opacity-50 font-bold uppercase tracking-widest mb-1">Ausstehend</p>
      <p class="text-2xl font-black" :class="dirtyCount > 0 ? 'text-[var(--status-yellow)]' : 'text-[var(--text-main)]'">{{ dirtyCount }}</p>
      <p class="text-xs text-[var(--text-muted)] opacity-50 mt-0.5">Änderungen</p>
    </div>
    <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-4">
      <p class="text-xs text-[var(--text-muted)] opacity-50 font-bold uppercase tracking-widest mb-1">Letzter Sync</p>
      <p class="text-sm font-black text-[var(--text-main)] leading-tight mt-1">{{ lastSyncLabel }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  localCount: number
  dirtyCount: number
  lastSyncLabel: string
}>()
</script>
