<template>
  <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl mb-6 overflow-hidden">

    <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--border-ui)]">
      <div class="flex items-center gap-3">
        <i class="bi bi-eye text-[var(--status-red)]"></i>
        <p class="text-sm font-black text-[var(--text-main)]">Vorschau: Änderungen vom Shelf</p>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="preview.new > 0"     class="text-xs font-bold text-[var(--status-green)] bg-[var(--status-green)]/10 px-2 py-0.5 rounded-lg">+{{ preview.new }} neu</span>
        <span v-if="preview.updated > 0" class="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-lg">~ {{ preview.updated }} geändert</span>
        <span v-if="preview.deleted > 0" class="text-xs font-bold text-[var(--status-red)] bg-[var(--status-red)]/10 px-2 py-0.5 rounded-lg">– {{ preview.deleted }} gelöscht</span>
        <span v-if="preview.items.length === 0" class="text-xs text-[var(--text-muted)] opacity-50">Keine Änderungen</span>
      </div>
    </div>

    <div v-if="preview.items.length === 0" class="px-5 py-8 text-center">
      <i class="bi bi-check-circle text-2xl text-[var(--status-green)] block mb-2"></i>
      <p class="text-sm text-[var(--text-muted)] opacity-60">Lokal ist bereits auf dem aktuellen Stand.</p>
    </div>

    <div v-else class="max-h-72 overflow-y-auto">
      <div v-for="item in preview.items" :key="item.remoteId"
        class="flex items-start gap-3 px-5 py-3 border-b border-[var(--border-ui)] last:border-0 hover:bg-[var(--bg-elevated)] transition-colors">
        <span class="flex-shrink-0 mt-0.5 text-xs font-black uppercase tracking-wider w-16 text-center py-0.5 rounded-md"
          :class="{
            'bg-[var(--status-green)]/10 text-[var(--status-green)]': item.action === 'new',
            'bg-blue-400/10 text-blue-400': item.action === 'updated',
            'bg-[var(--status-red)]/10 text-[var(--status-red)]': item.action === 'deleted',
          }">
          {{ item.action === 'new' ? 'Neu' : item.action === 'updated' ? 'Update' : 'Gelöscht' }}
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-[var(--text-main)] truncate">{{ item.title }}</p>
          <p v-if="item.action === 'updated' && item.changes.length > 0" class="text-xs text-[var(--text-muted)] opacity-60 mt-0.5">
            {{ item.changes.join(' · ') }}
          </p>
          <p v-else class="text-xs text-[var(--text-muted)] opacity-40 mt-0.5">{{ item.year ?? '–' }}</p>
        </div>
      </div>
      <div v-if="preview.overflow > 0" class="px-5 py-3 text-center text-xs text-[var(--text-muted)] opacity-40">
        … und {{ preview.overflow }} weitere
      </div>
    </div>

    <div class="flex items-center gap-3 px-5 py-4 border-t border-[var(--border-ui)] bg-[var(--bg-app)]">
      <button @click="emit('apply')" :disabled="preview.items.length === 0"
        class="flex-1 bg-[var(--status-red)] hover:opacity-90 disabled:opacity-40 text-white text-sm font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2">
        <i class="bi bi-cloud-download"></i>
        {{ preview.items.length === 0 ? 'Nichts zu tun' : 'Änderungen übernehmen' }}
      </button>
      <button @click="emit('cancel')" class="px-5 py-3 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
        Abbrechen
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { PreviewData } from '@/composables/useSyncEngine'

defineProps<{ preview: PreviewData }>()
const emit = defineEmits<{ apply: []; cancel: [] }>()
</script>
