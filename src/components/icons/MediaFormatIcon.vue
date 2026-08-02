<template>
  <!-- Medienformat-Icon, 24x24, currentColor -->
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <!-- DVD: Disc -->
    <template v-if="format === 'DVD'">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" />
    </template>

    <!-- Blu-ray: Disc mit Lichtreflex -->
    <template v-else-if="format === 'BluRay'">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" />
      <path d="M12 4.2a7.8 7.8 0 0 1 6.9 4.2l-2 1a5.6 5.6 0 0 0-4.9-3v-2.2Z" fill="#fff" fill-opacity=".55" />
    </template>

    <!-- 4K: Breitbild-Display (Kennzeichnung kommt aus dem Badge-Text) -->
    <template v-else-if="format === '4K'">
      <path d="M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm1.8 2.5v8h14.4v-8H4.8ZM8 18h8v2H8v-2Z" />
    </template>

    <!-- Streaming: Wolke mit Play -->
    <template v-else-if="format === 'Streaming'">
      <path d="M6.5 19A4.5 4.5 0 0 1 6 10.06a6 6 0 0 1 11.66-1.03A4.5 4.5 0 0 1 17.5 19h-11Zm4.1-7.4v4.8l4-2.4-4-2.4Z" />
    </template>

    <!-- Digital: Speicher/Chip -->
    <template v-else-if="format === 'Digital'">
      <path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm2.5 2.5v5h9v-5h-9Zm0 8.2a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Zm4 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Zm4 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z" />
    </template>

    <!-- VHS: Kassette -->
    <template v-else-if="format === 'VHS'">
      <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1.8 3.4v7.2h14.4V8.4H4.8Zm2.9 1.8a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Zm8.6 0a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z" />
    </template>

    <!-- Leihe: Uhr mit Rückgabepfeil -->
    <template v-else-if="format === 'Leihe'">
      <path d="M12 3a9 9 0 1 1-8.2 5.3l1.9.8A7 7 0 1 0 12 5v2.6L8.2 4.8 12 2v1Zm.9 4.6v4.7l3.4 2-.9 1.5-4.3-2.6V7.6h1.8Z" />
    </template>

    <!-- Fallback: neutrale Disc -->
    <template v-else>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" />
    </template>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ format: string }>()
</script>
