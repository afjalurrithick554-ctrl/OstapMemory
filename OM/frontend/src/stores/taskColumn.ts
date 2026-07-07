import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'om-taskcolumn-collapsed'
const SORT_KEY = 'om-taskcolumn-sort'

export type TaskSort = 'deadline' | 'added'

// Правая вертикальная колонка задач: свёрнутость и режим сортировки/фильтра.
export const useTaskColumnStore = defineStore('taskColumn', () => {
  const collapsed = ref(localStorage.getItem(STORAGE_KEY) === '1')
  const sort = ref<TaskSort>((localStorage.getItem(SORT_KEY) as TaskSort) || 'added')

  watch(collapsed, (v) => localStorage.setItem(STORAGE_KEY, v ? '1' : '0'))
  watch(sort, (v) => localStorage.setItem(SORT_KEY, v))

  function toggle() {
    collapsed.value = !collapsed.value
  }

  return { collapsed, sort, toggle }
})
