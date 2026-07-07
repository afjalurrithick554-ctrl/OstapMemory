import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type {
  ContextConfig,
  SourceContextLevel,
  NoteContextLevel,
} from '@/types/context'

// Состояние «что входит в контекст ИИ» по каждой ячейке. Хранится в localStorage,
// чтобы пережить перезагрузку; чат (Фаза 4) прочитает отсюда готовый ContextConfig.

const STORAGE_KEY = 'om-context-config'

// Дефолты при первом появлении элемента: источник — инсайты, заметка — полный текст.
export const DEFAULT_SOURCE_LEVEL: SourceContextLevel = 'insights'
export const DEFAULT_NOTE_LEVEL: NoteContextLevel = 'full content'

type Store = Record<string, ContextConfig>

function load(): Store {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export const useContextStore = defineStore('context', () => {
  const byNotebook = ref<Store>(load())

  watch(byNotebook, (v) => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true })

  function ensure(notebookId: string): ContextConfig {
    if (!byNotebook.value[notebookId]) {
      byNotebook.value[notebookId] = { sources: {}, notes: {} }
    }
    return byNotebook.value[notebookId]
  }

  function sourceLevel(notebookId: string, sourceId: string): SourceContextLevel {
    const cfg = byNotebook.value[notebookId]
    return (cfg?.sources[sourceId] as SourceContextLevel) ?? DEFAULT_SOURCE_LEVEL
  }

  function noteLevel(notebookId: string, noteId: string): NoteContextLevel {
    const cfg = byNotebook.value[notebookId]
    return (cfg?.notes[noteId] as NoteContextLevel) ?? DEFAULT_NOTE_LEVEL
  }

  function setSourceLevel(notebookId: string, sourceId: string, level: SourceContextLevel) {
    ensure(notebookId).sources[sourceId] = level
  }

  function setNoteLevel(notebookId: string, noteId: string, level: NoteContextLevel) {
    ensure(notebookId).notes[noteId] = level
  }

  // Bulk: выставить уровень всем переданным элементам.
  function setAllSources(notebookId: string, ids: string[], level: SourceContextLevel) {
    const cfg = ensure(notebookId)
    for (const id of ids) cfg.sources[id] = level
  }

  function setAllNotes(notebookId: string, ids: string[], level: NoteContextLevel) {
    const cfg = ensure(notebookId)
    for (const id of ids) cfg.notes[id] = level
  }

  // Конфиг для API: достраиваем дефолтами по фактическим спискам элементов ячейки.
  function buildConfig(
    notebookId: string,
    sourceIds: string[],
    noteIds: string[],
  ): ContextConfig {
    const sources: Record<string, string> = {}
    const notes: Record<string, string> = {}
    for (const id of sourceIds) sources[id] = sourceLevel(notebookId, id)
    for (const id of noteIds) notes[id] = noteLevel(notebookId, id)
    return { sources, notes }
  }

  return {
    byNotebook,
    sourceLevel,
    noteLevel,
    setSourceLevel,
    setNoteLevel,
    setAllSources,
    setAllNotes,
    buildConfig,
  }
})
