import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const isSidebarCollapsed = ref(false)
  const headerTitle = ref('')

  function setHeaderTitle(title: string) {
    headerTitle.value = title
  }

  function toggleSidebar() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
  }

  function setSidebarCollapsed(value: boolean) {
    isSidebarCollapsed.value = value
  }

  return {
    isSidebarCollapsed,
    headerTitle,
    setHeaderTitle,
    toggleSidebar,
    setSidebarCollapsed
  }
})
