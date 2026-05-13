<template>
  <Teleport to="body">
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-md">
      <!-- Count badge -->
      <span class="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
        {{ count }} ausgewählt
      </span>

      <div class="w-px h-5 bg-[var(--border-ui)]"></div>

      <!-- Tag select -->
      <div class="relative" v-if="showTagMenu">
        <div class="absolute bottom-full mb-2 left-0 bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl shadow-xl overflow-hidden">
          <button
            v-for="tag in TAGS"
            :key="tag"
            @click="applyTag(tag)"
            class="block w-full text-left px-4 py-2 text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors"
          >{{ tag }}</button>
        </div>
      </div>

      <button
        @click="showTagMenu = !showTagMenu"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest transition-colors"
      >
        <i class="bi bi-tag-fill"></i> Tag
      </button>

      <button
        @click="confirmDelete"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest transition-colors"
      >
        <i class="bi bi-trash3-fill"></i> Löschen
      </button>

      <button
        @click="$emit('close')"
        class="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
        title="Auswahl beenden"
      >
        <i class="bi bi-x-lg text-sm"></i>
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ count: number }>()

const emit = defineEmits<{
  'bulk-delete': []
  'bulk-tag':    [tag: string]
  'close':       []
}>()

const showTagMenu = ref(false)

const TAGS = ['DVD', 'BluRay', '4K', 'Streaming', 'Digital', 'VHS', 'Leihe']

function applyTag(tag: string) {
  showTagMenu.value = false
  emit('bulk-tag', tag)
}

function confirmDelete() {
  if (confirm(`Alle ausgewählten Einträge wirklich löschen?`)) {
    emit('bulk-delete')
  }
}
</script>
