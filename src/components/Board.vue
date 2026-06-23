<template>
  <div class="board" v-if="columns.length > 0">
    <Column 
      v-for="column in columns" 
      :key="column.id" 
      :column="column"
      :tasks="getTasksForColumn(column.id)"
      :isActiveMobile="activeMobileColumn === column.id"
      @task-click="$emit('task-click', $event)"
    />
    <div class="add-column-btn" @click="$emit('add-card')">
      <span class="icon">+</span> Add card
    </div>
  </div>
  <div class="board-empty" v-else>
    <div class="empty-state">
      <div class="empty-icon">📝</div>
      <h3>This space is empty</h3>
      <p>Create your first card to get started!</p>
      <button class="btn btn-primary" @click="$emit('add-card')">+ Add card</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Column from './Column.vue'

const props = defineProps<{
  columns: Array<{ id: string, title: string, color: string }>
  tasks: Array<any>
  activeMobileColumn?: string
}>()

defineEmits(['task-click', 'add-card'])

function getTasksForColumn(columnId: string) {
  return props.tasks.filter(t => t.columnId === columnId)
}
</script>

<style scoped>
.add-column-btn {
  min-width: 320px;
  width: 320px;
  height: fit-content;
  background: var(--bg-surface-2);
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.add-column-btn:hover {
  background: var(--bg-surface-3);
  color: var(--text-primary);
  border-color: var(--text-secondary);
}

.icon {
  font-size: 1.2rem;
  margin-right: 8px;
}

.board-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px;
  background: var(--bg-surface-2);
  border: 1px dashed var(--border-color);
  border-radius: 16px;
  max-width: 400px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-weight: 600;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent-purple, #9d5bfe);
  color: #fff;
}

.btn-primary:hover {
  opacity: 0.9;
}
</style>
