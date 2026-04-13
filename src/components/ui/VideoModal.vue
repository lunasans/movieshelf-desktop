<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-black/90 backdrop-blur-md"
          @click="$emit('close')"
        ></div>

        <!-- Content Container -->
        <div class="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-[var(--border-ui)] animate-scale-in">
          <!-- Close Button -->
          <button 
            @click="$emit('close')"
            class="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all hover:scale-110"
          >
            <i class="bi bi-x-lg text-xl"></i>
          </button>

          <!-- Iframe -->
          <iframe 
            v-if="videoUrl"
            :src="videoUrl"
            class="w-full h-full"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
          
          <div v-else class="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-20 gap-4">
            <i class="bi bi-exclamation-circle text-4xl"></i>
            <p class="font-bold">Trailer konnte nicht geladen werden.</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  show: boolean
  videoUrl: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

// Handle ESC key
const handleEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', handleEsc))
onUnmounted(() => window.removeEventListener('keydown', handleEsc))
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.animate-scale-in {
  animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
