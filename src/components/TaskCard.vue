<template>
  <div :class="['task-card', { 'is-dragging': isDragging }]">
    <span v-if="task.priority" :class="['priority-pin', `priority-pin--${task.priority}`]"></span>
    <div class="task-card__key mono">{{ task.formattedId || task.key }}</div>
    <div class="task-card__title">{{ task.title }}</div>
    
    <div class="task-card__tags" v-if="task.tags?.length">
      <Tag v-for="tag in task.tags" :key="tag.text" :text="tag.text" :color="tag.color" />
    </div>
    
    <div class="task-card__footer">
      <div class="task-card__meta">
        <span class="meta-item" v-if="task.hasDescription">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7"/></svg>
        </span>
        <span v-if="task.checklist" :class="['meta-item', { 'has-checklist-done': getDone(task.checklist) === getTotal(task.checklist) }]">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          {{ getDone(task.checklist) }}/{{ getTotal(task.checklist) }}
        </span>
      </div>
      <div class="task-card__assignees" v-if="task.assignees?.length">
        <img v-for="assignee in task.assignees" :key="assignee.id" :src="assignee.avatar" :alt="assignee.name">
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Tag from './Tag.vue'

defineProps<{
  task: {
    id: string | number
    formattedId?: string
    key?: string
    title: string
    priority?: string
    tags?: Array<{ text: string, color: string }>
    hasDescription?: boolean
    checklist?: { items: Array<{text: string, done: boolean}> } | { done: number, total: number }
    assignees?: Array<{ id: string | number, name: string, avatar: string }>
  }
  isDragging?: boolean
}>()

const getDone = (checklist: any) => {
  if (checklist.items) return checklist.items.filter((i:any) => i.done).length
  return checklist.done || 0
}
const getTotal = (checklist: any) => {
  if (checklist.items) return checklist.items.length
  return checklist.total || 0
}
</script>
