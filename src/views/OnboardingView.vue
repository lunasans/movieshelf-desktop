<template>
  <div class="min-h-screen flex items-center justify-center p-8">
    <div class="w-full max-w-md">
      <!-- Progress dots -->
      <div class="flex items-center justify-center gap-2 mb-10">
        <div
          v-for="i in totalSteps"
          :key="i"
          :class="['w-2 h-2 rounded-full transition-all', i - 1 === step ? 'bg-red-500 w-6' : 'bg-[var(--border-ui)]']"
        ></div>
      </div>

      <!-- Step 0: Welcome -->
      <div v-if="step === 0" class="text-center space-y-4">
        <div class="text-6xl mb-6">🎬</div>
        <h1 class="text-3xl font-black text-[var(--text-main)] uppercase tracking-tight">
          {{ $t('onboarding.welcome') }}<br>MovieShelf
        </h1>
        <p class="text-[var(--text-muted)] opacity-70 leading-relaxed">
          {{ $t('onboarding.tagline') }}
        </p>
        <div class="pt-6">
          <button @click="step++" class="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl transition-colors uppercase tracking-widest">
            {{ $t('onboarding.start') }}
          </button>
        </div>
      </div>

      <!-- Step 1: TMDb API Key -->
      <div v-else-if="step === 1" class="space-y-5">
        <div>
          <h2 class="text-xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">{{ $t('onboarding.tmdbTitle') }}</h2>
          <p class="text-sm text-[var(--text-muted)] opacity-70 leading-relaxed">
            {{ $t('onboarding.tmdbHint') }}<br>
            {{ $t('onboarding.tmdbFree') }} <span class="text-red-400 font-bold">themoviedb.org</span>.
          </p>
        </div>
        <div>
          <input
            v-model="tmdbKey"
            type="password"
            :placeholder="$t('onboarding.tmdbPlaceholder')"
            class="w-full bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-red-500/50 transition-colors"
          />
        </div>
        <div class="flex gap-3 pt-2">
          <button @click="step--" class="flex-1 bg-[var(--bg-card)] border border-[var(--border-ui)] text-[var(--text-muted)] font-bold py-2.5 rounded-xl transition-colors hover:border-red-500/30 text-sm">
            {{ $t('common.back') }}
          </button>
          <button @click="saveTmdb" :disabled="saving" class="flex-2 flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-2.5 rounded-xl transition-colors uppercase tracking-widest text-sm">
            {{ saving ? '…' : $t('common.save') }}
          </button>
        </div>
        <button @click="step++" class="w-full text-center text-xs text-[var(--text-muted)] opacity-50 hover:opacity-80 transition-opacity">
          {{ $t('onboarding.skip') }}
        </button>
      </div>

      <!-- Step 2: Done -->
      <div v-else-if="step === 2" class="text-center space-y-4">
        <div class="text-6xl mb-6">✅</div>
        <h2 class="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">{{ $t('onboarding.doneTitle') }}</h2>
        <p class="text-sm text-[var(--text-muted)] opacity-70 leading-relaxed">
          {{ $t('onboarding.doneHint') }}
        </p>
        <div class="pt-4">
          <button @click="finish" class="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl transition-colors uppercase tracking-widest">
            {{ $t('onboarding.toCollection') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'

const router   = useRouter()
const settings = useSettingsStore()

const step       = ref(0)
const totalSteps = 3
const tmdbKey    = ref(settings.tmdbApiKey)
const saving     = ref(false)

async function saveTmdb() {
  saving.value = true
  try {
    settings.tmdbApiKey = tmdbKey.value
    await settings.save()
    step.value++
  } finally {
    saving.value = false
  }
}

function finish() {
  localStorage.setItem('onboarding_done', '1')
  router.replace('/movies')
}
</script>
