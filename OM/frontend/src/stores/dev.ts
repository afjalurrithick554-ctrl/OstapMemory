import { defineStore } from 'pinia'
import { ref } from 'vue'

// Dev Mode — режим визуального фидбека: правый клик по элементу открывает
// модалку с CSS-путём элемента и полем комментария. Состояние не персистится:
// режим всегда выключен при загрузке.
export const useDevStore = defineStore('dev', () => {
  const isDevMode = ref(false)

  function toggle() {
    isDevMode.value = !isDevMode.value
  }

  return { isDevMode, toggle }
})
