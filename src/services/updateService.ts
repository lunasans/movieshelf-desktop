import axios from 'axios'
import { useSettingsStore } from '@/stores/settings'

const CHANGELOG_URL = 'https://raw.githubusercontent.com/lunasans/movieshelf-desktop/main/CHANGELOG.md'

export function useUpdateService() {
  const settings = useSettingsStore()

  const UPDATE_URL = 'https://movieshelf.info/api/desktop-version'

  async function checkForUpdates() {
    try {
      const platform = navigator.platform.toLowerCase().includes('linux') ? 'linux' : 'win'
      const response = await axios.get(`${UPDATE_URL}?platform=${platform}`)
      const raw = response.data
      const remoteVersion = (raw.version as string).replace(/^v/, '')
      const { url, sha256, manual } = raw

      settings.newestVersion = remoteVersion
      settings.updateUrl     = url
        ? (url.startsWith('http') ? url : `https://movieshelf.info${url.startsWith('/') ? '' : '/'}${url}`)
        : ''
      settings.updateSha256  = sha256 ?? ''
      settings.updateManual  = manual === true

      if (remoteVersion !== settings.appVersion) {
        settings.updateAvailable = compareVersions(remoteVersion, settings.appVersion) > 0
      } else {
        settings.updateAvailable = false
      }

      if (settings.updateAvailable) {
        settings.updateChangelog = await fetchChangelog(remoteVersion)
      }

      return settings.updateAvailable
    } catch (error) {
      console.error('Update-Check fehlgeschlagen:', error)
      return false
    }
  }

  async function fetchChangelog(version: string): Promise<string> {
    try {
      const { data } = await axios.get(CHANGELOG_URL)
      return extractVersionSection(data, version)
    } catch {
      return ''
    }
  }

  function extractVersionSection(markdown: string, version: string): string {
    const lines = markdown.split('\n').map(l => l.replace(/\r$/, ''))
    const startPattern = new RegExp(`^##\\s+\\[${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`)
    let inSection = false
    const result: string[] = []

    for (const line of lines) {
      if (startPattern.test(line)) {
        inSection = true
        continue // skip the version headline itself
      }
      if (inSection) {
        if (/^##\s+\[/.test(line)) break // next version starts
        result.push(line)
      }
    }

    // Trim leading/trailing blank lines
    while (result.length && !result[0].trim()) result.shift()
    while (result.length && !result[result.length - 1].trim()) result.pop()
    return result.join('\n')
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
