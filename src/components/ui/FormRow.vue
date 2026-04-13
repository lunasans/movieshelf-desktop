<template>
  <div>
    <label class="text-xs text-[var(--text-muted)] opacity-60 font-bold uppercase tracking-widest block mb-1">{{ label }}</label>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string }>()
</script>
