<template>
  <div class="p-8 max-w-4xl mx-auto">
    <h1 class="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight mb-1">Einstellungen</h1>
    <p class="text-sm text-[var(--text-muted)] opacity-60 mb-8">Verbindung zu deiner MovieShelf konfigurieren</p>

    <!-- Design Section -->
    <div class="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-ui)] p-6 mb-4 shadow-[var(--shadow-main)]">
      <h2 class="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] opacity-40 mb-4">Design</h2>
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-bold text-[var(--text-main)]">Erscheinungsbild</p>
          <p class="text-xs text-[var(--text-muted)] opacity-60">Wähle zwischen hellem, dunklem oder System-Design.</p>
        </div>
        <ThemeSwitcher />
      </div>
    </div>

    <!-- Software Update Section -->
    <div class="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-ui)] p-6 mb-4 shadow-[var(--shadow-main)]">
      <h2 class="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] opacity-40 mb-4">Software Update</h2>
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-bold text-[var(--text-main)]">Version {{ settings.appVersion }}</p>
          <div v-if="settings.updateAvailable" class="flex items-center gap-2 mt-1">
            <span class="flex h-2 w-2 rounded-full bg-[var(--status-green)] animate-pulse"></span>
            <p class="text-xs text-[var(--status-green)] font-black uppercase tracking-widest">Update verfügbar: v{{ settings.newestVersion }}</p>
          </div>
          <p v-else class="text-xs text-[var(--text-muted)] opacity-60 mt-1">Deine App ist auf dem neuesten Stand.</p>
        </div>
        <button 
          @click="handleUpdateCheck" 
          :disabled="checkingUpdate"
          class="px-4 py-2 bg-[var(--bg-app)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] rounded-xl text-xs font-black uppercase tracking-widest text-[var(--text-main)] transition-all disabled:opacity-50"
        >
          <i class="bi bi-arrow-repeat mr-2" :class="{ 'animate-spin': checkingUpdate }"></i>
          {{ checkingUpdate ? 'Prüfe...' : 'Prüfen' }}
        </button>
      </div>
    </div>

    <!-- Mode Toggle -->
    <div class="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-ui)] p-6 mb-4 shadow-[var(--shadow-main)]">
      <h2 class="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] opacity-40 mb-4">Modus</h2>
      <div class="flex gap-3">
        <button
          @click="settings.mode = 'standalone'"
          :class="settings.mode === 'standalone' ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20' : 'bg-[var(--bg-app)] border-[var(--border-ui)] text-[var(--text-muted)]'"
          class="flex-1 py-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2"
        >
          <i class="bi bi-pc-display"></i>
          Standalone
        </button>
        <button
          @click="settings.mode = 'online'"
          :class="settings.mode === 'online' ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20' : 'bg-[var(--bg-app)] border-[var(--border-ui)] text-[var(--text-muted)]'"
          class="flex-1 py-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2"
        >
          <i class="bi bi-cloud-fill"></i>
          Mit MovieShelf verbinden
        </button>
      </div>
    </div>

    <!-- Online Settings -->
    <div v-if="settings.mode === 'online'" class="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-ui)] p-6 mb-4 shadow-[var(--shadow-main)]">
      <h2 class="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] opacity-40 mb-4">Shelf-Verbindung</h2>

      <div class="space-y-4">
        <div>
          <label class="text-xs text-[var(--text-muted)] opacity-40 font-bold uppercase tracking-widest block mb-1">Shelf URL</label>
          <input
            v-model="settings.shelfUrl"
            type="url"
            placeholder="https://dein-name.movieshelf.info"
            class="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] opacity-80 focus:outline-none focus:border-red-500/50 transition-colors"
          />
        </div>

        <div>
          <label class="text-xs text-[var(--text-muted)] opacity-40 font-bold uppercase tracking-widest block mb-1">E-Mail</label>
          <input v-model="loginEmail" type="email" placeholder="deine@email.de"
            class="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] opacity-80 focus:outline-none focus:border-red-500/50 transition-colors" />
        </div>

        <div>
          <label class="text-xs text-[var(--text-muted)] opacity-40 font-bold uppercase tracking-widest block mb-1">Passwort</label>
          <input v-model="loginPassword" type="password" placeholder="••••••••"
            class="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] opacity-80 focus:outline-none focus:border-red-500/50 transition-colors" />
        </div>

        <button
          @click="doLogin"
          :disabled="loginLoading"
          class="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/10"
        >
          <i class="bi bi-box-arrow-in-right"></i>
          {{ loginLoading ? 'Verbinde...' : 'Anmelden & Verbinden' }}
        </button>

        <p v-if="loginError" class="text-[var(--status-red)] text-xs text-center font-bold">{{ loginError }}</p>
        <p v-if="loginSuccess" class="text-[var(--status-green)] text-xs text-center font-bold">✓ Erfolgreich verbunden!</p>
      </div>
    </div>

    <!-- Save Button -->
    <button
      @click="save"
      class="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl transition-all text-sm mb-4 flex items-center justify-center gap-2 shadow-xl shadow-red-600/20"
    >
      <i class="bi bi-save"></i>
      Einstellungen speichern
    </button>

    <!-- Dev Tools -->
    <div v-if="isDev" class="bg-[var(--status-red-bg)] rounded-2xl border border-[var(--status-red)]/20 p-6">
      <h2 class="text-sm font-black uppercase tracking-widest text-[var(--status-red)] opacity-40 mb-4">Entwickler-Werkzeuge</h2>
      <button
        @click="clearDatabase"
        class="w-full bg-[var(--status-red-bg)] hover:bg-[var(--status-red)]/10 border border-[var(--status-red)]/10 text-[var(--status-red)] font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
      >
        <i class="bi bi-trash3"></i>
        Lokale Datenbank leeren
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useApi } from '@/composables/useApi'
import { useUpdateService } from '@/services/updateService'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.vue'

const settings = useSettingsStore()
const { login } = useApi()
const { checkForUpdates } = useUpdateService()

const loginEmail     = ref('')
const loginPassword  = ref('')
const loginLoading   = ref(false)
const loginError     = ref('')
const loginSuccess   = ref(false)
const isDev          = ref(false)
const checkingUpdate = ref(false)

onMounted(async () => {
  isDev.value = await window.electron.getIsDev()
  await settings.load()
  
  // Initialer Check beim Laden
  handleUpdateCheck()
})

async function handleUpdateCheck() {
  checkingUpdate.value = true
  try {
    await checkForUpdates()
  } finally {
    checkingUpdate.value = false
  }
}

async function doLogin() {
  loginError.value   = ''
  loginSuccess.value = false
  loginLoading.value = true
  try {
    const token = await login(settings.shelfUrl, loginEmail.value, loginPassword.value)
    settings.token = token
    await settings.save()
    loginSuccess.value = true
    loginPassword.value = ''
  } catch (e: unknown) {
    loginError.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Anmeldung fehlgeschlagen.'
  } finally {
    loginLoading.value = false
  }
}

async function save() {
  await settings.save()
}

async function clearDatabase() {
  if (confirm('Bist du sicher? Alle lokalen Filme und Schauspieler werden gelöscht!')) {
    await window.electron.db.movies.clear()
    alert('Datenbank wurde geleert.')
    window.location.reload()
  }
}
</script>
