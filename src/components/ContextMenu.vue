<template>
  <div class="context-menu-wrapper" @click.stop="toggleMenu" v-click-outside="closeMenu" v-show="!hideTrigger">
    <slot name="trigger">
      <div class="context-menu-trigger">
        <svg fill="currentColor" viewBox="0 0 20 20" width="16" height="16">
          <circle cx="4" cy="10" r="1.6"/>
          <circle cx="10" cy="10" r="1.6"/>
          <circle cx="16" cy="10" r="1.6"/>
        </svg>
      </div>
    </slot>

    <Teleport to="body">
      <div 
        v-if="isOpen" 
        class="context-menu-dropdown" 
        :style="dropdownStyle"
        @click.stop
      >
        <div 
          v-for="(item, index) in items" 
          :key="index"
          :class="['context-menu-item', { 'text-danger': item.isDanger }]"
          @click="handleItemClick(item)"
        >
          {{ item.label }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'

export interface ContextMenuItem {
  label: string
  isDanger?: boolean
  action: () => void
}

defineProps<{
  items: ContextMenuItem[]
  hideTrigger?: boolean
}>()

const isOpen = ref(false)
const dropdownStyle = ref({})

const toggleMenu = (event: MouseEvent) => {
  if (isOpen.value) {
    isOpen.value = false
    return
  }
  
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  
  dropdownStyle.value = {
    position: 'absolute',
    top: `${rect.bottom + window.scrollY + 4}px`,
    left: `${rect.left + window.scrollX}px`,
    zIndex: 1000
  }
  
  isOpen.value = true
}

const closeMenu = () => {
  isOpen.value = false
}

const openMenuAt = (x: number, y: number) => {
  dropdownStyle.value = {
    position: 'fixed',
    top: `${y}px`,
    left: `${x}px`,
    zIndex: 1000
  }
  isOpen.value = true
}

defineExpose({
  openMenuAt,
  closeMenu
})

const handleItemClick = (item: ContextMenuItem) => {
  isOpen.value = false
  item.action()
}

// Click outside directive logic implemented inline for simplicity
const handleClickOutside = (event: MouseEvent) => {
  if (isOpen.value) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.context-menu-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.context-menu-trigger {
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: background-color 0.2s, color 0.2s;
}

.context-menu-trigger:hover {
  background-color: var(--surface-hover);
  color: var(--text-primary);
}

.context-menu-dropdown {
  background: var(--bg-mid);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--radius-md);
  padding: 4px;
  min-width: 140px;
  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.15);
}

.context-menu-item {
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background 0.15s ease, color 0.15s ease;
  color: var(--text-primary);
}

.context-menu-item:hover {
  background: var(--surface-hover);
}

.context-menu-item.text-danger {
  color: var(--priority-high);
}

.context-menu-item.text-danger:hover {
  background: var(--surface-hover);
  color: var(--priority-high);
}
</style>
