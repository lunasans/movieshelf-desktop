<template>
  <Teleport to="body">
    <Transition name="modal">
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="emit('cancel')" />
        <div class="relative bg-[var(--bg-app)] w-full max-w-2xl max-h-[90vh] rounded-3xl border border-[var(--border-ui)] shadow-2xl flex flex-col overflow-hidden">

          <!-- Header -->
          <div class="p-6 border-b border-[var(--border-ui)] flex-shrink-0">
            <h2 class="text-lg font-black text-[var(--text-main)] uppercase tracking-tight mb-1 truncate">{{ title }}</h2>
            <p class="text-xs text-[var(--text-muted)] opacity-60">{{ $t('movieDetail.backfillHint') }}</p>
          </div>

          <!-- Season list -->
          <div class="p-6 overflow-y-auto flex-1">
            <div v-if="loading" class="flex justify-center py-12">
              <div class="w-8 h-8 border-2 border-[var(--status-red)] border-t-transparent rounded-full animate-spin"></div>
            </div>

            <div v-else-if="error" class="bg-[var(--status-red-bg)] border border-[var(--status-red)]/20 rounded-2xl p-4">
              <p class="text-[var(--status-red)] text-sm font-bold">{{ error }}</p>
            </div>

            <div v-else class="space-y-2">
              <label
                v-for="season in seasons"
                :key="season.season_number"
                class="group flex items-center gap-4 p-3 rounded-2xl border border-[var(--border-ui)] bg-[var(--bg-card)] transition-all"
                :class="isExisting(season.season_number) ? 'opacity-50' : 'hover:border-red-500/40 cursor-pointer'"
              >
                <input
                  type="checkbox"
                  :value="season.season_number"
                  v-model="selected"
                  :disabled="isExisting(season.season_number)"
                  class="w-4 h-4 accent-red-600 rounded flex-shrink-0 disabled:opacity-40"
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
                <span
                  v-if="isExisting(season.season_number)"
                  class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-[var(--status-green)] bg-[var(--status-green)]/10 border border-[var(--status-green)]/20 flex-shrink-0"
                >
                  {{ $t('movieDetail.seasonOwned') }}
                </span>
              </label>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex gap-3 p-6 border-t border-[var(--border-ui)] flex-shrink-0">
            <button
              @click="emit('confirm', selected.map(Number))"
              :disabled="importing || selected.length === 0"
              class="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
            >
              <span v-if="importing" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <i v-else class="bi bi-download"></i>
              {{ importing ? $t('tmdb.importing') : $t('tmdb.importSeasonsCount', { count: selected.length }) }}
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
import { ref } from 'vue'
import type { SeasonOption } from '@/composables/useSeasonImport'

const props = defineProps<{
  title: string
  seasons: SeasonOption[]
  existing: number[]
  loading: boolean
  importing: boolean
  error: string | null
}>()

const emit = defineEmits<{
  confirm: [seasonNumbers: number[]]
  cancel: []
}>()

const selected = ref<number[]>([])

function isExisting(n: number) {
  return props.existing.includes(Number(n))
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; transform: scale(0.97); }
</style>
