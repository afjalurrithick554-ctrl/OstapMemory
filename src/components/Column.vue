<template>
  <div :class="['column', { 'is-dragover': isDragover, 'is-active-mobile': isActiveMobile }]" :id="column.id">
    <div class="column__header">
      <span class="column__dot" :style="{ background: column.color }"></span>
      <span class="column__title">{{ column.title }}</span>
      <span class="column__count">{{ tasks.length }}</span>
      <div class="column__menu-btn">
        <svg fill="currentColor" viewBox="0 0 20 20"><circle cx="4" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="16" cy="10" r="1.6"/></svg>
      </div>
    </div>
    
    <div class="column__body">
      <TaskCard 
        v-for="task in tasks" 
        :key="task.id" 
        :task="task" 
        @click="$emit('task-click', task)"
      />
    </div>
    
    <div class="column__footer">
      <button class="add-task-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        Добавить задачу
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import TaskCard from './TaskCard.vue'

defineProps<{
  column: {
    id: string
    title: string
    color: string
  }
  tasks: Array<any>
  isDragover?: boolean
  isActiveMobile?: boolean
}>()

defineEmits(['task-click'])
</script>
