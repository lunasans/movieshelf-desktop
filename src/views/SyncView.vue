<template>
  <div class="p-8 max-w-3xl mx-auto">
    <h1 class="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">Synchronisation</h1>
    <p class="text-sm text-[var(--text-muted)] opacity-60 mb-8">Lokale Sammlung mit deiner MovieShelf abgleichen</p>

    <!-- Not connected -->
    <div v-if="!settings.isOnline" class="bg-[var(--status-yellow-bg)] border border-[var(--status-yellow)]/20 rounded-2xl p-8 text-center">
      <i class="bi bi-cloud-slash text-3xl text-[var(--status-yellow)] block mb-3"></i>
      <p class="text-[var(--status-yellow)] text-base font-black uppercase tracking-tight mb-2">Nicht verbunden</p>
      <p class="text-[var(--text-muted)] opacity-70 text-sm max-w-xs mx-auto mb-6">Bitte zuerst in den Einstellungen eine MovieShelf-Verbindung einrichten.</p>
      <router-link to="/settings" class="inline-block px-6 py-3 bg-[var(--bg-elevated)] border border-[var(--border-ui)] rounded-xl text-[var(--status-red)] text-sm font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
        Zu den Einstellungen →
      </router-link>
    </div>

    <template v-else>

      <SyncStatusRow :localCount="localCount" :dirtyCount="dirtyCount" :lastSyncLabel="lastSyncLabel" />

      <SyncProgress v-if="phase !== 'idle'" :phaseLabel="phaseLabel" :phaseDetail="phaseDetail" :progressPct="progressPct" />

      <SyncPreview v-if="preview && phase === 'idle'" :preview="preview" @apply="applyPull" @cancel="preview = null" />

      <SyncResult v-if="result && phase === 'idle' && !preview" :result="result" />

      <!-- Action buttons -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <button @click="loadPreview" :disabled="phase !== 'idle' || previewLoading"
          class="bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] disabled:opacity-40 text-[var(--text-main)] text-sm font-bold px-4 py-4 rounded-2xl transition-all flex flex-col items-center gap-2">
          <i class="bi text-xl text-[var(--status-red)]" :class="previewLoading ? 'bi-hourglass-split animate-spin' : 'bi-cloud-download'"></i>
          <span>Shelf → Desktop</span>
          <span class="text-xs text-[var(--text-muted)] opacity-50">{{ previewLoading ? 'Lade Vorschau…' : 'Vorschau & importieren' }}</span>
        </button>
        <button @click="runPush" :disabled="phase !== 'idle'"
          class="bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] disabled:opacity-40 text-[var(--text-main)] text-sm font-bold px-4 py-4 rounded-2xl transition-all flex flex-col items-center gap-2"
          :class="dirtyCount > 0 ? 'border-[var(--status-yellow)]/30' : ''">
          <i class="bi bi-cloud-upload text-xl text-[var(--status-red)]"></i>
          <span>Desktop → Shelf</span>
          <span class="text-xs text-[var(--text-muted)] opacity-50">{{ dirtyCount > 0 ? `${dirtyCount} Änderungen` : 'Keine Änderungen' }}</span>
        </button>
      </div>

      <button @click="runFullSync" :disabled="phase !== 'idle'"
        class="w-full bg-[var(--status-red)] hover:opacity-90 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all text-sm flex items-center justify-center gap-3 shadow-lg shadow-red-600/10">
        <i class="bi bi-arrow-repeat text-lg" :class="{ 'animate-spin': phase !== 'idle' }"></i>
        {{ phase !== 'idle' ? phaseLabel : 'Vollständig synchronisieren' }}
      </button>

      <SyncErrorLog v-if="errors.length > 0" :errors="errors" />

    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useSyncEngine } from '@/composables/useSyncEngine'
import SyncStatusRow from '@/components/sync/SyncStatusRow.vue'
import SyncProgress  from '@/components/sync/SyncProgress.vue'
import SyncPreview   from '@/components/sync/SyncPreview.vue'
import SyncResult    from '@/components/sync/SyncResult.vue'
import SyncErrorLog  from '@/components/sync/SyncErrorLog.vue'

const settings = useSettingsStore()
const {
  phase, phaseLabel, phaseDetail, progressPct,
  localCount, dirtyCount, lastSyncLabel,
  errors, previewLoading, preview, result,
  loadStats, loadPreview, applyPull, runPush, runFullSync,
} = useSyncEngine()

onMounted(loadStats)
</script>
