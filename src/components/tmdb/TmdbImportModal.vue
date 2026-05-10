<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="previewForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="emit('cancel')" />
        <div class="relative bg-[var(--bg-app)] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--border-ui)] shadow-2xl flex flex-col">

          <!-- Header -->
          <div class="flex gap-5 p-6 border-b border-[var(--border-ui)] flex-shrink-0">
            <img v-if="previewForm.cover_path" :src="previewForm.cover_path" class="w-14 aspect-[2/3] rounded-xl object-cover flex-shrink-0" />
            <div>
              <h2 class="text-lg font-black text-[var(--text-main)] uppercase tracking-tight mb-1">Vor dem Import bearbeiten</h2>
              <p class="text-xs text-[var(--text-muted)] opacity-60">Daten prüfen und anpassen – dann importieren.</p>
            </div>
          </div>

          <!-- Form -->
          <div class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="field-label">Titel *</label>
                <input v-model="previewForm.title" type="text" class="modal-input" />
              </div>
              <div>
                <label class="field-label">Jahr</label>
                <input v-model.number="previewForm.year" type="number" min="1900" max="2099" class="modal-input" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="field-label">Typ</label>
                <select v-model="previewForm.collection_type" class="modal-input">
                  <option>Film</option>
                  <option>Serie</option>
                  <option>Dokumentation</option>
                  <option>Kurzfilm</option>
                </select>
              </div>
              <div>
                <label class="field-label">Format-Tag</label>
                <select v-model="previewForm.tag" class="modal-input">
                  <option value="">—</option>
                  <option>DVD</option>
                  <option>BluRay</option>
                  <option>4K</option>
                  <option>Streaming</option>
                  <option>Digital</option>
                  <option>VHS</option>
                  <option>Leihe</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="field-label">Genre</label>
                <input v-model="previewForm.genre" type="text" class="modal-input" />
              </div>
              <div>
                <label class="field-label">Regisseur</label>
                <input v-model="previewForm.director" type="text" class="modal-input" />
              </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="field-label">Laufzeit (min)</label>
                <input v-model.number="previewForm.runtime" type="number" class="modal-input" />
              </div>
              <div>
                <label class="field-label">Bewertung (0–10)</label>
                <input v-model.number="previewForm.rating" type="number" min="0" max="10" step="0.1" class="modal-input" />
              </div>
              <div>
                <label class="field-label">FSK</label>
                <input v-model.number="previewForm.rating_age" type="number" class="modal-input" />
              </div>
            </div>
            <div>
              <label class="field-label">Beschreibung</label>
              <textarea v-model="previewForm.overview" rows="4" class="modal-input resize-none" />
            </div>
            <div>
              <label class="field-label">Trailer URL</label>
              <input v-model="previewForm.trailer_url" type="url" class="modal-input" placeholder="https://www.youtube.com/watch?v=..." />
            </div>
            <div>
              <label class="field-label">Hinzugefügt am</label>
              <input v-model="previewForm.created_at" type="date" class="modal-input" />
            </div>
          </div>

          <!-- Footer -->
          <div class="flex gap-3 p-6 border-t border-[var(--border-ui)] flex-shrink-0">
            <button
              @click="emit('confirm')"
              :disabled="importing === previewSource?.id || !previewForm.title"
              class="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
            >
              <span v-if="importing === previewSource?.id" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <i v-else class="bi bi-plus-lg"></i>
              {{ importing === previewSource?.id ? 'Wird importiert...' : 'Importieren' }}
            </button>
            <button
              @click="emit('cancel')"
              class="px-6 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] text-[var(--text-muted)] font-bold py-3 rounded-xl transition-colors text-sm"
            >
              Abbrechen
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { TmdbResult } from '@/composables/useTmdbSearch'

defineProps<{
  previewForm: Record<string, any> | null
  previewSource: TmdbResult | null
  importing: number | null
}>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<style scoped>
@reference "tailwindcss";
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; transform: scale(0.97); }
.field-label {
  @apply block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 opacity-60;
}
.modal-input {
  @apply w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-red-500/50 transition-colors;
}
</style>
