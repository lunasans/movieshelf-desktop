<template>
  <div class="glass rounded-3xl p-5 flex items-center gap-4 transition-all duration-300 hover:border-red-500/30">
    <div class="w-12 h-12 bg-red-600/10 rounded-2xl flex items-center justify-center text-xl text-red-500 border border-red-500/20">
      <i :class="`bi bi-${icon}`"></i>
    </div>
    <div>
      <p class="text-2xl font-black text-[var(--text-main)]">{{ value }}</p>
      <p class="text-xs text-[var(--text-muted)] opacity-60 font-bold uppercase tracking-widest">{{ label }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: number | string; icon: string }>()
</script>
