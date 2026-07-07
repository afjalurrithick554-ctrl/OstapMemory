import { defineStore } from 'pinia'
import { ref } from 'vue'
import { i18n, persistLocale, SUPPORTED_LOCALES, type LocaleCode } from '@/i18n'

export const useLocaleStore = defineStore('locale', () => {
  const current = ref<LocaleCode>(i18n.global.locale.value as LocaleCode)

  function setLocale(locale: LocaleCode) {
    current.value = locale
    i18n.global.locale.value = locale
    persistLocale(locale)
  }

  function toggle() {
    const idx = SUPPORTED_LOCALES.indexOf(current.value)
    setLocale(SUPPORTED_LOCALES[(idx + 1) % SUPPORTED_LOCALES.length])
  }

  return { current, setLocale, toggle }
})
