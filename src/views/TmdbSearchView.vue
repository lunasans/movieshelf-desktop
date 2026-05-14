<template>
  <div class="p-8">
    <h1 class="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">TMDb Suche</h1>
    <p class="text-sm text-[var(--text-muted)] opacity-60 mb-6">Film oder Serie in TMDb suchen und zur Sammlung hinzufügen</p>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast" class="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[var(--bg-elevated)] border border-[var(--status-green)]/30 rounded-2xl px-5 py-3.5 shadow-xl">
        <i class="bi bi-check-circle-fill text-[var(--status-green)] text-lg"></i>
        <span class="text-sm font-bold text-[var(--text-main)]">{{ toast }}</span>
      </div>
    </Transition>

    <!-- No API key -->
    <div v-if="!canSearch" class="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-ui)] p-8 text-center">
      <i class="bi bi-key text-4xl text-[var(--text-muted)] opacity-30 block mb-4"></i>
      <p class="text-sm font-bold text-[var(--text-main)] mb-1">Kein TMDb API Key hinterlegt</p>
      <p class="text-xs text-[var(--text-muted)] opacity-60 max-w-xs mx-auto mb-4">
        Bitte hinterlege einen TMDb API Key in den Einstellungen oder verbinde dich mit deiner MovieShelf.
      </p>
      <router-link to="/settings"
        class="inline-block px-5 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-ui)] rounded-xl text-xs font-black uppercase tracking-widest text-[var(--text-main)] hover:border-red-500/40 transition-all">
        Zu den Einstellungen →
      </router-link>
    </div>

    <template v-else>
      <!-- Search mode toggle -->
      <div class="flex gap-2 mb-4">
        <button
          @click="searchMode = 'movie'"
          class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          :class="searchMode === 'movie'
            ? 'bg-[var(--status-red)] text-white'
            : 'bg-[var(--bg-card)] border border-[var(--border-ui)] text-[var(--text-muted)] hover:border-red-500/40'"
        >
          <i class="bi bi-film mr-1.5"></i>Film
        </button>
        <button
          @click="searchMode = 'tv'"
          class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          :class="searchMode === 'tv'
            ? 'bg-[var(--status-red)] text-white'
            : 'bg-[var(--bg-card)] border border-[var(--border-ui)] text-[var(--text-muted)] hover:border-red-500/40'"
        >
          <i class="bi bi-tv mr-1.5"></i>Serie
        </button>
      </div>

      <!-- Search bar -->
      <div class="flex gap-3 mb-6">
        <input
          v-model="query"
          @keyup.enter="search"
          type="text"
          :placeholder="searchMode === 'tv' ? 'Serientitel eingeben...' : 'Filmtitel eingeben...'"
          class="flex-1 bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-red-500/50 transition-colors"
        />
        <button @click="search" :disabled="loading"
          class="bg-[var(--status-red)] hover:opacity-90 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl transition-all text-sm">
          Suchen
        </button>
      </div>

      <!-- In-collection toggle -->
      <div class="flex items-center justify-end gap-3 mb-6 bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl px-5 py-3">
        <span class="text-sm font-bold text-[var(--text-main)] opacity-70">In Sammlung aufnehmen</span>
        <button
          @click="importToCollection = !importToCollection"
          class="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none"
          :class="importToCollection ? 'bg-[var(--status-red)]' : 'bg-[var(--bg-elevated)] border border-[var(--border-ui)]'"
        >
          <div class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200"
            :class="importToCollection ? 'translate-x-6' : 'translate-x-0'" />
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-16">
        <div class="w-8 h-8 border-2 border-[var(--status-red)] border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-[var(--status-red-bg)] border border-[var(--status-red)]/20 rounded-2xl p-4 mb-6">
        <p class="text-[var(--status-red)] text-sm font-bold">{{ error }}</p>
      </div>

      <!-- Results -->
      <TmdbResultGrid
        v-else
        :results="results"
        :importedIds="importedIds"
        :importing="importing"
        :previewLoading="previewLoading"
        :previewSource="previewSource"
        :listPickerFor="listPickerFor"
        :lists="listStore.lists"
        @openPreview="openPreview"
        @setListPicker="listPickerFor = $event"
        @addToList="addToList"
      />
    </template>

    <TmdbImportModal
      :previewForm="previewForm"
      :previewSource="previewSource"
      :importing="importing"
      :tmdbSeasons="tmdbSeasons"
      :selectedSeasons="selectedSeasons"
      @update:selectedSeasons="selectedSeasons = $event"
      @confirm="confirmImport"
      @cancel="previewForm = null; previewSource = null"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useListStore } from '@/stores/lists'
import { useTmdbSearch } from '@/composables/useTmdbSearch'
import TmdbResultGrid  from '@/components/tmdb/TmdbResultGrid.vue'
import TmdbImportModal from '@/components/tmdb/TmdbImportModal.vue'

const listStore = useListStore()
const {
  query, searchMode, results, loading, importing, importedIds, error, toast,
  importToCollection, listPickerFor, previewForm, previewSource, previewLoading,
  tmdbSeasons, selectedSeasons,
  canSearch, search, openPreview, confirmImport, addToList,
} = useTmdbSearch()

onMounted(() => listStore.fetchLists())
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translateY(12px); }
</style>
