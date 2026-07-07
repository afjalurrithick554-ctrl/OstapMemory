// Типы ячеек/задач. Портированы из React-эталона (lib/types/api.ts) + поля report/accepted (Фаза 2).

export type NotebookType = 'cell' | 'task' | 'subtask'

export interface ImplementationPlanFile {
  path: string
  content: string
}

export interface ImplementationPlan {
  text: string
  files?: ImplementationPlanFile[]
  // Финализация плана кнопкой «План готов» — гейт перехода 1→2.
  finalized?: boolean
}

export interface ChecklistItem {
  title: string
  isCompleted: boolean
}

// Запись append-журнала отчёта о выполнении: кто, когда и что зафиксировал.
export interface ReportEntry {
  author?: string | null
  at: string
  text: string
}

// Метаданные файла, приложенного к «Цели» карточки.
export interface GoalFile {
  name: string
  path: string
  size?: number | null
}

// «Внесённые замечания» — заполняются при возврате задачи из «Можно проверять»
// (3) в «В работе» (2). Текст + опц. url + опц. файл/изображение.
export interface ReviewNotes {
  text: string
  url?: string
  file?: GoalFile | null
  created?: string
}

// Именованный чек-лист. У ячейки/задачи всегда есть хотя бы один (дефолтный,
// isDefault) — «Цель ячейки/задачи»; его нельзя удалить, но можно переименовать.
export interface Checklist {
  id: string
  title: string
  isDefault?: boolean
  items: ChecklistItem[]
}

export interface Notebook {
  id: string
  name: string
  description: string
  archived: boolean
  notebook_type: string
  state: number
  // Административная ячейка — рендерится в противоположной теме.
  is_admin: boolean
  parent_id: string | null
  // Привязка к проекту (space kind=project); null — глобальная карточка.
  space_id: string | null
  implementation_plan: ImplementationPlan | null
  deadline: string | null
  assigned: string | null
  checklist: Checklist[] | null
  // «Цель ячейки/задачи» — простое поле (заменяет обязательный чек-лист «Цель»).
  goal: string | null
  goal_file: GoalFile | null
  // Ручной порядок карточки внутри её группы состояния (вертикальный DnD).
  sort_order: number
  // Отчёт о выполнении — append-журнал записей (null у старых карточек до первой записи).
  report: ReportEntry[] | null
  // «Внесённые замечания» при возврате задачи в работу (3→2).
  review_notes: ReviewNotes | null
  // Тумблеры гейтов: done (2→3), accepted (3→4).
  done: boolean
  accepted: boolean
  // Дата входа в «Завершено» — база вычисляемого архива.
  completed_at: string | null
  created: string
  updated: string
  source_count: number
  note_count: number
}

export interface CreateNotebookRequest {
  name: string
  description?: string
  notebook_type?: string
  parent_id?: string
  space_id?: string
  is_admin?: boolean
  checklist?: Checklist[]
  goal?: string
}

export interface UpdateNotebookRequest {
  name?: string
  description?: string
  archived?: boolean
  notebook_type?: string
  parent_id?: string
  space_id?: string
  is_admin?: boolean
  implementation_plan?: ImplementationPlan
  deadline?: string
  assigned?: string
  checklist?: Checklist[]
  goal?: string
  sort_order?: number
  // Дописать одну запись в журнал отчёта; `at` проставляет бэкенд.
  report_entry?: { author?: string | null; text: string }
  review_notes?: ReviewNotes
  done?: boolean
  accepted?: boolean
}

export interface NotebookDeletePreview {
  notebook_id: string
  notebook_name: string
  note_count: number
  exclusive_source_count: number
  shared_source_count: number
}

export interface NotebookDeleteResponse {
  message: string
  deleted_notes: number
  deleted_sources: number
  unlinked_sources: number
}

// 0 Идея · 1 Готово к работе · 2 В работе · 3 Можно проверять · 4 Завершено
export const STATE_COUNT = 5
// Задача архивируется через N дней после входа в «Завершено» (completed_at).
export const ARCHIVE_DAYS = 14
export const STATE_COLORS = [
  'bg-blue-400',
  'bg-yellow-400',
  'bg-orange-400',
  'bg-green-400',
  'bg-gray-400',
] as const
// Цвет текста под состояние (тексты карточки окрашиваются в цвет состояния).
export const STATE_TEXT_COLORS = [
  'text-blue-400',
  'text-yellow-500',
  'text-orange-500',
  'text-green-500',
  'text-gray-400',
] as const
// Цвет ауры/обводки.
export const STATE_RING_COLORS = [
  'ring-blue-400/50',
  'ring-yellow-400/50',
  'ring-orange-400/50',
  'ring-green-400/50',
  'ring-gray-400/50',
] as const
// Левая акцент-граница карточки (состояние отмечено цветом карточки).
export const STATE_BORDER_COLORS = [
  'border-l-blue-400',
  'border-l-yellow-400',
  'border-l-orange-400',
  'border-l-green-400',
  'border-l-gray-400',
] as const
// Мягкая заливка карточки под состояние.
export const STATE_TINT_COLORS = [
  'bg-blue-400/5',
  'bg-yellow-400/5',
  'bg-orange-400/5',
  'bg-green-400/5',
  'bg-gray-400/5',
] as const
