import { createI18n } from 'vue-i18n'
import ruRU from './locales/ru-RU'
import enUS from './locales/en-US'

export const SUPPORTED_LOCALES = ['ru-RU', 'en-US'] as const
export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_LABELS: Record<LocaleCode, string> = {
  'ru-RU': 'Русский',
  'en-US': 'English',
}

const STORAGE_KEY = 'om-locale'

function detectLocale(): LocaleCode {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && SUPPORTED_LOCALES.includes(saved as LocaleCode)) {
    return saved as LocaleCode
  }
  // Русская локаль — первая/по умолчанию (правило проекта)
  return 'ru-RU'
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: detectLocale(),
  fallbackLocale: 'en-US',
  messages: {
    'ru-RU': ruRU,
    'en-US': enUS,
  },
})

export function persistLocale(locale: LocaleCode) {
  localStorage.setItem(STORAGE_KEY, locale)
}
