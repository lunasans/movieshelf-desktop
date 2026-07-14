import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { i18n } from '@/i18n'
import { useSettingsStore } from '@/stores/settings'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './style.css'

async function init() {
  const app   = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(router)
  app.use(i18n)

  // Globale Fehler-Behandlung, damit nichts still verschluckt wird.
  app.config.errorHandler = (err, _instance, info) => {
    console.error('[vue] error:', err, info)
  }
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[renderer] unhandled rejection:', e.reason)
  })

  // App sofort mounten — Settings werden in App.vue nachgeladen
  app.mount('#app')

  // Settings im Hintergrund laden (blockiert nicht mehr das Rendering)
  useSettingsStore(pinia).load().catch(console.error)

  window.electron.onNavigate((path: string) => {
    router.push(path)
  })
}

init()
