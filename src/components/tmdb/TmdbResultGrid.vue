<template>
  <div class="grid grid-cols-4 xl:grid-cols-6 gap-4">
    <div v-for="result in results" :key="result.id" class="group relative">

      <div
        class="relative aspect-[2/3] rounded-2xl overflow-hidden bg-[var(--bg-card)] border transition-all duration-300"
        :class="importedIds.has(result.id)
          ? 'border-[var(--status-green)]/50'
          : 'border-[var(--border-ui)] hover:border-[var(--status-red)]/50 group-hover:scale-105'"
      >
        <img
          v-if="result.poster_path"
          :src="`https://image.tmdb.org/t/p/w300${result.poster_path}`"
          :alt="result.title"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full flex items-center justify-center">
          <i class="bi bi-camera-video text-[var(--text-muted)] opacity-20 text-3xl"></i>
        </div>

        <!-- Imported overlay -->
        <div v-if="importedIds.has(result.id)" class="absolute inset-0 bg-black/50 flex items-center justify-center">
          <i class="bi bi-check-circle-fill text-[var(--status-green)] text-4xl"></i>
        </div>

        <!-- Hover overlay -->
        <div v-else class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-stretch justify-end p-2 gap-1.5">
          <span v-if="importing === result.id || (previewLoading && previewSource?.id === result.id)"
            class="text-[10px] font-black text-white uppercase tracking-widest flex items-center justify-center gap-1 py-1">
            <span class="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></span>
            Lädt...
          </span>
          <template v-else>
            <button
              @click.stop="emit('openPreview', result)"
              class="w-full bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-colors"
            >
              <i class="bi bi-plus-lg mr-1"></i>Sammlung
            </button>
            <button
              @click.stop="emit('setListPicker', listPickerFor === result.id ? null : result.id)"
              class="w-full bg-white/20 hover:bg-white/30 text-white text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-colors"
            >
              <i class="bi bi-collection-fill mr-1"></i>Liste
            </button>
          </template>
        </div>
      </div>

      <!-- List picker dropdown -->
      <div
        v-if="listPickerFor === result.id"
        class="absolute z-50 top-full mt-1 left-0 right-0 bg-[var(--bg-elevated)] border border-[var(--border-ui)] rounded-xl shadow-xl overflow-hidden"
      >
        <div v-if="lists.length === 0" class="px-3 py-2 text-xs text-[var(--text-muted)] opacity-50">Keine Listen vorhanden</div>
        <button
          v-for="list in lists"
          :key="list.id"
          @click.stop="emit('addToList', result, list.id)"
          class="w-full text-left px-3 py-2 text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors truncate"
        >
          <i class="bi bi-collection-fill text-red-500 mr-2"></i>{{ list.name }}
        </button>
      </div>

      <p class="mt-2 text-xs font-bold truncate"
        :class="importedIds.has(result.id) ? 'text-[var(--status-green)]' : 'text-[var(--text-main)] opacity-70'">
        {{ result.title }}
      </p>
      <p class="text-[10px] text-[var(--text-muted)] opacity-50">{{ result.release_date?.slice(0, 4) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TmdbResult } from '@/composables/useTmdbSearch'

defineProps<{
  results: TmdbResult[]
  importedIds: Set<number>
  importing: number | null
  previewLoading: boolean
  previewSource: TmdbResult | null
  listPickerFor: number | null
  lists: Array<{ id: number; name: string }>
}>()

const emit = defineEmits<{
  openPreview: [result: TmdbResult]
  setListPicker: [id: number | null]
  addToList: [result: TmdbResult, listId: number]
}>()
</script>
