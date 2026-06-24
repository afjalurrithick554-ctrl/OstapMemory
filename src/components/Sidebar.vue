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
      <div v-for="field in fields" :key="field.id">
        <div 
          :class="['project-item', { 'is-active': activeFieldId === field.id }]"
          @click="$emit('select-field', field.id)"
          @contextmenu.prevent="openContextMenu($event, field.id)"
        >
          <span class="project-item__dot" :style="{ background: 'hsl(' + field.colorHue + ', 80%, 65%)' }"></span>
          <span class="project-item__label">{{ field.name }}</span>
          <div class="project-item__menu-trigger" @click.stop="openContextMenu($event, field.id)">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </div>
        </div>

        <!-- Дерево Эпиков для активного пространства -->
        <div v-if="activeFieldId === field.id && rootEpics.length > 0" class="epic-tree">
          <div v-for="epic in rootEpics" :key="epic.id" class="epic-node">
            <div class="epic-item" @click.stop="$emit('open-cell', epic)">
              <!-- Иконка развертывания структуры -->
              <span class="epic-toggle" @click.stop="toggleEpic(epic.id)" v-if="hasSubEpics(epic)">
                <svg v-if="expandedEpics.has(epic.id)" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
              </span>
              <span class="epic-toggle-empty" v-else></span>
              <span class="epic-label">{{ epic.title }}</span>
            </div>
            
            <!-- Рекурсивный рендер подэпиков (только 1 уровень вложенности для простоты или рекурсивный компонент) -->
            <!-- Для простоты реализуем рендер под-эпиков через встроенный цикл, если нужно глубже, сделаем рекурсивный компонент. -->
            <div v-if="expandedEpics.has(epic.id)" class="sub-epic-tree">
               <div v-for="subEpic in getSubEpics(epic.id)" :key="subEpic.id" class="epic-item sub-epic" @click.stop="$emit('open-cell', subEpic)">
                  <span class="epic-toggle-empty"></span>
                  <span class="epic-label">{{ subEpic.title }}</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Контекстное меню -->
    <ContextMenu 
      ref="contextMenuRef" 
      :items="menuItems" 
      :hideTrigger="true"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ContextMenu from './ContextMenu.vue'

const isCollapsed = ref(false)

const props = defineProps<{
  fields: Array<any>
  activeFieldId: string | null
  cells: Array<any>
}>()

const emit = defineEmits(['select-field', 'delete-field', 'rename-field', 'open-cell'])

const expandedEpics = ref(new Set<number>())

const rootEpics = computed(() => {
  if (!props.cells) return []
  return props.cells.filter(c => !c.parentId && c.children && c.children.length > 0)
})

const getSubEpics = (parentId: number) => {
  if (!props.cells) return []
  return props.cells.filter(c => c.parentId === parentId && c.children && c.children.length > 0)
}

const hasSubEpics = (epic: any) => {
  return getSubEpics(epic.id).length > 0
}

const toggleEpic = (id: number) => {
  const newSet = new Set(expandedEpics.value)
  if (newSet.has(id)) newSet.delete(id)
  else newSet.add(id)
  expandedEpics.value = newSet
}

const contextMenuRef = ref<InstanceType<typeof ContextMenu> | null>(null)
const contextMenuFieldId = ref<string | null>(null)

const menuItems = computed(() => [
  { label: 'Rename', action: () => { if (contextMenuFieldId.value) emit('rename-field', contextMenuFieldId.value) } },
  { label: 'Delete', isDanger: true, action: () => { if (contextMenuFieldId.value) emit('delete-field', contextMenuFieldId.value) } }
])

const openContextMenu = (e: MouseEvent, fieldId: string) => {
  contextMenuFieldId.value = fieldId
  if (contextMenuRef.value) {
    contextMenuRef.value.openMenuAt(e.clientX, e.clientY)
  }
}
</script>

<style scoped>
.epic-tree {
  margin-top: 4px;
  margin-bottom: 8px;
}
.epic-node {
  display: flex;
  flex-direction: column;
}
.epic-item {
  display: flex;
  align-items: center;
  padding: 6px 12px 6px 24px;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  transition: background 0.2s, color 0.2s;
}
.epic-item:hover {
  background: var(--bg-surface-3);
  color: var(--text-primary);
}
.epic-item.sub-epic {
  padding-left: 44px;
}
.epic-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 6px;
  border-radius: 4px;
  cursor: pointer;
}
.epic-toggle:hover {
  background: var(--bg-surface-1);
}
.epic-toggle-empty {
  width: 20px;
  height: 20px;
  margin-right: 6px;
}
.epic-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
