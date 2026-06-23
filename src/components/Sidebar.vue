<template>
  <div :class="['app-sidebar', { 'is-collapsed': isCollapsed }]">
    <div class="app-sidebar__head">
      <div class="app-logo" v-show="!isCollapsed">OM</div>
      <div class="app-sidebar__brand" v-show="!isCollapsed">OstapMemory</div>
      <div class="app-sidebar__collapse" @click="isCollapsed = !isCollapsed">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
      </div>
    </div>
    
    <div class="app-sidebar__projects">
      <div 
        v-for="field in fields" 
        :key="field.id" 
        :class="['project-item', { 'is-active': activeFieldId === field.id }]"
        @click="$emit('select-field', field.id)"
        @contextmenu.prevent="openContextMenu($event, field.id)"
      >
        <span class="project-item__dot" style="background:var(--accent-purple)"></span>
        <span class="project-item__label">{{ field.name }}</span>
      </div>
    </div>

    <!-- Контекстное меню -->
    <div 
      v-if="contextMenu.visible" 
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
    >
      <div class="context-menu__item text-danger" @click="handleDelete">
        Delete
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isCollapsed = ref(false)

const props = defineProps<{
  fields: Array<any>
  activeFieldId: string | null
}>()

const emit = defineEmits(['select-field', 'delete-field'])

const contextMenu = ref({ visible: false, x: 0, y: 0, fieldId: null as string | null })

const openContextMenu = (e: MouseEvent, fieldId: string) => {
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    fieldId
  }
}

const closeContextMenu = () => {
  contextMenu.value.visible = false
}

onMounted(() => {
  document.addEventListener('click', closeContextMenu)
})
onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
})

const handleDelete = () => {
  if (contextMenu.value.fieldId) {
    emit('delete-field', contextMenu.value.fieldId)
  }
  closeContextMenu()
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: var(--bg-surface-2, #1f1f23);
  border: 1px solid var(--border-color, #2a2a30);
  border-radius: 8px;
  padding: 4px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  min-width: 120px;
}
.context-menu__item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}
.context-menu__item:hover {
  background: var(--bg-surface-3, #2a2a30);
  color: var(--text-primary);
}
.context-menu__item.text-danger {
  color: #ff4d4f;
}
.context-menu__item.text-danger:hover {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}
</style>
