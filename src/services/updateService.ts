import axios from 'axios'
import { useSettingsStore } from '@/stores/settings'

export function useUpdateService() {
  const settings = useSettingsStore()
  
  // HINWEIS: Dies ist die URL zu deiner zentralen App (SaaS)
  // Ein Endpunkt, der z.B. JSON zurückgibt: { "version": "0.2.0", "url": "..." }
  const UPDATE_URL = 'https://movieshelf.info/api/desktop-version'

  async function checkForUpdates() {
    try {
      const platform = navigator.platform.toLowerCase().includes('linux') ? 'linux' : 'win'
      const response = await axios.get(`${UPDATE_URL}?platform=${platform}`)
      const { version: remoteVersion, url, sha256 } = response.data

      settings.newestVersion = remoteVersion
      settings.updateUrl     = url
        ? (url.startsWith('http') ? url : `https://movieshelf.info${url.startsWith('/') ? '' : '/'}${url}`)
        : ''
      settings.updateSha256  = sha256 ?? ''

      if (remoteVersion !== settings.appVersion) {
        settings.updateAvailable = compareVersions(remoteVersion, settings.appVersion) > 0
      } else {
        settings.updateAvailable = false
      }
      
      return settings.updateAvailable
    } catch (error) {
      console.error('Update-Check fehlgeschlagen:', error)
      return false
    }
  }

  function compareVersions(v1: string, v2: string) {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
        if (parts1[i] > parts2[i]) return 1
        if (parts1[i] < parts2[i]) return -1
    }
    return 0
  }

  return { checkForUpdates }
}
