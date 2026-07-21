<template>
  <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl mb-6 overflow-hidden">

    <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--border-ui)]">
      <div class="flex items-center gap-3">
        <i class="bi bi-eye text-[var(--status-red)]"></i>
        <p class="text-sm font-black text-[var(--text-main)]">{{ $t('sync.previewTitle') }}</p>
      </div>
      <span v-if="totalItems === 0" class="text-xs text-[var(--text-muted)] opacity-50">{{ $t('sync.noChanges') }}</span>
    </div>

    <!-- Pull section: Shelf → Desktop -->
    <div class="border-b border-[var(--border-ui)]">
      <div class="flex items-center justify-between px-5 py-2.5 bg-[var(--bg-elevated)]">
        <div class="flex items-center gap-2">
          <i class="bi bi-cloud-download text-xs text-[var(--text-muted)] opacity-60"></i>
          <span class="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] opacity-60">{{ $t('sync.shelfToDesktop') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="preview.new > 0"     class="text-xs font-bold text-[var(--status-green)] bg-[var(--status-green)]/10 px-2 py-0.5 rounded-lg">{{ $t('sync.newCount', { count: preview.new }) }}</span>
          <span v-if="preview.updated > 0" class="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-lg">{{ $t('sync.updatedCount', { count: preview.updated }) }}</span>
          <span v-if="preview.deleted > 0" class="text-xs font-bold text-[var(--status-red)] bg-[var(--status-red)]/10 px-2 py-0.5 rounded-lg">{{ $t('sync.deletedCount', { count: preview.deleted }) }}</span>
          <span v-if="pullItems.length === 0" class="text-xs text-[var(--text-muted)] opacity-40">{{ $t('sync.upToDate') }}</span>
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
            {{ item.action === 'new' ? $t('sync.actionNew') : item.action === 'updated' ? $t('sync.actionUpdate') : $t('sync.actionDeleted') }}
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
          <span class="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] opacity-60">{{ $t('sync.desktopToShelf') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="preview.pushNew > 0"     class="text-xs font-bold text-[var(--status-green)] bg-[var(--status-green)]/10 px-2 py-0.5 rounded-lg">{{ $t('sync.newCount', { count: preview.pushNew }) }}</span>
          <span v-if="preview.pushUpdated > 0" class="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-lg">{{ $t('sync.updatedCount', { count: preview.pushUpdated }) }}</span>
          <span v-if="preview.pushDeleted > 0" class="text-xs font-bold text-[var(--status-red)] bg-[var(--status-red)]/10 px-2 py-0.5 rounded-lg">{{ $t('sync.deletedCount', { count: preview.pushDeleted }) }}</span>
          <span v-if="pushItems.length === 0" class="text-xs text-[var(--text-muted)] opacity-40">{{ $t('sync.upToDate') }}</span>
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
            {{ item.action === 'new' ? $t('sync.actionNew') : item.action === 'updated' ? $t('sync.actionUpdate') : $t('sync.actionDeleted') }}
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-[var(--text-main)] truncate">{{ item.title }}</p>
            <p class="text-xs text-[var(--text-muted)] opacity-40 mt-0.5">{{ item.year ?? '–' }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="preview.overflow > 0" class="px-5 py-2 text-center text-xs text-[var(--text-muted)] opacity-40 border-t border-[var(--border-ui)]">
      {{ $t('sync.overflow', { count: preview.overflow }) }}
    </div>

    <!-- Ganze Filme, die nur auf einer Seite bekannt sind: NIE Teil des normalen
         Syncs oben, da "fehlt hier" genauso "noch nie gepullt" heißen kann wie
         "bewusst entfernt". Eigene, bewusst zu bestätigende Auswahl. -->
    <div v-if="hasMirrorCandidates" class="border-t border-[var(--border-ui)] bg-[var(--status-yellow)]/5">
      <div class="px-5 py-3 flex items-start gap-3">
        <i class="bi bi-exclamation-triangle text-[var(--status-yellow)] mt-0.5"></i>
        <div class="min-w-0">
          <p class="text-xs font-black text-[var(--status-yellow)] uppercase tracking-wider mb-1">{{ $t('sync.mirrorWarningTitle') }}</p>
          <p class="text-xs text-[var(--text-muted)] opacity-70">{{ $t('sync.mirrorWarningHint') }}</p>
        </div>
      </div>

      <div v-if="preview.mirrorMissingLocal.length > 0" class="px-5 pb-3">
        <p class="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 mb-2">
          {{ $t('sync.mirrorMissingLocal', { count: preview.mirrorMissingLocal.length }) }}
        </p>
        <div class="max-h-40 overflow-y-auto space-y-1">
          <label v-for="c in preview.mirrorMissingLocal" :key="'ml_' + c.remoteId"
            class="flex items-center gap-2 text-xs cursor-pointer hover:bg-[var(--bg-elevated)] rounded-lg px-2 py-1.5">
            <input type="checkbox" :value="c.remoteId" v-model="selectedPushDeletes">
            <span class="flex-shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--status-yellow)]/10 text-[var(--status-yellow)]">
              {{ $t('sync.notOnDevice') }}
            </span>
            <span class="truncate text-[var(--text-main)] flex-1">{{ c.title }}</span>
            <span class="text-[var(--text-muted)] opacity-40 flex-shrink-0">{{ c.year ?? '–' }}</span>
          </label>
        </div>
      </div>

      <div v-if="preview.mirrorMissingRemote.length > 0" class="px-5 pb-3">
        <p class="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 mb-2">
          {{ $t('sync.mirrorMissingRemote', { count: preview.mirrorMissingRemote.length }) }}
        </p>
        <div class="max-h-40 overflow-y-auto space-y-1">
          <label v-for="c in preview.mirrorMissingRemote" :key="'mr_' + c.remoteId"
            class="flex items-center gap-2 text-xs cursor-pointer hover:bg-[var(--bg-elevated)] rounded-lg px-2 py-1.5">
            <input type="checkbox" :value="c.remoteId" v-model="selectedPullDeletes">
            <span class="flex-shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--status-yellow)]/10 text-[var(--status-yellow)]">
              {{ $t('sync.notOnShelf') }}
            </span>
            <span class="truncate text-[var(--text-main)] flex-1">{{ c.title }}</span>
            <span class="text-[var(--text-muted)] opacity-40 flex-shrink-0">{{ c.year ?? '–' }}</span>
          </label>
        </div>
      </div>

      <div class="px-5 pb-4">
        <button @click="confirmMirrorDeletions"
          :disabled="selectedPushDeletes.length === 0 && selectedPullDeletes.length === 0"
          class="w-full bg-[var(--status-yellow)] hover:opacity-90 disabled:opacity-40 text-black text-xs font-black py-2.5 rounded-xl transition-all">
          {{ $t('sync.mirrorConfirmButton', { count: selectedPushDeletes.length + selectedPullDeletes.length }) }}
        </button>
      </div>
    </div>

    <div class="flex items-center gap-3 px-5 py-4 border-t border-[var(--border-ui)] bg-[var(--bg-app)]">
      <button @click="emit('apply')" :disabled="totalItems === 0"
        class="flex-1 bg-[var(--status-red)] hover:opacity-90 disabled:opacity-40 text-white text-sm font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2">
        <i class="bi bi-arrow-repeat"></i>
        {{ totalItems === 0 ? $t('sync.nothingTodo') : $t('sync.synchronize') }}
      </button>
      <button @click="emit('cancel')" class="px-5 py-3 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
        {{ $t('common.cancel') }}
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PreviewData } from '@/composables/useSyncEngine'

const props = defineProps<{ preview: PreviewData }>()
const emit = defineEmits<{
  apply: []
  cancel: []
  mirrorDelete: [{ pushIds: number[]; pullIds: number[] }]
}>()

const pullItems = computed(() => props.preview.items.filter(i => i.direction === 'pull'))
const pushItems = computed(() => props.preview.items.filter(i => i.direction === 'push'))
const totalItems = computed(() => pullItems.value.length + pushItems.value.length)

const selectedPushDeletes = ref<number[]>([])
const selectedPullDeletes = ref<number[]>([])
const hasMirrorCandidates = computed(() =>
  props.preview.mirrorMissingLocal.length > 0 || props.preview.mirrorMissingRemote.length > 0)

function confirmMirrorDeletions() {
  emit('mirrorDelete', { pushIds: [...selectedPushDeletes.value], pullIds: [...selectedPullDeletes.value] })
  selectedPushDeletes.value = []
  selectedPullDeletes.value = []
}
</script>
