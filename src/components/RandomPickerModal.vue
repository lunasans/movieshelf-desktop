<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl shadow-2xl w-80 overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--border-ui)]">
          <span class="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">{{ $t('movies.randomTitle') }}</span>
          <button @click="$emit('close')" class="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-16">
          <div class="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <!-- No result -->
        <div v-else-if="!movie" class="text-center py-16 px-5">
          <i class="bi bi-film text-3xl text-[var(--text-muted)] opacity-30 block mb-3"></i>
          <p class="text-sm text-[var(--text-muted)] opacity-60">{{ $t('movies.noneFound') }}</p>
        </div>

        <!-- Movie result -->
        <div v-else>
          <div class="aspect-[2/1] overflow-hidden relative">
            <img
              v-if="coverUrl"
              :src="coverUrl"
              :alt="(movie.title as string)"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full bg-gradient-to-br from-[var(--bg-app)] to-[var(--bg-sidebar)] flex items-center justify-center">
              <i class="bi bi-film text-5xl text-[var(--text-muted)] opacity-20"></i>
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            <div class="absolute bottom-3 left-4 right-4">
              <p class="text-white font-black text-base leading-tight truncate">{{ movie.title }}</p>
              <p class="text-white/60 text-xs font-bold mt-0.5">
                {{ movie.year }}<span v-if="movie.runtime"> · {{ movie.runtime }} min</span>
              </p>
            </div>
          </div>

          <div class="px-5 py-4 space-y-3">
            <p v-if="movie.genre" class="text-[11px] text-[var(--text-muted)] font-bold truncate">{{ movie.genre }}</p>
            <p v-if="movie.overview" class="text-xs text-[var(--text-muted)] opacity-80 line-clamp-3 leading-relaxed">
              {{ movie.overview }}
            </p>

            <div class="flex gap-2 pt-1">
              <button
                @click="roll"
                class="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-widest py-2 rounded-xl transition-colors"
              >
                <i class="bi bi-dice-6-fill"></i> {{ $t('movies.rollAgain') }}
              </button>
              <router-link
                :to="'/movies/' + movie.id"
                @click="$emit('close')"
                class="flex-1 flex items-center justify-center gap-2 bg-[var(--bg-app)] hover:bg-[var(--bg-sidebar)] text-[var(--text-main)] text-xs font-black uppercase tracking-widest py-2 rounded-xl border border-[var(--border-ui)] transition-colors"
              >
                <i class="bi bi-arrow-right-circle-fill"></i> {{ $t('movies.detail') }}
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'

const props = defineProps<{
  collectionType?: string
  genre?: string
}>()

defineEmits<{ close: [] }>()

const { resolveMediaUrl } = useApi()

const loading = ref(false)
const movie   = ref<Record<string, unknown> | null>(null)

const coverUrl = computed(() =>
  movie.value
    ? resolveMediaUrl(
        (movie.value.cover_url as string | null) || (movie.value.cover_path as string | null),
        (movie.value.remote_id as number | undefined) ?? undefined,
      )
    : null,
)

async function roll() {
  loading.value = true
  movie.value = null
  try {
    const filters: Record<string, string> = {}
    if (props.collectionType) filters.collectionType = props.collectionType
    if (props.genre)          filters.genre          = props.genre
    movie.value = (await window.electron.db.movies.random(filters)) as Record<string, unknown> | null
  } finally {
    loading.value = false
  }
}

onMounted(roll)
</script>
