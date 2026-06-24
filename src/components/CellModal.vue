<template>
  <div class="modal-backdrop" style="display: flex;" @click.self="$emit('close')">
    <div class="cell-modal">
      <div class="cell-modal__header">
        <div class="cell-modal__key mono">{{ cell?.key || 'TES-000' }}</div>
        <div class="status-select" style="cursor: default;" title="Статус переключается автоматически">
          <span class="status-tab__dot" :style="{ background: columnColor }"></span>
          {{ columnTitle }}
        </div>
        <div class="cell-modal__header-spacer"></div>
        <div class="modal-close-btn" @click="$emit('close')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </div>
      </div>
      
      <div class="cell-modal__body">
        <div class="cell-modal__main">
          <h2 class="cell-modal__title">{{ cell?.title || 'Loading...' }}</h2>
          
          <div class="cell-modal__description">
            <textarea 
              v-model="descValue" 
              @blur="updateField('description', descValue)"
              placeholder="Добавьте более подробное описание..."
              class="modal-textarea"
              rows="4"
            ></textarea>
            <div class="desc-actions">
              <button class="save-desc-btn" @click="updateField('description', descValue)">Сохранить</button>
            </div>
          </div>
          
          <div class="checklist-block">
            <div class="section-label">Критерии приёмки ({{ getDone(cell?.checklist) }}/{{ getTotal(cell?.checklist) }})</div>
            <div class="checklist-progress-track" v-if="getTotal(cell?.checklist) > 0">
              <div class="checklist-progress-fill" :style="{ width: `${(getDone(cell?.checklist) / getTotal(cell?.checklist)) * 100}%` }"></div>
            </div>
            <div 
              v-for="(item, idx) in (cell?.checklist?.items || [])" 
              :key="idx" 
              :class="['checklist-item', { 'is-done': item.done }]"
            >
              <label style="display: flex; align-items: center; gap: 8px; flex: 1; cursor: pointer;">
                <input type="checkbox" v-model="item.done" @change="updateField('checklist', cell.checklist)">
                <span>{{ item.text }}</span>
              </label>
              <button class="delete-checklist-btn" @click="removeChecklistItem(idx)" title="Удалить">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div class="add-checklist-item" style="display: flex; gap: 8px; align-items: center;">
              <input type="text" v-model="newChecklistItem" @keydown.enter="addChecklistItem" placeholder="+ Добавить критерий (Enter)..." class="checklist-input">
              <button class="btn btn--primary" @click="addChecklistItem" style="margin-top: 8px; white-space: nowrap;">Добавить</button>
            </div>
          </div>
          
          <div class="comments-block">
            <div class="section-label">Discussion</div>
            <div class="comment-input-row">
              <img src="https://i.pravatar.cc/150?img=33" alt="">
              <div class="comment-textarea-wrap">
                <textarea placeholder="Leave a comment..."></textarea>
              </div>
            </div>
            <div class="comment-send-row">
              <button class="send-btn">Send</button>
            </div>
          </div>
        </div>
        
        <div class="cell-modal__sidebar">
          <div class="sidebar-section">
            <div class="section-label">Исполнитель (Assignee)</div>
            <select v-model="selectedAssignee" @change="updateField('assignee', selectedAssignee)" class="modal-select">
              <option value="">Не назначен</option>
              <option v-for="user in assigneesList" :key="user.id" :value="user.id">
                {{ user.avatar }} {{ user.name }}
              </option>
            </select>
          </div>
          <div class="sidebar-section">
            <div class="section-label">Срок (Deadline)</div>
            <input type="date" v-model="deadlineValue" @change="updateField('deadline', deadlineValue)" class="modal-input">
          </div>
          <div class="sidebar-section">
            <div class="section-label">Tags</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <Tag v-for="tag in cell?.tags || []" :key="tag.text" :text="tag.text" :color="tag.color" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Tag from './Tag.vue'

const props = defineProps<{
  cell: any
  columnTitle?: string
  columnColor?: string
}>()

const emit = defineEmits(['close', 'update'])

// Локальное состояние для редактирования
const descValue = ref(props.cell?.description || '')
const selectedAssignee = ref(props.cell?.assignee || '')
const deadlineValue = ref(props.cell?.deadline ? new Date(props.cell.deadline).toISOString().substring(0, 10) : '')

watch(() => props.cell, (newCell) => {
  descValue.value = newCell?.description || ''
  selectedAssignee.value = newCell?.assignee || ''
  deadlineValue.value = newCell?.deadline ? new Date(newCell.deadline).toISOString().substring(0, 10) : ''
}, { deep: true })

const newChecklistItem = ref('')

const addChecklistItem = () => {
  if (!newChecklistItem.value.trim()) return
  
  const currentChecklist = props.cell?.checklist && props.cell.checklist.items 
    ? { ...props.cell.checklist, items: [...props.cell.checklist.items] } 
    : { items: [] }
    
  currentChecklist.items.push({ text: newChecklistItem.value.trim(), done: false })
  newChecklistItem.value = ''
  
  updateField('checklist', currentChecklist)
}

const removeChecklistItem = (index: number) => {
  if (!props.cell?.checklist?.items) return
  
  const currentChecklist = { 
    ...props.cell.checklist, 
    items: [...props.cell.checklist.items] 
  }
  
  currentChecklist.items.splice(index, 1)
  updateField('checklist', currentChecklist)
}

const updateField = (field: string, value: any) => {
  emit('update', { ...props.cell, [field]: value })
}

const getDone = (checklist: any) => {
  if (!checklist) return 0
  if (typeof checklist === 'string') {
    try { const parsed = JSON.parse(checklist); return parsed.filter((i:any) => i.done).length } catch(e) { return 0 }
  }
  if (checklist.items) return checklist.items.filter((i:any) => i.done).length
  return checklist.done || 0
}

const getTotal = (checklist: any) => {
  if (!checklist) return 0
  if (typeof checklist === 'string') {
    try { const parsed = JSON.parse(checklist); return parsed.length } catch(e) { return 0 }
  }
  if (checklist.items) return checklist.items.length
  return checklist.total || 0
}

const assigneesList = [
  { id: 'boba', name: 'Boba', avatar: '🐒' },
  { id: 'ostap', name: 'Ostap', avatar: '💻' }
]
</script>

<style scoped>
.modal-textarea {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface-1);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  min-height: 100px;
}

.modal-textarea:focus {
  outline: none;
  border-color: var(--accent-purple);
}

.desc-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.save-desc-btn {
  background: var(--accent-purple);
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.save-desc-btn:hover {
  opacity: 0.9;
}

.modal-select, .modal-input {
  width: 100%;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface-2);
  color: var(--text-primary);
  font-size: 14px;
  margin-top: 4px;
}

.modal-select:focus, .modal-input:focus {
  outline: none;
  border-color: var(--accent-purple);
}

.checklist-input {
  width: 100%;
  padding: 8px 0;
  border: none;
  border-bottom: 1px dashed var(--border-color);
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  margin-top: 8px;
  outline: none;
}

.checklist-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.delete-checklist-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.checklist-item:hover .delete-checklist-btn {
  opacity: 0.6;
}

.delete-checklist-btn:hover {
  opacity: 1 !important;
  color: #ef4444;
}
</style>
