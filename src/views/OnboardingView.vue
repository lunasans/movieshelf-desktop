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

      <!-- Step 0: Welcome + Mini-Anleitung -->
      <div v-if="step === 0" class="text-center space-y-5">
        <img src="/logo.png" alt="MovieShelf" class="w-64 max-w-full mx-auto mb-2 drop-shadow-[0_8px_24px_rgba(220,38,38,0.25)]" />
        <p class="text-[var(--text-muted)] opacity-70 leading-relaxed">
          {{ $t('onboarding.tagline') }}
        </p>

        <div class="text-left bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-5 space-y-3">
          <div class="flex items-start gap-3">
            <i class="bi bi-search text-red-500 mt-0.5 flex-shrink-0"></i>
            <p class="text-sm text-[var(--text-main)] opacity-80 leading-snug">{{ $t('onboarding.featureTmdb') }}</p>
          </div>
          <div class="flex items-start gap-3">
            <i class="bi bi-collection-fill text-red-500 mt-0.5 flex-shrink-0"></i>
            <p class="text-sm text-[var(--text-main)] opacity-80 leading-snug">{{ $t('onboarding.featureOrganize') }}</p>
          </div>
          <div class="flex items-start gap-3">
            <i class="bi bi-archive text-red-500 mt-0.5 flex-shrink-0"></i>
            <p class="text-sm text-[var(--text-main)] opacity-80 leading-snug">{{ $t('onboarding.featureBackup') }}</p>
          </div>
          <div class="flex items-start gap-3">
            <i class="bi bi-cloud-arrow-up text-red-500 mt-0.5 flex-shrink-0"></i>
            <p class="text-sm text-[var(--text-main)] opacity-80 leading-snug">{{ $t('onboarding.featureSync') }}</p>
          </div>
        </div>

        <div class="pt-2">
          <button @click="step++" class="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl transition-colors uppercase tracking-widest">
            {{ $t('onboarding.start') }}
          </button>
        </div>
      </div>

      <!-- Step 1: Modus wählen (Standalone / Cloud) -->
      <div v-else-if="step === 1" class="space-y-5">
        <div class="text-center">
          <h2 class="text-xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">{{ $t('onboarding.modeTitle') }}</h2>
          <p class="text-sm text-[var(--text-muted)] opacity-70">{{ $t('onboarding.modeHint') }}</p>
        </div>

        <button
          @click="selectedMode = 'standalone'"
          class="w-full text-left flex items-start gap-4 rounded-2xl border p-4 transition-all"
          :class="selectedMode === 'standalone'
            ? 'bg-red-600/10 border-red-500/50'
            : 'bg-[var(--bg-card)] border-[var(--border-ui)] hover:border-red-500/30'"
        >
          <i class="bi bi-pc-display text-xl mt-0.5 flex-shrink-0" :class="selectedMode === 'standalone' ? 'text-red-500' : 'text-[var(--text-muted)]'"></i>
          <span class="min-w-0">
            <span class="block text-sm font-black text-[var(--text-main)] uppercase tracking-tight">{{ $t('onboarding.modeStandalone') }}</span>
            <span class="block text-xs text-[var(--text-muted)] opacity-70 mt-1 leading-snug">{{ $t('onboarding.modeStandaloneHint') }}</span>
          </span>
          <i v-if="selectedMode === 'standalone'" class="bi bi-check-circle-fill text-red-500 ml-auto flex-shrink-0"></i>
        </button>

        <button
          @click="selectedMode = 'online'"
          class="w-full text-left flex items-start gap-4 rounded-2xl border p-4 transition-all"
          :class="selectedMode === 'online'
            ? 'bg-red-600/10 border-red-500/50'
            : 'bg-[var(--bg-card)] border-[var(--border-ui)] hover:border-red-500/30'"
        >
          <i class="bi bi-cloud-fill text-xl mt-0.5 flex-shrink-0" :class="selectedMode === 'online' ? 'text-red-500' : 'text-[var(--text-muted)]'"></i>
          <span class="min-w-0">
            <span class="block text-sm font-black text-[var(--text-main)] uppercase tracking-tight">{{ $t('onboarding.modeCloud') }}</span>
            <span class="block text-xs text-[var(--text-muted)] opacity-70 mt-1 leading-snug">{{ $t('onboarding.modeCloudHint') }}</span>
          </span>
          <i v-if="selectedMode === 'online'" class="bi bi-check-circle-fill text-red-500 ml-auto flex-shrink-0"></i>
        </button>

        <p class="text-center text-xs text-[var(--text-muted)] opacity-70">
          {{ $t('onboarding.noAccount') }}
          <a href="https://movieshelf.info" target="_blank" class="text-red-400 hover:text-red-500 font-bold hover:underline">
            {{ $t('onboarding.registerLink') }}
          </a>
        </p>

        <div class="flex gap-3 pt-2">
          <button @click="step--" class="flex-1 bg-[var(--bg-card)] border border-[var(--border-ui)] text-[var(--text-muted)] font-bold py-2.5 rounded-xl transition-colors hover:border-red-500/30 text-sm">
            {{ $t('common.back') }}
          </button>
          <button @click="saveMode" :disabled="saving" class="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-2.5 rounded-xl transition-colors uppercase tracking-widest text-sm">
            {{ saving ? '…' : $t('onboarding.next') }}
          </button>
        </div>
      </div>

      <!-- Step 2: TMDb API Key -->
      <div v-else-if="step === 2" class="space-y-5">
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

      <!-- Step 3: Done -->
      <div v-else-if="step === 3" class="text-center space-y-4">
        <div class="text-6xl mb-6">✅</div>
        <h2 class="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">{{ $t('onboarding.doneTitle') }}</h2>
        <p class="text-sm text-[var(--text-muted)] opacity-70 leading-relaxed">
          {{ settings.mode === 'online' ? $t('onboarding.doneHintCloud') : $t('onboarding.doneHint') }}
        </p>
        <div class="pt-4 space-y-3">
          <button @click="finish" class="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl transition-colors uppercase tracking-widest">
            {{ $t('onboarding.toCollection') }}
          </button>
          <button v-if="settings.mode === 'online'" @click="finishToSettings" class="w-full text-center text-xs text-[var(--text-muted)] opacity-60 hover:opacity-100 transition-opacity font-bold">
            {{ $t('onboarding.connectNow') }}
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

const step         = ref(0)
const totalSteps   = 4
const selectedMode = ref<'standalone' | 'online'>(settings.mode)
const tmdbKey      = ref(settings.tmdbApiKey)
const saving       = ref(false)

async function saveMode() {
  saving.value = true
  try {
    settings.mode = selectedMode.value
    await settings.save()
    step.value++
  } finally {
    saving.value = false
  }
}

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

function finishToSettings() {
  localStorage.setItem('onboarding_done', '1')
  router.replace('/settings')
}
</script>
