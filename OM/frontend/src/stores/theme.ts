import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'om-theme'

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveDark(mode: ThemeMode): boolean {
  return mode === 'dark' || (mode === 'system' && systemPrefersDark())
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', resolveDark(mode))
}

export const useThemeStore = defineStore('theme', () => {
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  const mode = ref<ThemeMode>(saved ?? 'system')
  // Реально применённая тёмная тема (с учётом system). Нужна для инверсии
  // темы у административных ячеек.
  const isDark = ref(resolveDark(mode.value))

  applyTheme(mode.value)

  watch(mode, (m) => {
    localStorage.setItem(STORAGE_KEY, m)
    applyTheme(m)
    isDark.value = resolveDark(m)
  })

  // Реагируем на смену системной темы, когда выбран режим system.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (mode.value === 'system') {
      applyTheme('system')
      isDark.value = resolveDark('system')
    }
  })

  function toggle() {
    // light → dark → system → light
    mode.value = mode.value === 'light' ? 'dark' : mode.value === 'dark' ? 'system' : 'light'
  }

  function setMode(m: ThemeMode) {
    mode.value = m
  }

  return { mode, isDark, toggle, setMode }
})
