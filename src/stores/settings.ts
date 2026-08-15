import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/** Theme-IDs wie in der Web Shelf, plus der Desktop-eigene Hellmodus und "system". */
export const THEMES = [
  'dark', 'light', 'system',
  'blue', 'green', 'red', 'purple',
  'christmas', 'halloween', 'summer',
] as const

export type Theme = typeof THEMES[number]

export const useSettingsStore = defineStore('settings', () => {
  const mode        = ref<'standalone' | 'online'>('standalone')
  const theme       = ref<Theme>('dark')
  const language    = ref<'de' | 'en'>('de')
  const shelfUrl    = ref('')
  const token       = ref('')
  const tmdbApiKey  = ref('')

  const isOnline = computed(() => mode.value === 'online' && !!shelfUrl.value && !!token.value)
  const hasTmdb  = computed(() => !!tmdbApiKey.value)
  const tmdbLanguage = computed(() => language.value === 'en' ? 'en-US' : 'de-DE')
  const dateLocale   = computed(() => language.value === 'en' ? 'en-GB' : 'de-AT')

  // Zählung aktiver Installationen — ausdrückliches Opt-in, Vorgabe aus.
  // Die Kennung entsteht erst beim Einschalten (siehe setStatsEnabled): wer nie
  // zustimmt, hat auch keine.
  const statsEnabled   = ref(false)
  const statsInstallId = ref('')

  const appVersion      = ref('0.0.0')
  const newestVersion   = ref('')
  const updateAvailable = ref(false)
  const updateUrl       = ref('')
  const updateSha256    = ref('')
  const updateChangelog = ref('')
  const updateManual    = ref(false)

  async function load() {
    const all = await window.electron.settings.getAll()
    mode.value       = all.mode     === 'online' ? 'online' : 'standalone'
    // Unbekannte oder alte Werte (z.B. "default" aus der Shelf) fallen auf "dark" zurück.
    theme.value      = (THEMES as readonly string[]).includes(all.theme) ? all.theme as Theme : 'dark'
    language.value   = all.language === 'en' ? 'en' : 'de'
    shelfUrl.value   = all.shelf_url  ?? ''
    token.value      = all.shelf_token ?? ''
    tmdbApiKey.value = all.tmdb_api_key ?? ''
    statsEnabled.value   = all.stats_enabled === '1'
    statsInstallId.value = all.stats_install_id ?? ''

    // Load app version from electron
    appVersion.value = await window.electron.getVersion()
  }

  /**
   * Zählung ein- oder ausschalten.
   *
   * Beim ersten Einschalten entsteht die Kennung — zufaellig, ohne Bezug zu
   * Person, Konto oder Hardware. Beim Ausschalten bleibt sie liegen, statt
   * gelöscht zu werden: sonst bekaeme dieselbe Installation beim nächsten
   * Einschalten eine neue und würde doppelt gezählt. Gesendet wird sie dann
   * ohnehin nicht mehr, und der Eintrag auf dem Server verfällt nach 30 Tagen
   * von selbst.
   *
   * Wird sofort gespeichert statt erst beim Speichern-Knopf: eine Zustimmung
   * zur Datenerhebung darf nicht daran hängen, ob jemand danach noch eine
   * Schaltfläche findet.
   */
  async function setStatsEnabled(enabled: boolean) {
    if (enabled && !statsInstallId.value) {
      statsInstallId.value = crypto.randomUUID()
      await window.electron.settings.set('stats_install_id', statsInstallId.value)
    }
    statsEnabled.value = enabled
    await window.electron.settings.set('stats_enabled', enabled ? '1' : '0')
  }

  async function save() {
    await window.electron.settings.set('mode',          mode.value)
    await window.electron.settings.set('theme',         theme.value)
    await window.electron.settings.set('language',      language.value)
    await window.electron.settings.set('shelf_url',     shelfUrl.value)
    await window.electron.settings.set('shelf_token',   token.value)
    await window.electron.settings.set('tmdb_api_key',  tmdbApiKey.value)
  }

  return { mode, theme, language, tmdbLanguage, dateLocale, shelfUrl, token, tmdbApiKey, isOnline, hasTmdb, load, save, appVersion, newestVersion, updateAvailable, updateUrl, updateSha256, updateChangelog, updateManual, statsEnabled, statsInstallId, setStatsEnabled }
})
