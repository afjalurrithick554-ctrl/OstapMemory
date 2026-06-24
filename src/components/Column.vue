<template>
  <div 
    :class="['column', { 'is-dragover': isDragover, 'is-active-mobile': isActiveMobile }]" 
    :id="column.id"
    :style="{ 
      borderColor: `color-mix(in srgb, ${column.color} 30%, transparent)`,
      backgroundColor: `color-mix(in srgb, ${column.color} 5%, transparent)`
    }"
  >
    <div class="column__header">
      <span class="column__dot" :style="{ background: `hsl(${spaceHue || 260}, 80%, 65%)` }"></span>
      <span class="column__title">{{ column.title }}</span>
      <span class="column__count">{{ cells.length }}</span>
      <div class="column__menu-btn" @click.stop="openContextMenu">
        <svg fill="currentColor" viewBox="0 0 20 20"><circle cx="4" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="16" cy="10" r="1.6"/></svg>
      </div>
    </div>
    
    <div class="column__body">
      <Cell 
        v-for="cell in sortedCells" 
        :key="cell.id" 
        :cell="cell" 
        :style="{ '--title-color': column.color }"
        @click="$emit('cell-click', cell)"
        @rename="$emit('rename-cell', $event)"
        @delete="$emit('delete-cell', $event)"
        @update-cell="$emit('update-cell', $event)"
      />
    </div>
    
    <div class="column__footer">
      <button class="add-cell-btn" @click="$emit('add-cell')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        Add cell
      </button>
    </div>

    <ContextMenu 
      ref="contextMenuRef" 
      :items="menuItems" 
      :hideTrigger="true"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Cell from './Cell.vue'
import ContextMenu from './ContextMenu.vue'

const props = defineProps<{
  column: {
    id: string
    title: string
    color: string
  }
  cells: Array<any>
  isDragover?: boolean
  isActiveMobile?: boolean
  spaceHue?: number
}>()

defineEmits(['cell-click', 'rename-cell', 'delete-cell', 'add-cell', 'update-cell'])

const sortMode = ref(localStorage.getItem(`ostap_sort_${props.column.id}`) || 'date-asc')

const setSortMode = (mode: string) => {
  sortMode.value = mode
  localStorage.setItem(`ostap_sort_${props.column.id}`, mode)
}

const contextMenuRef = ref<InstanceType<typeof ContextMenu> | null>(null)

const menuItems = computed(() => [
  { label: sortMode.value === 'date-desc' ? '✓ Date Added (Newest)' : 'Date Added (Newest)', action: () => setSortMode('date-desc') },
  { label: sortMode.value === 'date-asc' ? '✓ Date Added (Oldest)' : 'Date Added (Oldest)', action: () => setSortMode('date-asc') },
  { label: sortMode.value === 'deadline-asc' ? '✓ Deadline (Nearest)' : 'Deadline (Nearest)', action: () => setSortMode('deadline-asc') },
  { label: sortMode.value === 'deadline-desc' ? '✓ Deadline (Farthest)' : 'Deadline (Farthest)', action: () => setSortMode('deadline-desc') },
])

const openContextMenu = (e: MouseEvent) => {
  if (contextMenuRef.value) {
    contextMenuRef.value.openMenuAt(e.clientX, e.clientY)
  }
}

const sortedCells = computed(() => {
  const arr = [...props.cells]
  if (sortMode.value === 'date-asc') {
    arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  } else if (sortMode.value === 'date-desc') {
    arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } else if (sortMode.value === 'deadline-asc') {
    arr.sort((a, b) => {
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    })
  } else if (sortMode.value === 'deadline-desc') {
    arr.sort((a, b) => {
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(b.deadline).getTime() - new Date(a.deadline).getTime()
    })
  }
  return arr
})
</script>
