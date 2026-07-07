<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDevStore } from '@/stores/dev'
import DevFeedbackModal from './DevFeedbackModal.vue'

// Глобальный слой Dev Mode: при включённом режиме правый клик по любому
// элементу собирает его CSS-путь и открывает модалку фидбека.
const dev = useDevStore()
const { isDevMode } = storeToRefs(dev)

const modalOpen = ref(false)
const elementPath = ref('')

function buildPath(target: HTMLElement): string {
  const path: string[] = []
  let current: HTMLElement | null = target
  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase()
    if (current.id) {
      selector += `#${current.id}`
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .split(' ')
        .filter((c) => c && !c.includes('dev-hover'))
        .join('.')
      if (classes) selector += `.${classes}`
    }
    path.unshift(selector)
    current = current.parentElement
  }
  return path.join(' > ')
}

function handleContextMenu(e: MouseEvent) {
  if (!isDevMode.value) return
  const target = e.target as HTMLElement
  // Игнорируем тогл Dev Mode и саму модалку фидбека.
  if (target.closest('.dev-toggle') || target.closest('.dev-modal-overlay')) return

  e.preventDefault()
  e.stopPropagation()
  elementPath.value = buildPath(target)
  modalOpen.value = true
}

watch(
  isDevMode,
  (on) => {
    document.body.classList.toggle('dev-mode-active', on)
    if (on) {
      document.addEventListener('contextmenu', handleContextMenu, true)
    } else {
      document.removeEventListener('contextmenu', handleContextMenu, true)
      modalOpen.value = false
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  document.removeEventListener('contextmenu', handleContextMenu, true)
  document.body.classList.remove('dev-mode-active')
})
</script>

<template>
  <DevFeedbackModal
    v-if="modalOpen"
    :element-path="elementPath"
    @close="modalOpen = false"
  />
</template>
