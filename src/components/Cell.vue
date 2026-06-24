<template>
  <div :class="['cell', { 'is-dragging': isDragging }]">
    <span v-if="cell.priority" :class="['priority-pin', `priority-pin--${cell.priority}`]"></span>
    <div class="cell__key mono" style="display: flex; justify-content: space-between; align-items: center; position: relative;">
      <span>{{ cell.formattedId || cell.key }}</span>
      <div class="cell__menu-container">
        <ContextMenu :items="menuItems" />
      </div>
    </div>
    <div class="cell__seo-group">
      <div class="cell__title">{{ cell.title }}</div>
      
      <div class="cell__description-preview">
        <div v-if="isEditingDesc" class="desc-editor" @click.stop>
          <textarea 
            v-model="editDescValue" 
            @blur="saveDescription"
            @keydown.esc="cancelEditing"
            @keydown.enter.prevent="saveDescription"
            ref="descTextarea"
            placeholder="Заполните описание задачи..."
            rows="3"
          ></textarea>
        </div>
        <div v-else class="desc-viewer" :class="{ 'is-empty': !cell.description }" @click.stop="startEditingDesc">
          {{ cell.description || 'Заполните описание задачи' }}
        </div>
      </div>
    </div>
    
    <div class="cell__tags" v-if="cell.tags?.length">
      <Tag v-for="tag in cell.tags" :key="tag.text" :text="tag.text" :color="tag.color" />
    </div>
    
    <div class="cell__footer">
      <div class="cell__meta">
        <div class="sticker-add" @click.stop="openStickerMenu" title="Add Sticker">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        </div>
        <ContextMenu ref="stickerMenuRef" :items="stickerMenuItems" :hideTrigger="true" />
        <input type="date" ref="dateInput" style="position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0;" @change="handleDeadlineChange">

        <span class="meta-item sticker-deadline" v-if="cell.deadline" title="Deadline" :style="{ color: 'var(--title-color)', cursor: 'pointer' }" @click.stop="openDatePicker">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          {{ new Date(cell.deadline).toLocaleDateString() }}
        </span>

        <span class="meta-item" v-if="cell.hasDescription">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7"/></svg>
        </span>
        <span class="meta-item" :style="{ color: 'var(--title-color)', cursor: 'pointer' }" @click="handleChecklistClick">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <div class="cell-mini-progress" v-if="getTotal(cell.checklist) > 0">
            <div class="cell-mini-progress-fill" :style="{ width: `${getTotal(cell.checklist) > 0 ? (getDone(cell.checklist) / getTotal(cell.checklist)) * 100 : 0}%`, backgroundColor: 'var(--title-color)' }"></div>
          </div>
          <span>{{ getDone(cell.checklist) }}/{{ getTotal(cell.checklist) }}</span>
        </span>
        <ContextMenu ref="checklistMenuRef" :items="checklistMenuItems" :hideTrigger="true" />
      </div>
      <div class="cell__assignees" v-if="cell.assignees?.length">
        <img v-for="assignee in cell.assignees" :key="assignee.id" :src="assignee.avatar" :alt="assignee.name">
      </div>
      <div class="cell__assignees" v-else-if="cell.assignee">
        <div class="assignee-placeholder" title="Assignee">{{ cell.assignee[0].toUpperCase() }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, inject } from 'vue'
import Tag from './Tag.vue'
import ContextMenu from './ContextMenu.vue'
import { useGlobalModals } from '../composables/useGlobalModals'

const props = defineProps<{
  cell: {
    id: string | number
    formattedId?: string
    key?: string
    title: string
    description?: string
    state: string
    priority?: string
    tags?: Array<{ text: string, color: string }>
    hasDescription?: boolean
    checklist?: { items: Array<{text: string, done: boolean}> } | { done: number, total: number } | string
    assignees?: Array<{ id: string | number, name: string, avatar: string }>
    assignee?: string
    deadline?: string | Date
  }
  isDragging?: boolean
}>()

const isEditingDesc = ref(false)
const editDescValue = ref('')
const descTextarea = ref<HTMLTextAreaElement | null>(null)

const emit = defineEmits(['rename', 'delete', 'update-cell'])

const startEditingDesc = async () => {
  editDescValue.value = props.cell.description || ''
  isEditingDesc.value = true
  await nextTick()
  descTextarea.value?.focus()
}

const cancelEditing = () => {
  isEditingDesc.value = false
}

const saveDescription = () => {
  if (!isEditingDesc.value) return
  isEditingDesc.value = false
  if (editDescValue.value !== props.cell.description) {
    emit('update-cell', { ...props.cell, description: editDescValue.value })
  }
}

const getDone = (checklist: any) => {
  if (!checklist) return 0
  if (checklist.items) return checklist.items.filter((i:any) => i.done).length
  return checklist.done || 0
}
const getTotal = (checklist: any) => {
  if (!checklist) return 0
  if (checklist.items) return checklist.items.length
  return checklist.total || 0
}

const menuItems = computed(() => [
  { label: 'Rename', action: () => emit('rename', props.cell) },
  { label: 'Delete', isDanger: true, action: () => emit('delete', props.cell) }
])

const { showPrompt } = useGlobalModals()
const stickerMenuRef = ref<InstanceType<typeof ContextMenu> | null>(null)
const dateInput = ref<HTMLInputElement | null>(null)

const stickerMenuItems = computed(() => [
  { label: 'Add Deadline', action: () => dateInput.value?.showPicker() },
  { label: 'Add Assignee', action: async () => {
    const options = [
      { label: 'Boba 🐒', value: 'boba' },
      { label: 'Ostap 💻', value: 'ostap' }
    ]
    const name = await showPrompt('Select assignee:', props.cell.assignee || '', options)
    if (name) emit('update-cell', { ...props.cell, assignee: name })
  }}
])

const openStickerMenu = (e: MouseEvent) => {
  if (stickerMenuRef.value) {
    stickerMenuRef.value.openMenuAt(e.clientX, e.clientY)
  }
}

const handleDeadlineChange = (e: Event) => {
  const val = (e.target as HTMLInputElement).value
  if (val) emit('update-cell', { ...props.cell, deadline: new Date(val).toISOString() })
}

const openDatePicker = () => {
  dateInput.value?.showPicker()
}

const checklistMenuRef = ref<InstanceType<typeof ContextMenu> | null>(null)

const checklistMenuItems = computed(() => {
  if (!props.cell.checklist?.items) return []
  return props.cell.checklist.items.map((item: any, idx: number) => ({
    label: `${item.done ? '✅' : '⏳'} ${item.text}`,
    action: () => {
      const currentChecklist = { 
        ...(props.cell.checklist as any), 
        items: [...(props.cell.checklist as any).items] 
      }
      currentChecklist.items[idx] = { ...item, done: !item.done }
      emit('update-cell', { ...props.cell, checklist: currentChecklist })
    }
  }))
})

const handleChecklistClick = (e: MouseEvent) => {
  if (getTotal(props.cell.checklist) > 0) {
    e.stopPropagation()
    openChecklistMenu(e)
  }
}

const openChecklistMenu = (e: MouseEvent) => {
  if (checklistMenuRef.value) {
    checklistMenuRef.value.openMenuAt(e.clientX, e.clientY)
  }
}
</script>

<style scoped>
.cell__seo-group {
  margin: 6px 0 10px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cell__title {
  font-weight: 500;
  color: var(--title-color, var(--accent-purple)); /* Matches column color */
  font-size: 15px;
  line-height: 1.3;
  cursor: pointer;
  transition: opacity 0.2s, text-decoration 0.2s;
  display: inline-block;
  margin-bottom: 2px;
}

.cell__title:hover {
  text-decoration: underline;
  opacity: 0.8; /* Dynamic hover effect */
}

.cell__description-preview {
  margin: 0;
  font-size: 13px;
  color: var(--text-tertiary);
}

.desc-viewer {
  padding: 6px 8px;
  border-radius: 4px;
  background: var(--bg-surface-2);
  border: 1px solid var(--border-color); /* Added permanent contour */
  cursor: text;
  white-space: pre-wrap;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: border-color 0.2s;
  line-height: 1.4;
  max-height: calc(1.4em * 2 + 12px);
}

.desc-viewer:hover {
  background: var(--surface-hover);
  border-color: var(--accent-purple); /* Highlight contour on hover */
}

.desc-viewer.is-empty {
  font-style: italic;
  opacity: 0.6;
}

.desc-editor textarea {
  width: 100%;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid var(--accent-purple);
  background: var(--bg-surface-3);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  resize: vertical;
  outline: none;
}

.sticker-add {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.sticker-add:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}
.sticker-add svg { width: 14px; height: 14px; }
.sticker-deadline { color: var(--priority-mid); }
.assignee-placeholder {
  width: 21px; height: 21px;
  border-radius: 50%;
  background: var(--accent-purple);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: bold;
}

.cell-mini-progress {
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  display: flex;
}

.cell-mini-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.2s ease, background-color 0.2s ease;
}
</style>
