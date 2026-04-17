<template>
  <div class="p-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">Listen</h1>
        <p class="text-sm text-[var(--text-muted)] opacity-60">{{ store.lists.length }} benutzerdefinierte Listen</p>
      </div>
      <button
        @click="showCreate = true"
        class="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
      >
        <i class="bi bi-plus-lg"></i> Neue Liste
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Grid -->
    <div v-else-if="store.lists.length > 0" class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
      <div
        v-for="list in store.lists"
        :key="list.id"
        class="group relative bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-5 cursor-pointer hover:border-red-500/50 hover:scale-[1.02] transition-all shadow-[var(--shadow-main)]"
        @click="router.push(`/lists/${list.id}`)"
      >
        <div class="flex items-start justify-between gap-3 mb-4">
          <div class="w-10 h-10 bg-red-600/10 border border-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <i class="bi bi-collection-fill text-red-500 text-lg"></i>
          </div>
          <!-- Actions (visible on hover) -->
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              @click.stop="startRename(list)"
              class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors text-sm"
              title="Umbenennen"
            >
              <i class="bi bi-pencil-fill"></i>
            </button>
            <button
              @click.stop="confirmDelete(list)"
              class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-600/10 text-[var(--text-muted)] hover:text-red-500 transition-colors text-sm"
              title="Löschen"
            >
              <i class="bi bi-trash3-fill"></i>
            </button>
          </div>
        </div>

        <p class="font-black text-[var(--text-main)] text-sm uppercase tracking-tight truncate">{{ list.name }}</p>
        <p class="text-[var(--text-muted)] text-xs mt-1 opacity-60">{{ list.movie_count }} {{ list.movie_count === 1 ? 'Film' : 'Filme' }}</p>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="text-center py-20 text-[var(--text-muted)] opacity-40 text-sm">
      <i class="bi bi-collection text-4xl block mb-4 opacity-30"></i>
      Noch keine Listen vorhanden.
    </div>

    <!-- Create Modal -->
    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="showCreate = false">
      <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 class="text-lg font-black text-[var(--text-main)] uppercase tracking-tight mb-4">Neue Liste</h2>
        <input
          v-model="newListName"
          @keyup.enter="submitCreate"
          type="text"
          placeholder="Listenname..."
          class="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-red-500/50 transition-colors mb-4"
          autofocus
        />
        <div class="flex gap-2">
          <button @click="submitCreate" :disabled="!newListName.trim()" class="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
            Erstellen
          </button>
          <button @click="showCreate = false; newListName = ''" class="flex-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-sidebar)] text-[var(--text-muted)] font-bold py-2.5 rounded-xl transition-colors text-sm">
            Abbrechen
          </button>
        </div>
      </div>
    </div>

    <!-- Rename Modal -->
    <div v-if="renameTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="renameTarget = null">
      <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 class="text-lg font-black text-[var(--text-main)] uppercase tracking-tight mb-4">Liste umbenennen</h2>
        <input
          v-model="renameValue"
          @keyup.enter="submitRename"
          type="text"
          class="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-red-500/50 transition-colors mb-4"
          autofocus
        />
        <div class="flex gap-2">
          <button @click="submitRename" :disabled="!renameValue.trim()" class="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
            Speichern
          </button>
          <button @click="renameTarget = null" class="flex-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-sidebar)] text-[var(--text-muted)] font-bold py-2.5 rounded-xl transition-colors text-sm">
            Abbrechen
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm Modal -->
    <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="deleteTarget = null">
      <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 class="text-lg font-black text-[var(--text-main)] uppercase tracking-tight mb-2">Liste löschen?</h2>
        <p class="text-sm text-[var(--text-muted)] mb-6">„<span class="text-[var(--text-main)] font-bold">{{ deleteTarget.name }}</span>" wird unwiderruflich gelöscht. Die Filme selbst bleiben erhalten.</p>
        <div class="flex gap-2">
          <button @click="submitDelete" class="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
            Löschen
          </button>
          <button @click="deleteTarget = null" class="flex-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-sidebar)] text-[var(--text-muted)] font-bold py-2.5 rounded-xl transition-colors text-sm">
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useListStore, type MovieList } from '@/stores/lists'

const router = useRouter()
const store = useListStore()

const showCreate = ref(false)
const newListName = ref('')

const renameTarget = ref<MovieList | null>(null)
const renameValue = ref('')

const deleteTarget = ref<MovieList | null>(null)

onMounted(() => store.fetchLists())

async function submitCreate() {
  if (!newListName.value.trim()) return
  await store.createList(newListName.value)
  newListName.value = ''
  showCreate.value = false
}

function startRename(list: MovieList) {
  renameTarget.value = list
  renameValue.value = list.name
}

async function submitRename() {
  if (!renameTarget.value || !renameValue.value.trim()) return
  await store.renameList(renameTarget.value.id, renameValue.value)
  renameTarget.value = null
}

function confirmDelete(list: MovieList) {
  deleteTarget.value = list
}

async function submitDelete() {
  if (!deleteTarget.value) return
  await store.deleteList(deleteTarget.value.id)
  deleteTarget.value = null
}
</script>
