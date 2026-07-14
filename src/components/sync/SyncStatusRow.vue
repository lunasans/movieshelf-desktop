<template>
  <div class="grid grid-cols-3 gap-3 mb-6">
    <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-4">
      <p class="text-xs text-[var(--text-muted)] opacity-50 font-bold uppercase tracking-widest mb-1">{{ $t('sync.statusLocal') }}</p>
      <p class="text-2xl font-black text-[var(--text-main)]">{{ localCount }}</p>
      <p class="text-xs text-[var(--text-muted)] opacity-50 mt-0.5">{{ $t('sync.statusMovies') }}</p>
    </div>
    <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-4">
      <p class="text-xs text-[var(--text-muted)] opacity-50 font-bold uppercase tracking-widest mb-1">{{ $t('sync.statusPending') }}</p>
      <p class="text-2xl font-black" :class="dirtyCount > 0 ? 'text-[var(--status-yellow)]' : 'text-[var(--text-main)]'">{{ dirtyCount }}</p>
      <p class="text-xs text-[var(--text-muted)] opacity-50 mt-0.5">{{ $t('sync.statusChanges') }}</p>
    </div>
    <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-4">
      <p class="text-xs text-[var(--text-muted)] opacity-50 font-bold uppercase tracking-widest mb-1">{{ $t('sync.statusLastSync') }}</p>
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
