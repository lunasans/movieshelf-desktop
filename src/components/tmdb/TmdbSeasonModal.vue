<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="seriesForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="emit('cancel')" />
        <div class="relative bg-[var(--bg-app)] w-full max-w-2xl max-h-[90vh] rounded-3xl border border-[var(--border-ui)] shadow-2xl flex flex-col overflow-hidden">

          <!-- Header -->
          <div class="flex gap-5 p-6 border-b border-[var(--border-ui)] flex-shrink-0">
            <img v-if="seriesForm.cover_path" :src="seriesForm.cover_path" class="w-14 aspect-[2/3] rounded-xl object-cover flex-shrink-0" />
            <div class="min-w-0">
              <h2 class="text-lg font-black text-[var(--text-main)] uppercase tracking-tight mb-1 truncate">{{ seriesForm.title }}</h2>
              <p class="text-xs text-[var(--text-muted)] opacity-60">{{ $t('tmdb.seasonModalHint') }}</p>
            </div>
          </div>

          <!-- Season list -->
          <div class="p-6 overflow-y-auto flex-1">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">
                {{ $t('tmdb.seasonsAvailable', { count: tmdbSeasons.length }) }}
              </span>
              <div class="flex gap-2">
                <button type="button" @click="selectAllSeasons"
                  class="text-[10px] font-black uppercase tracking-widest text-[var(--status-red)] opacity-80 hover:opacity-100 transition-opacity">
                  {{ $t('tmdb.selectAllSeasons') }}
                </button>
                <span class="text-[var(--border-ui)]">·</span>
                <button type="button" @click="emit('update:selectedSeasons', [])"
                  class="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60 hover:opacity-100 transition-opacity">
                  {{ $t('tmdb.clearSeasons') }}
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <label
                v-for="season in tmdbSeasons"
                :key="season.season_number"
                class="group flex items-center gap-4 p-3 rounded-2xl border border-[var(--border-ui)] bg-[var(--bg-card)] hover:border-red-500/40 transition-all cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="season.season_number"
                  v-model="localSelectedSeasons"
                  class="w-4 h-4 accent-red-600 rounded flex-shrink-0"
                />
                <div class="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--bg-elevated)] border border-[var(--border-ui)]">
                  <img v-if="season.poster_path" :src="`https://image.tmdb.org/t/p/w92${season.poster_path}`" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <i class="bi bi-image text-[var(--text-muted)] opacity-20"></i>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-bold text-[var(--text-main)] truncate">{{ season.name }}</div>
                  <div class="text-xs text-[var(--text-muted)] opacity-50">{{ $t('movieDetail.episodesCount', { count: season.episode_count }) }}</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex gap-3 p-6 border-t border-[var(--border-ui)] flex-shrink-0">
            <button
              @click="emit('confirm')"
              :disabled="importing === previewSource?.id || selectedSeasons.length === 0"
              class="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
            >
              <span v-if="importing === previewSource?.id" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <i v-else class="bi bi-download"></i>
              {{ importing === previewSource?.id ? $t('tmdb.importing') : $t('tmdb.importSeasonsCount', { count: selectedSeasons.length }) }}
            </button>
            <button
              @click="emit('cancel')"
              class="px-6 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] text-[var(--text-muted)] font-bold py-3 rounded-xl transition-colors text-sm"
            >
              {{ $t('common.cancel') }}
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TmdbResult, TmdbSeason } from '@/composables/useTmdbSearch'

const props = defineProps<{
  seriesForm: Record<string, any> | null
  previewSource: TmdbResult | null
  importing: number | null
  tmdbSeasons: TmdbSeason[]
  selectedSeasons: number[]
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
  'update:selectedSeasons': [value: number[]]
}>()

const localSelectedSeasons = computed({
  get: () => props.selectedSeasons,
  set: (v) => emit('update:selectedSeasons', v),
})

function selectAllSeasons() {
  emit('update:selectedSeasons', props.tmdbSeasons.map(s => s.season_number))
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; transform: scale(0.97); }
</style>
