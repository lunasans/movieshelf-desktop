import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useSettingsStore } from '@/stores/settings'
import './style.css'

async function init() {
  const app   = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(router)

  await useSettingsStore(pinia).load()

  window.electron.onNavigate((path: string) => {
    router.push(path)
  })

  app.mount('#app')
}

init()
