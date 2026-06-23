<template>
  <div class="modal-backdrop" style="display: flex;" @click.self="$emit('close')">
    <div class="task-modal">
      <div class="task-modal__header">
        <div class="task-modal__key mono">{{ task?.key || 'TES-000' }}</div>
        <div class="status-select">
          <span class="status-tab__dot" :style="{ background: columnColor }"></span>
          {{ columnTitle }}
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div class="task-modal__header-spacer"></div>
        <div class="modal-close-btn" @click="$emit('close')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </div>
      </div>
      
      <div class="task-modal__body">
        <div class="task-modal__main">
          <h2 class="task-modal__title">{{ task?.title || 'Загрузка...' }}</h2>
          
          <div class="task-modal__description" v-if="task?.hasDescription">
            <p>Это пример описания задачи. В будущем здесь будет рендериться Markdown.</p>
          </div>
          
          <div class="checklist-block" v-if="task?.checklist && task.checklist.items">
            <div class="section-label">Чек-лист ({{ getDone(task.checklist) }}/{{ getTotal(task.checklist) }})</div>
            <div class="checklist-progress-track">
              <div class="checklist-progress-fill" :style="{ width: `${(getDone(task.checklist) / getTotal(task.checklist)) * 100}%` }"></div>
            </div>
            <label 
              v-for="(item, idx) in task.checklist.items" 
              :key="idx" 
              :class="['checklist-item', { 'is-done': item.done }]"
            >
              <input type="checkbox" v-model="item.done">
              <span>{{ item.text }}</span>
            </label>
          </div>
          
          <div class="comments-block">
            <div class="section-label">Обсуждение</div>
            <div class="comment-input-row">
              <img src="https://i.pravatar.cc/150?img=33" alt="">
              <div class="comment-textarea-wrap">
                <textarea placeholder="Оставить комментарий..."></textarea>
              </div>
            </div>
            <div class="comment-send-row">
              <button class="send-btn">Отправить</button>
            </div>
          </div>
        </div>
        
        <div class="task-modal__sidebar">
          <div class="sidebar-section">
            <div class="section-label">Исполнители</div>
            <div class="sidebar-people">
              <img v-for="assignee in task?.assignees || []" :key="assignee.id" :src="assignee.avatar" :alt="assignee.name" style="width: 28px; height: 28px; border-radius: 50%;">
            </div>
          </div>
          <div class="sidebar-section">
            <div class="section-label">Теги</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <Tag v-for="tag in task?.tags || []" :key="tag.text" :text="tag.text" :color="tag.color" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Tag from './Tag.vue'

defineProps<{
  task: any
  columnTitle?: string
  columnColor?: string
}>()

defineEmits(['close'])

const getDone = (checklist: any) => {
  if (checklist.items) return checklist.items.filter((i:any) => i.done).length
  return checklist.done || 0
}
const getTotal = (checklist: any) => {
  if (checklist.items) return checklist.items.length
  return checklist.total || 0
}
</script>
