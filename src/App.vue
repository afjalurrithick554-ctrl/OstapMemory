<template>
  <div class="app" :data-theme="theme">
    <Sidebar 
      :fields="fields" 
      :activeFieldId="activeFieldId" 
      :cells="cells"
      @select-field="activeFieldId = $event" 
      @delete-field="handleDeleteSpace"
      @rename-field="handleRenameSpace"
      @open-cell="openCell"
    />
    <div class="app-main">
      <Header 
        :fields="fields" 
        :activeFieldId="activeFieldId" 
        :isDevMode="isDevMode"
        @update:isDevMode="isDevMode = $event"
        @toggle-theme="toggleTheme" 
        @add-field="addField"
        @select-field="activeFieldId = $event"
      />
      <GlobalTracker @open-cell="openCell" />
      <div class="status-tabs" id="status-tabs">
        <div 
          v-for="col in columns" 
          :key="col.id" 
          :class="['status-tab', { 'is-active': activeMobileColumn === col.id }]"
          @click="activeMobileColumn = col.id"
        >
          <span class="status-tab__dot" :style="{ background: col.color }"></span>
          {{ col.title }} <span class="status-tab__count">{{ getCellsForColumn(col.id).length }}</span>
        </div>
      </div>
      <Board 
        v-if="activeFieldId"
        :columns="columns" 
        :cells="cells" 
        :activeMobileColumn="activeMobileColumn"
        :spaceHue="activeSpaceHue"
        @cell-click="openCell" 
        @add-cell="showCellModal = true"
        @rename-cell="handleRenameCell"
        @delete-cell="handleDeleteCell"
        @update-cell="handleUpdateCell"
      />
      <div v-else class="no-space-selected">
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <h3>No Space Selected</h3>
          <p>Create or select a space from the sidebar to get started.</p>
          <button class="btn btn--primary" @click="addField">+ Add space</button>
        </div>
      </div>
    </div>
    
    <CellModal 
      v-if="selectedCell" 
      :cell="selectedCell" 
      :columnTitle="getColumnTitle(selectedCell.columnId)"
      :columnColor="getColumnColor(selectedCell.columnId)"
      @close="selectedCell = null"
      @update="handleUpdateCell"
      @create-subtask="openCreateSubtask"
    />

    <SpaceModal
      v-if="showSpaceModal"
      @close="showSpaceModal = false"
      @submit="handleCreateSpace"
    />

    <CreateCellModal
      v-if="showCellModal"
      :parentCell="parentCellForNew"
      @close="closeCellModal"
      @submit="handleCreateCell"
    />

    <DevFeedbackModal 
      v-if="showDevFeedbackModal"
      :elementPath="devFeedbackElement"
      @close="showDevFeedbackModal = false"
      @submit="handleDevFeedbackSubmit"
    />

    <PromptModal 
      v-if="promptState.isOpen"
      :message="promptState.message"
      :initialValue="promptState.initialValue"
      @close="handlePromptClose(null)"
      @submit="handlePromptClose"
    />

    <ConfirmModal 
      v-if="confirmState.isOpen"
      :message="confirmState.message"
      @close="handleConfirmClose(false)"
      @submit="handleConfirmClose(true)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, provide } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Header from './components/Header.vue'
import GlobalTracker from './components/GlobalTracker.vue'
import Board from './components/Board.vue'
import CellModal from './components/CellModal.vue'
import SpaceModal from './components/SpaceModal.vue'
import CreateCellModal from './components/CreateCellModal.vue'
import DevFeedbackModal from './components/DevFeedbackModal.vue'
import PromptModal from './components/PromptModal.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import { useEntityAction } from './composables/useEntityAction'
import { useGlobalModals } from './composables/useGlobalModals'

const { promptState, handlePromptClose, confirmState, handleConfirmClose } = useGlobalModals()

// Управление темой
const theme = ref('dark')
const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
}

onMounted(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
})

// Dev Mode
const isDevMode = ref(false)
const showDevFeedbackModal = ref(false)
const devFeedbackElement = ref('')

watch(isDevMode, (val) => {
  if (val) document.body.classList.add('dev-mode-active')
  else document.body.classList.remove('dev-mode-active')
})

const handleGlobalClick = (e: MouseEvent) => {
  if (!isDevMode.value) return
  
  const target = e.target as HTMLElement
  
  if (target.id === 'dev-switch' || target.closest('.dev-toggle')) return
  
  e.preventDefault()
  e.stopPropagation()
  
  const path = []
  let current: HTMLElement | null = target
  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase()
    if (current.id) selector += `#${current.id}`
    else if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c => c && !c.includes('dev-hover')).join('.')
        if (classes) selector += `.${classes}`
    }
    path.unshift(selector)
    current = current.parentElement
  }
  const fullPath = path.join(' > ')
  
  devFeedbackElement.value = fullPath
  showDevFeedbackModal.value = true
}

const handleDevFeedbackSubmit = ({ element, comment }: { element: string, comment: string }) => {
  showDevFeedbackModal.value = false
  fetch('http://localhost:3001/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ element, comment })
  }).catch(err => {
    console.error('Failed to send feedback', err)
    alert('Error sending comment')
  })
}

onMounted(() => {
  document.addEventListener('contextmenu', handleGlobalClick, true)
})

onUnmounted(() => {
  document.removeEventListener('contextmenu', handleGlobalClick, true)
})

// Состояние полей (проектов/пространств)
const fields = ref<any[]>([])
const activeFieldId = ref<string | null>(null)
const showSpaceModal = ref(false)

const activeSpaceHue = computed(() => {
  const space = fields.value.find(f => f.id === activeFieldId.value)
  return space ? space.colorHue : 260
})

const loadSpaces = async () => {
  try {
    const res = await fetch('http://localhost:3001/api/spaces')
    if (res.ok) {
      const data = await res.json()
      fields.value = data
      if (data.length > 0 && !activeFieldId.value) {
        activeFieldId.value = data[0].id
      }
    }
  } catch (err) {
    console.error('Failed to load spaces', err)
  }
}

watch(activeFieldId, (newId) => {
  if (newId) {
    loadCells(newId)
  } else {
    cells.value = []
  }
})

onMounted(() => {
  loadSpaces()
})

const addField = () => {
  showSpaceModal.value = true
}

const handleCreateSpace = async (name: string) => {
  try {
    const res = await fetch('http://localhost:3001/api/spaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    if (res.ok) {
      const newSpace = await res.json()
      fields.value.push(newSpace)
      activeFieldId.value = newSpace.id
      showSpaceModal.value = false
    } else {
      console.error('Failed to create space')
    }
  } catch (err) {
    console.error('Failed to create space request', err)
  }
}

const { renameEntity: renameSpace, deleteEntity: deleteSpace } = useEntityAction('spaces')

const handleDeleteSpace = (id: string) => {
  const space = fields.value.find(f => f.id === id)
  if (!space) return
  deleteSpace(id, space.name, () => {
    fields.value = fields.value.filter(f => f.id !== id)
    if (activeFieldId.value === id) {
      activeFieldId.value = fields.value.length > 0 ? fields.value[0].id : null
    }
  })
}

const handleRenameSpace = (id: string) => {
  const space = fields.value.find(f => f.id === id)
  if (!space) return
  renameSpace(id, space.name, 'name', (newName) => {
    space.name = newName
  })
}

// Мобильное представление
const activeMobileColumn = ref('Idea')

// Выбранная ячейка для модалки
const selectedCell = ref<any>(null)
const openCell = (cell: any) => {
  selectedCell.value = cell
}

// Данные ячеек (реальные из БД)
const cells = ref<any[]>([])

const loadCells = async (spaceId: string) => {
  try {
    const res = await fetch(`http://localhost:3001/api/spaces/${spaceId}/cells`)
    if (res.ok) {
      cells.value = await res.json()
    }
  } catch (err) {
    console.error('Failed to load cells', err)
  }
}

// Создание новой ячейки
const showCellModal = ref(false)
const parentCellForNew = ref<any>(null)

const openCreateSubtask = (parent: any) => {
  parentCellForNew.value = parent
  showCellModal.value = true
}

const closeCellModal = () => {
  showCellModal.value = false
  parentCellForNew.value = null
}

const evaluateCellState = (cell: any) => {
  const currentState = cell.state || 'Idea';
  
  if (currentState === 'Idea' || currentState === 'Ready to Work') {
    const hasTitle = !!cell.title && cell.title.trim() !== '';
    const hasDescription = !!cell.description && cell.description.trim() !== '';
    const hasDeadline = !!cell.deadline;
    const hasAssignee = !!cell.assignee;
    const hasAcceptanceCriteria = cell.checklist && Array.isArray(cell.checklist.items) && cell.checklist.items.length > 0;
    
    if (hasTitle && hasDescription && hasDeadline && hasAssignee && hasAcceptanceCriteria) {
      return 'Ready to Work';
    } else {
      return 'Idea';
    }
  }

  if (currentState === 'In Progress' || currentState === 'Review') {
    const hasReport = !!cell.completionReport && cell.completionReport.trim() !== '';
    const items = cell.checklist?.items || [];
    // Если чек-листа нет, считаем не выполненным. Для старых карточек без items, если там typeof string, надо учесть?
    // В App.vue checklist уже распарсен.
    const allChecked = items.length > 0 && items.every((i: any) => i.done);
    
    if (hasReport && allChecked) {
      return 'Review';
    } else {
      return 'In Progress';
    }
  }
  
  return currentState;
}

const handleCreateCell = async (title: string, parentId?: number) => {
  if (!activeFieldId.value) return
  
  const newCellData: any = { 
    title,
    state: 'Idea',
    checklist: { items: [] }
  }
  if (parentId) {
    newCellData.parentId = parentId
  }
  newCellData.state = evaluateCellState(newCellData)

  try {
    const res = await fetch(`http://localhost:3001/api/spaces/${activeFieldId.value}/cells`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCellData)
    })
    
    if (res.ok) {
      closeCellModal()
      // Перезагружаем ячейки
      await loadCells(activeFieldId.value)
    } else {
      console.error('Failed to create cell')
    }
  } catch (err) {
    console.error('Failed to create cell request', err)
  }
}

const { renameEntity: renameCell, deleteEntity: deleteCell } = useEntityAction('cells')

const handleRenameCell = (cell: any) => {
  renameCell(cell.id, cell.title, 'title', (newTitle) => {
    cell.title = newTitle
  })
}

const handleDeleteCell = (cell: any) => {
  deleteCell(cell.id, cell.title, () => {
    cells.value = cells.value.filter(t => t.id !== cell.id)
  })
}

const handleUpdateCell = async (updatedCell: any) => {
  // Автоматически вычисляем статус перед сохранением
  updatedCell.state = evaluateCellState(updatedCell)

  // Оптимистичное обновление UI
  const index = cells.value.findIndex(c => c.id === updatedCell.id)
  if (index !== -1) {
    cells.value[index] = { ...cells.value[index], ...updatedCell }
    if (selectedCell.value && selectedCell.value.id === updatedCell.id) {
      selectedCell.value = cells.value[index]
    }
  }

  try {
    const res = await fetch(`http://localhost:3001/api/cells/${updatedCell.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCell)
    })
    if (res.ok) {
      const data = await res.json()
      const updatedIndex = cells.value.findIndex(c => c.id === data.id)
      if (updatedIndex !== -1) {
        cells.value[updatedIndex] = { ...cells.value[updatedIndex], ...data }
        if (selectedCell.value && selectedCell.value.id === data.id) {
          selectedCell.value = cells.value[updatedIndex]
        }
      }
      window.dispatchEvent(new Event('refresh-tracker'))
    }
  } catch (err) {
    console.error('Failed to update cell', err)
  }
}

// Подписываемся на событие из Board.vue или где-либо еще, 
// но так как Board не может напрямую кидать событие сюда без проброса, 
// мы можем прослушивать кастомное событие на document, либо добавить listener.
// Для простоты, мы добавим event listener 'open-create-cell' на уровень window.
// Но правильнее прокинуть @add-column из Board.vue как открытие формы.
const openCreateCell = () => {
  showCellModal.value = true
}

onMounted(() => {
  // Костыль, если Board.vue или Column.vue эмитят глобальные события
  window.addEventListener('open-create-cell', openCreateCell)
})

onUnmounted(() => {
  window.removeEventListener('open-create-cell', openCreateCell)
})


// Виртуальные колонки на основе статусов карточек
const columns = computed(() => {
  const visibleCells = cells.value.filter((t: any) => !t.children || t.children.length === 0)
  const states = new Set(visibleCells.map((t: any) => t.state))
  
  const cols = Array.from(states).map(state => {
    let color = 'var(--accent-purple, #9d5bfe)' // По умолчанию фиолетовый
    
    let title = state
    if (state === 'Idea') {
      title = '💡 Idea'
      color = '#3b82f6' // Голубой
    } else if (state === 'Ready to Work') {
      title = '🚀 Готово к работе'
      color = '#eab308' // Желтый
    } else if (state === 'Review') {
      title = '👀 Можно проверять'
      color = '#f97316' // Оранжевый
    } else if (state === 'Done') {
      title = '✅ Завершено'
      color = '#22c55e' // Зеленый
    }
    
    return {
      id: state, // id колонки = названию state
      title: title,
      color: color
    }
  })
  
  // Сортировка колонок
  cols.sort((a, b) => {
    const order = ['Idea', 'Ready to Work', 'Review', 'Done'];
    const idxA = order.indexOf(a.id);
    const idxB = order.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.id.localeCompare(b.id);
  });
  
  return cols
})

const getColumnTitle = (id: string) => columns.value.find(c => c.id === id)?.title
const getColumnColor = (id: string) => columns.value.find(c => c.id === id)?.color

// Для Board.vue нужен геттер ячеек (фильтруем по состоянию и скрываем Эпики)
const getCellsForColumn = (state: string) => cells.value.filter((t: any) => t.state === state && (!t.children || t.children.length === 0))

// Provide getCellsForColumn down to Board and Columns
provide('getCellsForColumn', getCellsForColumn)

</script>

<style>
/* Базовые стили приложения, если необходимо переопределить */
.no-space-selected {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.no-space-selected .empty-state {
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

.no-space-selected .empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.no-space-selected h3 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-weight: 600;
}

.no-space-selected p {
  margin: 0 0 24px 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.btn--primary {
  background: linear-gradient(135deg, var(--accent-purple-light, #b07cff), var(--accent-purple, #9d5bfe));
  border: none;
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px -3px rgba(124,62,240,0.5);
}

.btn--primary:hover {
  opacity: 0.9;
}
</style>
