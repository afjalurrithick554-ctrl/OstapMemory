<template>
  <div class="global-tracker" v-if="cells.length > 0">
    <div class="tracker-header" style="flex-direction: column; align-items: flex-start; justify-content: center;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="tracker-icon">⚡</span>
        <span class="tracker-title">In Progress</span>
      </div>
      <div class="tracker-sort-btn" @click.stop="openSortMenu" title="Сортировка">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/></svg>
        {{ sortLabel }}
      </div>
      <ContextMenu ref="sortMenuRef" :items="sortMenuItems" :hideTrigger="true" />
    </div>
    
    <div class="tracker-cells">
      <div 
        v-for="cell in sortedCells" 
        :key="cell.id" 
        class="tracker-mini-card"
        @click="$emit('open-cell', cell)"
      >
        <div class="tracker-card-header">
          <div class="tracker-card-badge" :style="{ backgroundColor: `hsl(${cell.space?.colorHue || 260}, 60%, 50%)` }">
            {{ cell.space?.name || 'Unknown' }}
          </div>
          <div class="tracker-card-key mono">{{ cell.key || `OM-${cell.id}` }}</div>
        </div>
        
        <div class="tracker-card-title" :style="{ color: `hsl(${cell.space?.colorHue || 260}, 60%, 50%)` }">{{ cell.title }}</div>
        
        <div class="tracker-card-footer">
          <div class="tracker-card-meta">
            <!-- Срок (Deadline) -->
            <span v-if="cell.deadline" class="meta-item sticker-deadline" :style="{ color: `hsl(${cell.space?.colorHue || 260}, 60%, 50%)` }">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              {{ new Date(cell.deadline).toLocaleDateString() }}
            </span>
            
            <!-- Чек-лист (Checklist) -->
            <span v-if="getTotal(cell.checklist) > 0" class="meta-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <div class="cell-mini-progress">
                <div class="cell-mini-progress-fill" :style="{ width: `${(getDone(cell.checklist) / getTotal(cell.checklist)) * 100}%`, backgroundColor: `hsl(${cell.space?.colorHue || 260}, 60%, 50%)` }"></div>
              </div>
              <span>{{ getDone(cell.checklist) }}/{{ getTotal(cell.checklist) }}</span>
            </span>
          </div>
          
          <!-- Исполнитель (Assignee) -->
          <div class="tracker-card-assignees" v-if="cell.assignee">
             <div class="assignee-placeholder" title="Assignee">{{ cell.assignee[0].toUpperCase() }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ContextMenu from './ContextMenu.vue'

const cells = ref<any[]>([])
const sortType = ref('oldest')

const sortLabel = computed(() => {
  if (sortType.value === 'newest') return 'Дальний дедлайн'
  return 'Ближайший дедлайн'
})

const sortedCells = computed(() => {
  return [...cells.value].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    
    const timeA = new Date(a.deadline).getTime()
    const timeB = new Date(b.deadline).getTime()
    
    if (sortType.value === 'oldest') {
      return timeA - timeB
    } else {
      return timeB - timeA
    }
  })
})

const sortMenuRef = ref<InstanceType<typeof ContextMenu> | null>(null)
const sortMenuItems = computed(() => [
  { label: sortType.value === 'oldest' ? '✓ Ближайший дедлайн' : 'Ближайший дедлайн', action: () => sortType.value = 'oldest' },
  { label: sortType.value === 'newest' ? '✓ Дальний дедлайн' : 'Дальний дедлайн', action: () => sortType.value = 'newest' }
])

const openSortMenu = (e: MouseEvent) => {
  if (sortMenuRef.value) sortMenuRef.value.openMenuAt(e.clientX, e.clientY)
}

const emit = defineEmits(['open-cell'])

const loadInProgressCells = async () => {
  try {
    const res = await fetch('http://localhost:3001/api/cells/in-progress')
    if (res.ok) {
      cells.value = await res.json()
    }
  } catch (err) {
    console.error('Failed to load in-progress cells', err)
  }
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

onMounted(() => {
  loadInProgressCells()
  
  // Добавим прослушиватель глобального события для обновления трекера
  window.addEventListener('refresh-tracker', loadInProgressCells)
})

onUnmounted(() => {
  window.removeEventListener('refresh-tracker', loadInProgressCells)
})
</script>

<style scoped>
.global-tracker {
  background-color: rgba(34, 197, 94, 0.05); /* Green tint */
  border-bottom: 1px solid rgba(34, 197, 94, 0.2);
  display: flex;
  align-items: center;
  padding: 12px 24px;
  min-height: 64px;
  width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
}

.tracker-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 24px;
  flex-shrink: 0;
}

.tracker-icon {
  font-size: 18px;
  color: #22c55e;
}

.tracker-title {
  font-weight: 600;
  color: #22c55e;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tracker-cells {
  display: flex;
  gap: 12px;
  flex: 1;
}

.tracker-empty {
  color: var(--text-secondary);
  font-size: 13px;
  font-style: italic;
  opacity: 0.7;
}

.tracker-mini-card {
  background: var(--bg-surface-1);
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 260px;
  max-width: 300px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tracker-mini-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent-purple);
  box-shadow: 0 4px 8px rgba(34, 197, 94, 0.15);
}

.tracker-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tracker-card-badge {
  font-size: 10px;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.tracker-card-key {
  font-size: 11px;
  color: var(--text-tertiary);
}

.tracker-card-title {
  font-weight: 500;
  font-size: 14px;
  line-height: 1.3;
  margin: 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tracker-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}

.tracker-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 12px;
}

.meta-item svg {
  width: 14px;
  height: 14px;
}

.sticker-deadline {
  /* color applied via inline style based on space hue */
}

.cell-mini-progress {
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.cell-mini-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.2s ease;
}

.assignee-placeholder {
  width: 21px; height: 21px;
  border-radius: 50%;
  background: var(--accent-purple);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: bold;
}

.tracker-sort-btn {
  cursor: pointer; 
  display: flex; 
  align-items: center; 
  gap: 4px; 
  color: var(--text-secondary); 
  font-size: 11px; 
  margin-top: 4px; 
  transition: color 0.2s;
}

.tracker-sort-btn:hover {
  color: var(--text-primary);
}
</style>
