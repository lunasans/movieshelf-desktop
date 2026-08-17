<!--
  Easter Egg: Bei den saisonalen Themes bekommt das Logo in der Titelleiste
  eine kleine Dekoration aufgesetzt (Weihnachtsmütze, Kürbis, Sonne).
  Bewusst als Inline-SVG statt als zusätzliche PNG-Variante, damit das Logo
  selbst unangetastet bleibt und die Grafik in jeder Auflösung scharf ist.
-->
<template>
  <svg
    v-if="badge"
    :key="badge"
    class="seasonal-badge pointer-events-none absolute"
    :class="badge"
    viewBox="0 0 24 24"
    width="14"
    height="14"
    aria-hidden="true"
  >
    <!-- Weihnachtsmütze -->
    <g v-if="badge === 'christmas'">
      <path d="M4 17C5 9 10 3 17 3c2.2 0 3.6 1.1 3.6 2.4 0 3.2-6.1 6.6-8.6 12.6z" fill="#c41e3a" />
      <rect x="2" y="15.5" width="13" height="5" rx="2.5" fill="#fdfdfd" />
      <circle cx="20.6" cy="4.6" r="2.6" fill="#fdfdfd" />
    </g>

    <!-- Halloween-Kürbis -->
    <g v-else-if="badge === 'halloween'">
      <path d="M11 4c0-1.6.6-2.6 2-3" stroke="#166534" stroke-width="2" stroke-linecap="round" fill="none" />
      <ellipse cx="12" cy="14.5" rx="9.5" ry="8" fill="#ea580c" />
      <ellipse cx="12" cy="14.5" rx="3.4" ry="8" fill="#fb923c" opacity=".45" />
      <path d="M6.5 12.5l3.2-2 .6 3.4zM17.5 12.5l-3.2-2-.6 3.4z" fill="#1c1917" />
      <path d="M7.5 17h9l-1.6 2.2-1.6-1.1-1.3 1.4-1.3-1.4-1.6 1.1z" fill="#1c1917" />
    </g>

    <!-- Sommer-Sonne -->
    <g v-else stroke="#f59e0b" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="5" fill="#fbbf24" stroke="none" />
      <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M19.4 4.6l-2.1 2.1M6.7 17.3l-2.1 2.1" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

const badge = computed(() => {
  const theme = settings.theme
  return theme === 'christmas' || theme === 'halloween' || theme === 'summer' ? theme : null
})
</script>

<style scoped>
.seasonal-badge {
  transform-origin: bottom right;
  /* Nur Deckkraft animieren: transform ist je Badge belegt (Drehung,
     Spiegelung) und würde von einem Keyframe überschrieben. */
  animation: badge-pop .45s cubic-bezier(.16, 1, .3, 1);
}

/* Alle Aufsätze sitzen in der rechten oberen Ecke des Logos, leicht
   darüber hinaus, damit sie die Schrift nicht überdecken. */
.seasonal-badge.christmas {
  top: -5px;
  right: -8px;
  transform: rotate(30deg);
}

.seasonal-badge.halloween,
.seasonal-badge.summer {
  top: -8px;
  right: -8px;
}

@keyframes badge-pop {
  from { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .seasonal-badge { animation: none; }
}
</style>
