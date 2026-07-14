import { createI18n } from 'vue-i18n'
import de from './de'
import en from './en'

export type AppLocale = 'de' | 'en'

// Key-Parität de/en wird über `satisfies MessageSchema` in en.ts erzwungen.
export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'de', // Default bis die Settings geladen sind (gleiches Muster wie Theme)
  fallbackLocale: 'de',
  messages: { de, en },
  missingWarn: true,
  fallbackWarn: false,
})

export function setLocale(locale: AppLocale) {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
}

/** Für Nicht-Komponenten-Code (Composables, Callbacks) — reaktiv zur aktuellen Sprache. */
export const t = i18n.global.t
