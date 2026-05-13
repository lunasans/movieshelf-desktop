import { onMounted, onUnmounted } from 'vue'

type KeyMap = Record<string, (e: KeyboardEvent) => void>

export function useKeyboard(keys: KeyMap) {
  function handler(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    // Disable shortcuts when typing in inputs
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

    const cb = keys[e.key]
    if (cb) {
      e.preventDefault()
      cb(e)
    }
  }

  onMounted(() => window.addEventListener('keydown', handler))
  onUnmounted(() => window.removeEventListener('keydown', handler))
}
