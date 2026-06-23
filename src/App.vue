<template>
  <div class="app" :data-theme="theme">
    <Sidebar 
      :fields="fields" 
      :activeFieldId="activeFieldId" 
      @select-field="activeFieldId = $event" 
      @delete-field="handleDeleteSpace"
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
      <div class="status-tabs" id="status-tabs">
        <div 
          v-for="col in columns" 
          :key="col.id" 
          :class="['status-tab', { 'is-active': activeMobileColumn === col.id }]"
          @click="activeMobileColumn = col.id"
        >
          <span class="status-tab__dot" :style="{ background: col.color }"></span>
          {{ col.title }} <span class="status-tab__count">{{ getTasksForColumn(col.id).length }}</span>
        </div>
      </div>
      <Board 
        v-if="activeFieldId"
        :columns="columns" 
        :tasks="tasks" 
        :activeMobileColumn="activeMobileColumn"
        @task-click="openTask" 
        @add-card="showCardModal = true"
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
    
    <TaskModal 
      v-if="selectedTask" 
      :task="selectedTask" 
      :columnTitle="getColumnTitle(selectedTask.columnId)"
      :columnColor="getColumnColor(selectedTask.columnId)"
      @close="selectedTask = null" 
    />

    <SpaceModal
      v-if="showSpaceModal"
      @close="showSpaceModal = false"
      @submit="handleCreateSpace"
    />

    <CreateCardModal
      v-if="showCardModal"
      @close="showCardModal = false"
      @submit="handleCreateCard"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Header from './components/Header.vue'
import Board from './components/Board.vue'
import TaskModal from './components/TaskModal.vue'
import SpaceModal from './components/SpaceModal.vue'
import CreateCardModal from './components/CreateCardModal.vue'

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
  
  const comment = prompt(`Оставить комментарий для элемента:\n${fullPath}\n\nТекст комментария:`)
  if (comment) {
    fetch('http://localhost:3001/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ element: fullPath, comment })
    }).catch(err => {
      console.error('Failed to send feedback', err)
      alert('Ошибка при отправке комментария')
    })
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick, true)
})

// Состояние полей (проектов/пространств)
const fields = ref<any[]>([])
const activeFieldId = ref<string | null>(null)
const showSpaceModal = ref(false)

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
    loadCards(newId)
  } else {
    tasks.value = []
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

const handleDeleteSpace = async (id: string) => {
  if (!confirm('Are you sure you want to delete this space?')) return;
  
  try {
    const res = await fetch(`http://localhost:3001/api/spaces/${id}`, {
      method: 'DELETE'
    })
    if (res.ok) {
      fields.value = fields.value.filter(f => f.id !== id)
      if (activeFieldId.value === id) {
        activeFieldId.value = fields.value.length > 0 ? fields.value[0].id : null
      }
    } else {
      console.error('Failed to delete space')
    }
  } catch (err) {
    console.error('Failed to delete space request', err)
  }
}

// Мобильное представление
const activeMobileColumn = ref('Idea')

// Выбранная задача для модалки
const selectedTask = ref<any>(null)
const openTask = (task: any) => {
  selectedTask.value = task
}

// Данные карточек (реальные из БД)
const tasks = ref<any[]>([])

const loadCards = async (spaceId: string) => {
  try {
    const res = await fetch(`http://localhost:3001/api/spaces/${spaceId}/cards`)
    if (res.ok) {
      tasks.value = await res.json()
    }
  } catch (err) {
    console.error('Failed to load cards', err)
  }
}

// Создание новой карточки
const showCardModal = ref(false)

const handleCreateCard = async (title: string) => {
  if (!activeFieldId.value) return
  
  try {
    const res = await fetch(`http://localhost:3001/api/spaces/${activeFieldId.value}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    })
    
    if (res.ok) {
      showCardModal.value = false
      // Перезагружаем карточки
      await loadCards(activeFieldId.value)
    } else {
      console.error('Failed to create card')
    }
  } catch (err) {
    console.error('Failed to create card request', err)
  }
}

// Подписываемся на событие из Board.vue или где-либо еще, 
// но так как Board не может напрямую кидать событие сюда без проброса, 
// мы можем прослушивать кастомное событие на document, либо добавить listener.
// Для простоты, мы добавим event listener 'open-create-card' на уровень window.
// Но правильнее прокинуть @add-column из Board.vue как открытие формы.
const openCreateCard = () => {
  showCardModal.value = true
}

onMounted(() => {
  // Костыль, если Board.vue или Column.vue эмитят глобальные события
  window.addEventListener('open-create-card', openCreateCard)
})

onUnmounted(() => {
  window.removeEventListener('open-create-card', openCreateCard)
})


// Виртуальные колонки на основе статусов карточек
const columns = computed(() => {
  const states = new Set(tasks.value.map(t => t.state))
  
  const cols = Array.from(states).map(state => {
    let color = 'var(--accent-purple, #9d5bfe)' // По умолчанию фиолетовый
    // В будущем можно мапить цвета: if (state === 'To Do') color = 'blue'
    
    // Специальный цвет для 'Idea' по просьбе (Голубая с иконкой лампочки)
    let title = state
    if (state === 'Idea') {
      title = '💡 Idea'
      color = '#3b82f6' // Голубой
    }
    
    return {
      id: state, // id колонки = названию state
      title: title,
      color: color
    }
  })
  
  return cols
})

const getColumnTitle = (id: string) => columns.value.find(c => c.id === id)?.title
const getColumnColor = (id: string) => columns.value.find(c => c.id === id)?.color

// Для Board.vue нужен геттер карточек (фильтруем по состоянию)
const getTasksForColumn = (state: string) => tasks.value.filter((t: any) => t.state === state)

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
