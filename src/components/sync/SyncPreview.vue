<template>
  <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl mb-6 overflow-hidden">

    <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--border-ui)]">
      <div class="flex items-center gap-3">
        <i class="bi bi-eye text-[var(--status-red)]"></i>
        <p class="text-sm font-black text-[var(--text-main)]">Vorschau: Synchronisationsunterschiede</p>
      </div>
      <span v-if="totalItems === 0" class="text-xs text-[var(--text-muted)] opacity-50">Keine Änderungen</span>
    </div>

    <!-- Pull section: Shelf → Desktop -->
    <div class="border-b border-[var(--border-ui)]">
      <div class="flex items-center justify-between px-5 py-2.5 bg-[var(--bg-elevated)]">
        <div class="flex items-center gap-2">
          <i class="bi bi-cloud-download text-xs text-[var(--text-muted)] opacity-60"></i>
          <span class="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] opacity-60">Shelf → Desktop</span>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="preview.new > 0"     class="text-xs font-bold text-[var(--status-green)] bg-[var(--status-green)]/10 px-2 py-0.5 rounded-lg">+{{ preview.new }} neu</span>
          <span v-if="preview.updated > 0" class="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-lg">~ {{ preview.updated }} geändert</span>
          <span v-if="preview.deleted > 0" class="text-xs font-bold text-[var(--status-red)] bg-[var(--status-red)]/10 px-2 py-0.5 rounded-lg">– {{ preview.deleted }} gelöscht</span>
          <span v-if="pullItems.length === 0" class="text-xs text-[var(--text-muted)] opacity-40">Aktuell</span>
        </div>
      </div>
      <div v-if="pullItems.length > 0" class="max-h-48 overflow-y-auto">
        <div v-for="item in pullItems" :key="'pull_' + (item.remoteId ?? item.title)"
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
      </div>
    </div>

    <!-- Push section: Desktop → Shelf -->
    <div>
      <div class="flex items-center justify-between px-5 py-2.5 bg-[var(--bg-elevated)]">
        <div class="flex items-center gap-2">
          <i class="bi bi-cloud-upload text-xs text-[var(--text-muted)] opacity-60"></i>
          <span class="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] opacity-60">Desktop → Shelf</span>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="preview.pushNew > 0"     class="text-xs font-bold text-[var(--status-green)] bg-[var(--status-green)]/10 px-2 py-0.5 rounded-lg">+{{ preview.pushNew }} neu</span>
          <span v-if="preview.pushUpdated > 0" class="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-lg">~ {{ preview.pushUpdated }} geändert</span>
          <span v-if="preview.pushDeleted > 0" class="text-xs font-bold text-[var(--status-red)] bg-[var(--status-red)]/10 px-2 py-0.5 rounded-lg">– {{ preview.pushDeleted }} gelöscht</span>
          <span v-if="pushItems.length === 0" class="text-xs text-[var(--text-muted)] opacity-40">Aktuell</span>
        </div>
      </div>
      <div v-if="pushItems.length > 0" class="max-h-48 overflow-y-auto">
        <div v-for="item in pushItems" :key="'push_' + (item.remoteId ?? item.title)"
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
            <p class="text-xs text-[var(--text-muted)] opacity-40 mt-0.5">{{ item.year ?? '–' }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="preview.overflow > 0" class="px-5 py-2 text-center text-xs text-[var(--text-muted)] opacity-40 border-t border-[var(--border-ui)]">
      … und {{ preview.overflow }} weitere
    </div>

    <div class="flex items-center gap-3 px-5 py-4 border-t border-[var(--border-ui)] bg-[var(--bg-app)]">
      <button @click="emit('apply')" :disabled="totalItems === 0"
        class="flex-1 bg-[var(--status-red)] hover:opacity-90 disabled:opacity-40 text-white text-sm font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2">
        <i class="bi bi-arrow-repeat"></i>
        {{ totalItems === 0 ? 'Nichts zu tun' : 'Synchronisieren' }}
      </button>
      <button @click="emit('cancel')" class="px-5 py-3 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
        Abbrechen
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PreviewData } from '@/composables/useSyncEngine'

const props = defineProps<{ preview: PreviewData }>()
const emit = defineEmits<{ apply: []; cancel: [] }>()

const pullItems = computed(() => props.preview.items.filter(i => i.direction === 'pull'))
const pushItems = computed(() => props.preview.items.filter(i => i.direction === 'push'))
const totalItems = computed(() => pullItems.value.length + pushItems.value.length)
</script>
