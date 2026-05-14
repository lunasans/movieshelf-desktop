<template>
  <div class="flex h-full">

    <!-- Left nav -->
    <aside class="w-52 flex-shrink-0 border-r border-[var(--border-ui)] py-6 px-3 flex flex-col gap-1">
      <button
        v-for="item in visibleSections"
        :key="item.id"
        @click="active = item.id"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-all"
        :class="active === item.id
          ? 'bg-[var(--status-red)]/10 text-[var(--status-red)] border border-[var(--status-red)]/20'
          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] border border-transparent'"
      >
        <i :class="`bi bi-${item.icon} text-base leading-none`"></i>
        <span>{{ item.label }}</span>
        <span v-if="item.id === 'updates' && settings.updateAvailable"
          class="ml-auto flex h-2 w-2 rounded-full bg-[var(--status-green)]"></span>
      </button>
    </aside>

    <!-- Right content -->
    <main class="flex-1 overflow-y-auto p-8 max-w-2xl">

      <!-- ── Erscheinungsbild ── -->
      <template v-if="active === 'appearance'">
        <SectionHeader icon="palette" title="Erscheinungsbild" />

        <SettingsRow label="Design" hint="Hell, Dunkel oder Systemeinstellung">
          <ThemeSwitcher />
        </SettingsRow>
      </template>

      <!-- ── Verbindung ── -->
      <template v-if="active === 'connection'">
        <SectionHeader icon="cloud" title="Verbindung" />

        <div class="flex gap-3 mb-6">
          <ModeButton
            :active="settings.mode === 'standalone'"
            icon="pc-display"
            label="Standalone"
            @click="settings.mode = 'standalone'"
          />
          <ModeButton
            :active="settings.mode === 'online'"
            icon="cloud-fill"
            label="Mit MovieShelf verbinden"
            @click="settings.mode = 'online'"
          />
        </div>

        <template v-if="settings.mode === 'online'">
          <div class="space-y-4">
            <SettingsInput label="Shelf URL" type="url" v-model="settings.shelfUrl" placeholder="https://dein-name.movieshelf.info" />

            <!-- OAuth Login -->
            <button
              @click="doOAuthLogin"
              :disabled="oauthLoading || !settings.shelfUrl"
              class="w-full bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] disabled:opacity-40 text-[var(--text-main)] font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
            >
              <i class="bi bi-shield-lock"></i>
              {{ oauthLoading ? 'Warte auf Browser...' : 'Mit Movieshelf anmelden' }}
            </button>

            <!-- Divider -->
            <div class="flex items-center gap-3">
              <div class="flex-1 h-px bg-[var(--border-ui)]"></div>
              <span class="text-xs text-[var(--text-muted)] opacity-50">oder manuell</span>
              <div class="flex-1 h-px bg-[var(--border-ui)]"></div>
            </div>

            <SettingsInput label="E-Mail" type="email" v-model="loginEmail" placeholder="deine@email.de" />
            <SettingsInput label="Passwort" type="password" v-model="loginPassword" placeholder="••••••••" />

            <button
              @click="doLogin"
              :disabled="loginLoading"
              class="w-full bg-[var(--status-red)] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/10"
            >
              <i class="bi bi-box-arrow-in-right"></i>
              {{ loginLoading ? 'Verbinde...' : 'Anmelden & Verbinden' }}
            </button>
            <p v-if="loginError"   class="text-[var(--status-red)]   text-xs text-center font-bold">{{ loginError }}</p>
            <p v-if="loginSuccess" class="text-[var(--status-green)] text-xs text-center font-bold">✓ Erfolgreich verbunden!</p>
          </div>
        </template>
        <p v-else class="text-xs text-[var(--text-muted)] opacity-50">
          Im Standalone-Modus werden alle Daten lokal gespeichert. Keine Cloud-Verbindung erforderlich.
        </p>

        <SaveButton class="mt-6" @click="save" />
      </template>

      <!-- ── TMDb ── -->
      <template v-if="active === 'tmdb'">
        <SectionHeader icon="film" title="TMDb Integration" />

        <SettingsRow label="API Key" hint="Ermöglicht die Filmsuche ohne Cloud-Verbindung">
          <a href="https://www.themoviedb.org/settings/api" target="_blank"
            class="text-xs text-[var(--status-red)] hover:underline font-bold">Key beantragen →</a>
        </SettingsRow>

        <div class="mt-3 mb-6">
          <input
            v-model="settings.tmdbApiKey"
            type="password"
            placeholder="TMDb API Key eingeben..."
            class="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] opacity-80 focus:outline-none focus:border-[var(--status-red)]/50 transition-colors font-mono"
          />
        </div>

        <SaveButton @click="save" />
      </template>

      <!-- ── Updates ── -->
      <template v-if="active === 'updates'">
        <SectionHeader icon="arrow-repeat" title="Software Update" />

        <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-5 mb-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-bold text-[var(--text-main)]">Installierte Version</p>
              <p class="text-2xl font-black text-[var(--text-main)] mt-0.5">v{{ settings.appVersion }}</p>
            </div>
            <div v-if="settings.updateAvailable"
              class="flex items-center gap-2 bg-[var(--status-green)]/10 border border-[var(--status-green)]/20 rounded-xl px-3 py-1.5">
              <span class="flex h-2 w-2 rounded-full bg-[var(--status-green)] animate-pulse"></span>
              <span class="text-xs font-black text-[var(--status-green)] uppercase tracking-widest">
                {{ settings.newestVersion }} verfügbar
              </span>
            </div>
            <span v-else class="text-xs text-[var(--text-muted)] opacity-50 font-bold uppercase tracking-widest">Aktuell</span>
          </div>
        </div>

        <!-- Changelog for new version -->
        <div v-if="settings.updateAvailable && settings.updateChangelog && !downloading"
          class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-5 mb-4">
          <p class="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60 mb-3">
            Was ist neu in v{{ settings.newestVersion }}
          </p>
          <div class="space-y-1.5">
            <template v-for="line in changelogLines" :key="line.text">
              <p v-if="line.type === 'heading'"
                class="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest opacity-50 mt-3 first:mt-0">
                {{ line.text }}
              </p>
              <div v-else-if="line.type === 'item'" class="flex gap-2">
                <span class="text-[var(--status-red)] flex-shrink-0 mt-0.5">·</span>
                <span class="text-xs text-[var(--text-main)] opacity-80">{{ line.text }}</span>
              </div>
            </template>
          </div>
        </div>

        <!-- Download progress -->
        <div v-if="downloading" class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-5 mb-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-bold text-[var(--text-main)]">Wird heruntergeladen...</p>
            <span class="text-sm font-black text-[var(--text-main)]">{{ downloadProgress }}%</span>
          </div>
          <div class="w-full bg-[var(--bg-app)] rounded-full h-2 overflow-hidden">
            <div class="h-2 bg-[var(--status-green)] rounded-full transition-all duration-300"
              :style="{ width: downloadProgress + '%' }"></div>
          </div>
          <p v-if="updateError" class="text-xs text-[var(--status-red)] font-bold mt-3">{{ updateError }}</p>
        </div>

        <!-- Manual download notice -->
        <div v-if="settings.updateAvailable && settings.updateManual && !downloading"
          class="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 mb-3">
          <i class="bi bi-exclamation-triangle-fill text-amber-400 flex-shrink-0 mt-0.5"></i>
          <p class="text-xs text-[var(--text-main)] opacity-80">
            Dieses Update muss <strong>manuell heruntergeladen</strong> und installiert werden.
          </p>
        </div>

        <div class="flex gap-3">
          <!-- Auto-install button -->
          <button
            v-if="settings.updateAvailable && !settings.updateManual && !downloading"
            @click="installUpdate"
            class="flex-1 bg-[var(--status-green)] hover:opacity-90 text-white font-black py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
          >
            <i class="bi bi-download"></i> Jetzt installieren
          </button>
          <!-- Manual download button -->
          <a
            v-if="settings.updateAvailable && settings.updateManual && settings.updateUrl && !downloading"
            :href="settings.updateUrl"
            target="_blank"
            class="flex-1 bg-[var(--status-green)] hover:opacity-90 text-white font-black py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
          >
            <i class="bi bi-box-arrow-up-right"></i> Herunterladen
          </a>
          <button
            v-if="!downloading"
            @click="handleUpdateCheck"
            :disabled="checkingUpdate"
            class="flex-1 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-ui)] rounded-xl text-sm font-bold text-[var(--text-main)] py-3 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <i class="bi bi-arrow-repeat" :class="{ 'animate-spin': checkingUpdate }"></i>
            {{ checkingUpdate ? 'Prüfe...' : 'Nach Updates suchen' }}
          </button>
        </div>
      </template>

      <!-- ── Backup ── -->
      <template v-if="active === 'backup'">
        <SectionHeader icon="archive" title="Backup" />

        <!-- Backup erstellen -->
        <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-5 mb-4">
          <p class="text-sm font-bold text-[var(--text-main)] mb-1">Backup erstellen</p>
          <p class="text-xs text-[var(--text-muted)] opacity-60 mb-4">
            Exportiert alle Filme, Schauspieler, Listen und Medien als <span class="font-mono">.ms</span>-Datei.
          </p>
          <div v-if="backupResult" class="mb-3 text-xs font-bold"
            :class="backupResult.success ? 'text-[var(--status-green)]' : 'text-[var(--status-red)]'">
            {{ backupResult.success
              ? `✓ Backup erstellt — ${backupResult.movies} Filme gesichert`
              : `✗ ${backupResult.error}` }}
          </div>
          <button
            @click="createBackup"
            :disabled="backupLoading"
            class="w-full bg-[var(--bg-elevated)] hover:bg-[var(--border-ui)] border border-[var(--border-ui)] text-[var(--text-main)] font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <i class="bi bi-cloud-download" :class="{ 'animate-pulse': backupLoading }"></i>
            {{ backupLoading ? 'Wird erstellt...' : 'Backup speichern...' }}
          </button>
        </div>

        <!-- Backup wiederherstellen -->
        <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-5 mb-4">
          <p class="text-sm font-bold text-[var(--text-main)] mb-1">Backup wiederherstellen</p>
          <p class="text-xs text-[var(--text-muted)] opacity-60 mb-4">
            Stellt eine gespeicherte <span class="font-mono">.ms</span>-Datei wieder her.
            Die aktuelle Sammlung wird dabei überschrieben.
          </p>
          <div v-if="restoreResult" class="mb-3 text-xs font-bold"
            :class="restoreResult.success ? 'text-[var(--status-green)]' : 'text-[var(--status-red)]'">
            {{ restoreResult.success
              ? `✓ Wiederhergestellt — ${restoreResult.movies} Filme, ${restoreResult.actors} Schauspieler`
              : `✗ ${restoreResult.error}` }}
          </div>
          <button
            @click="restoreBackup"
            :disabled="restoreLoading"
            class="w-full bg-transparent hover:bg-[var(--status-red)]/5 border border-[var(--status-red)]/30 text-[var(--status-red)] font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <i class="bi bi-arrow-counterclockwise" :class="{ 'animate-spin': restoreLoading }"></i>
            {{ restoreLoading ? 'Wird wiederhergestellt...' : 'Backup wiederherstellen...' }}
          </button>
        </div>

        <!-- CSV / Letterboxd Import -->
        <div class="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl p-5">
          <p class="text-sm font-bold text-[var(--text-main)] mb-1">CSV / Letterboxd-Import</p>
          <p class="text-xs text-[var(--text-muted)] opacity-60 mb-4">
            Importiert eine Letterboxd-CSV-Datei (Spalten: <span class="font-mono">Name, Year, Rating, Tags, Watched Date</span>).
          </p>
          <div v-if="importResult" class="mb-3 text-xs font-bold"
            :class="importResult.error ? 'text-[var(--status-red)]' : 'text-[var(--status-green)]'">
            {{ importResult.error
              ? `✗ ${importResult.error}`
              : `✓ ${importResult.imported} importiert, ${importResult.skipped} übersprungen` }}
          </div>
          <button
            @click="importCsv"
            :disabled="importLoading"
            class="w-full bg-[var(--bg-elevated)] hover:bg-[var(--border-ui)] border border-[var(--border-ui)] text-[var(--text-main)] font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <i class="bi bi-file-earmark-spreadsheet" :class="{ 'animate-pulse': importLoading }"></i>
            {{ importLoading ? 'Wird importiert...' : 'CSV-Datei auswählen...' }}
          </button>
        </div>
      </template>

      <!-- ── Entwickler ── -->
      <template v-if="active === 'dev'">
        <SectionHeader icon="bug" title="Entwickler-Werkzeuge" />

        <div class="bg-[var(--status-red-bg)] border border-[var(--status-red)]/20 rounded-2xl p-5">
          <p class="text-xs text-[var(--status-red)] opacity-60 font-bold uppercase tracking-widest mb-4">Destruktive Aktionen</p>
          <button
            @click="clearDatabase"
            class="w-full bg-transparent hover:bg-[var(--status-red)]/10 border border-[var(--status-red)]/20 text-[var(--status-red)] font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            <i class="bi bi-trash3"></i> Lokale Datenbank leeren
          </button>
        </div>
      </template>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h } from 'vue'
import axios from 'axios'
import { useSettingsStore } from '@/stores/settings'
import { useApi } from '@/composables/useApi'
import { useUpdateService } from '@/services/updateService'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.vue'

// ── Inline sub-components ────────────────────────────────────────────────────

const SectionHeader = defineComponent({
  props: { icon: String, title: String },
  setup(props) {
    return () => h('div', { class: 'mb-6' }, [
      h('div', { class: 'flex items-center gap-3 mb-1' }, [
        h('i', { class: `bi bi-${props.icon} text-[var(--status-red)] text-lg` }),
        h('h1', { class: 'text-xl font-black text-[var(--text-main)] uppercase tracking-tight' }, props.title),
      ]),
      h('div', { class: 'h-px bg-[var(--border-ui)] mt-4' }),
    ])
  }
})

const SettingsRow = defineComponent({
  props: { label: String, hint: String },
  setup(props: { label?: string; hint?: string }, { slots }: { slots: Record<string, (() => unknown) | undefined> }) {
    return () => h('div', { class: 'flex items-center justify-between py-4 border-b border-[var(--border-ui)]' }, [
      h('div', [
        h('p', { class: 'text-sm font-bold text-[var(--text-main)]' }, props.label),
        props.hint ? h('p', { class: 'text-xs text-[var(--text-muted)] opacity-60 mt-0.5' }, props.hint) : null,
      ]),
      h('div', (slots as any).default?.()),
    ])
  }
})

const SettingsInput = defineComponent({
  props: { label: String, type: String, modelValue: String, placeholder: String },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', [
      h('label', { class: 'text-xs text-[var(--text-muted)] opacity-40 font-bold uppercase tracking-widest block mb-1' }, props.label),
      h('input', {
        type: props.type ?? 'text',
        value: props.modelValue,
        placeholder: props.placeholder,
        class: 'w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--status-red)]/50 transition-colors',
        onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
      }),
    ])
  }
})

const ModeButton = defineComponent({
  props: { active: Boolean, icon: String, label: String },
  emits: ['click'],
  setup(props, { emit }) {
    return () => h('button', {
      onClick: () => emit('click'),
      class: [
        'flex-1 py-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2',
        props.active
          ? 'bg-[var(--status-red)] border-[var(--status-red)] text-white shadow-lg shadow-red-600/20'
          : 'bg-[var(--bg-app)] border-[var(--border-ui)] text-[var(--text-muted)] hover:text-[var(--text-main)]',
      ].join(' '),
    }, [
      h('i', { class: `bi bi-${props.icon}` }),
      props.label,
    ])
  }
})

const SaveButton = defineComponent({
  props: { class: String },
  emits: ['click'],
  setup(props, { emit }) {
    return () => h('button', {
      onClick: () => emit('click'),
      class: `w-full bg-[var(--status-red)] hover:opacity-90 text-white font-black py-3.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/10 ${props.class ?? ''}`,
    }, [
      h('i', { class: 'bi bi-floppy' }),
      'Einstellungen speichern',
    ])
  }
})

// ── State ────────────────────────────────────────────────────────────────────

const settings = useSettingsStore()
const { login } = useApi()
const { checkForUpdates } = useUpdateService()

const isDev            = ref(false)
const active           = ref('appearance')

const loginEmail       = ref('')
const loginPassword    = ref('')
const loginLoading     = ref(false)
const loginError       = ref('')
const loginSuccess     = ref(false)

const oauthLoading     = ref(false)
const oauthState       = ref('')

const checkingUpdate   = ref(false)
const downloading      = ref(false)
const downloadProgress = ref(0)
const updateError      = ref('')

const changelogLines = computed(() => {
  if (!settings.updateChangelog) return []
  return settings.updateChangelog.split('\n')
    .filter(l => l.trim())
    .map(l => {
      if (/^###\s+/.test(l)) return { type: 'heading', text: l.replace(/^###\s+/, '') }
      if (/^-\s+/.test(l))   return { type: 'item',    text: l.replace(/^-\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1') }
      return null
    })
    .filter(Boolean) as { type: string; text: string }[]
})

const backupLoading    = ref(false)
const backupResult     = ref<{ success: boolean; movies?: number; error?: string } | null>(null)
const restoreLoading   = ref(false)
const restoreResult    = ref<{ success: boolean; movies?: number; actors?: number; error?: string } | null>(null)
const importLoading    = ref(false)
const importResult     = ref<{ imported: number; skipped: number; error?: string } | null>(null)

const sections = [
  { id: 'appearance', icon: 'palette',      label: 'Erscheinungsbild' },
  { id: 'connection', icon: 'cloud',         label: 'Verbindung'       },
  { id: 'tmdb',       icon: 'film',          label: 'TMDb'             },
  { id: 'updates',    icon: 'arrow-repeat',  label: 'Updates'          },
  { id: 'backup',     icon: 'archive',       label: 'Backup'           },
  { id: 'dev',        icon: 'bug',           label: 'Entwickler',  dev: true },
]

const visibleSections = computed(() =>
  sections.filter(s => !s.dev || isDev.value)
)

// ── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  isDev.value = await window.electron.getIsDev()
  await settings.load()

  window.electron.update.onProgress((percent: number) => {
    downloadProgress.value = percent
  })

  window.electron.update.onReady(() => {
    window.electron.update.install()
  })

  handleUpdateCheck()
})

// ── Functions ────────────────────────────────────────────────────────────────

async function handleUpdateCheck() {
  checkingUpdate.value = true
  try { await checkForUpdates() } finally { checkingUpdate.value = false }
}

async function generatePkce(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(32)
  window.crypto.getRandomValues(array)
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const data    = new TextEncoder().encode(verifier)
  const hash    = await window.crypto.subtle.digest('SHA-256', data)
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  return { verifier, challenge }
}

async function doOAuthLogin() {
  if (!settings.shelfUrl) return
  const baseUrl = new URL(settings.shelfUrl).origin
  loginError.value   = ''
  loginSuccess.value = false
  oauthLoading.value = true

  const state = crypto.randomUUID()
  oauthState.value = state

  const { verifier, challenge } = await generatePkce()

  const params = new URLSearchParams({
    response_type:          'code',
    client_id:              'filmdb-desktop',
    redirect_uri:           'movieshelf://oauth/callback',
    state,
    code_challenge:         challenge,
    code_challenge_method:  'S256',
  })

  window.electron.oauth.onCallback(async ({ code, state: returnedState }) => {
    oauthLoading.value = false
    if (returnedState !== oauthState.value) {
      loginError.value = 'OAuth Sicherheitsfehler – bitte erneut versuchen.'
      return
    }
    try {
      const res = await axios.post(`${baseUrl}/api/oauth/token`, {
        grant_type:    'authorization_code',
        code,
        redirect_uri:  'movieshelf://oauth/callback',
        client_id:     'filmdb-desktop',
        code_verifier: verifier,
      })
      settings.token = res.data.access_token
      await settings.save()
      loginSuccess.value = true
    } catch {
      loginError.value = 'Token-Austausch fehlgeschlagen.'
    }
  })

  await window.electron.oauth.openBrowser(
    `${baseUrl}/oauth/authorize?${params}`
  )
}

async function doLogin() {
  loginError.value   = ''
  loginSuccess.value = false
  loginLoading.value = true
  try {
    const token = await login(settings.shelfUrl, loginEmail.value, loginPassword.value)
    settings.token = token
    await settings.save()
    loginSuccess.value  = true
    loginPassword.value = ''
  } catch (e: unknown) {
    loginError.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Anmeldung fehlgeschlagen.'
  } finally {
    loginLoading.value = false
  }
}

async function installUpdate() {
  downloading.value      = true
  downloadProgress.value = 0
  updateError.value      = ''
  try {
    await window.electron.update.download()
  } catch (e: unknown) {
    updateError.value = String(e)
    downloading.value = false
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

async function createBackup() {
  backupLoading.value = true
  backupResult.value  = null
  try {
    const result = await window.electron.backup.create()
    if (!result.canceled) backupResult.value = result
  } finally {
    backupLoading.value = false
  }
}

async function restoreBackup() {
  restoreLoading.value = true
  restoreResult.value  = null
  try {
    const result = await window.electron.backup.restore()
    if (!result.canceled) {
      restoreResult.value = result
      if (result.success) {
        setTimeout(() => window.location.reload(), 1500)
      }
    }
  } finally {
    restoreLoading.value = false
  }
}

async function importCsv() {
  importResult.value  = null
  importLoading.value = true
  try {
    const text = await pickCsvFile()
    if (!text) return

    const rows = parseCsv(text)
    importResult.value = await window.electron.db.movies.import(rows)
  } catch (e: unknown) {
    importResult.value = { imported: 0, skipped: 0, error: String(e) }
  } finally {
    importLoading.value = false
  }
}

function pickCsvFile(): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type   = 'file'
    input.accept = '.csv,text/csv'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsText(file, 'utf-8')
    }
    input.click()
  })
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return []

  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)

  const nameIdx    = idx('name')    !== -1 ? idx('name')    : idx('title')
  const yearIdx    = idx('year')
  const ratingIdx  = idx('rating')
  const tagsIdx    = idx('tags')
  const watchedIdx = idx('watched date')

  return lines.slice(1).flatMap(line => {
    // simple CSV split (no quoted-comma support — good enough for Letterboxd)
    const cols = line.split(',')
    const title = cols[nameIdx]?.trim()
    if (!title) return []

    const year       = parseInt(cols[yearIdx]?.trim() ?? '') || undefined
    const rawRating  = parseFloat(cols[ratingIdx]?.trim() ?? '')
    // Letterboxd: 0.5–5.0 scale → multiply × 2 for 1–10
    const rating     = isNaN(rawRating) ? undefined : Math.round(rawRating * 2 * 10) / 10
    const tag        = cols[tagsIdx]?.trim() || undefined
    const is_watched = !!(cols[watchedIdx]?.trim())

    return [{ title, year, rating, tag, is_watched }]
  })
}
</script>
