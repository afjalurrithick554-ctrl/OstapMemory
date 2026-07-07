import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'om-sidebar-collapsed'

export const useSidebarStore = defineStore('sidebar', () => {
  const isCollapsed = ref<boolean>(localStorage.getItem(STORAGE_KEY) === '1')
  // Открыт ли сайдбар-drawer на мобильном (не персистится).
  const mobileOpen = ref(false)

  watch(isCollapsed, (v) => localStorage.setItem(STORAGE_KEY, v ? '1' : '0'))

  function toggle() {
    isCollapsed.value = !isCollapsed.value
  }

  function openMobile() {
    mobileOpen.value = true
  }

  function closeMobile() {
    mobileOpen.value = false
  }

  return { isCollapsed, mobileOpen, toggle, openMobile, closeMobile }
})
