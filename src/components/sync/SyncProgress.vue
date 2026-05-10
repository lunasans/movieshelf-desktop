<template>
  <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-6 mb-6">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-[var(--status-red)]/10 flex items-center justify-center">
          <i class="bi bi-arrow-repeat text-[var(--status-red)] animate-spin"></i>
        </div>
        <div>
          <p class="text-sm font-black text-[var(--text-main)]">{{ phaseLabel }}</p>
          <p class="text-xs text-[var(--text-muted)] opacity-50">{{ phaseDetail }}</p>
        </div>
      </div>
      <span class="text-xs font-black text-[var(--text-muted)] opacity-40">{{ progressPct }}%</span>
    </div>
    <div class="w-full bg-[var(--bg-app)] rounded-full h-1.5 overflow-hidden">
      <div class="h-1.5 bg-[var(--status-red)] rounded-full transition-all duration-300" :style="{ width: progressPct + '%' }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  phaseLabel: string
  phaseDetail: string
  progressPct: number
}>()
</script>
