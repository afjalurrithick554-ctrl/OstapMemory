// Типы источников. Портированы из api/models.py (SourceResponse / SourceListResponse).

export type SourceType = 'link' | 'upload' | 'text'

export interface SourceAsset {
  file_path: string | null
  url: string | null
}

// Элемент списка источников (GET /sources?notebook_id=…).
export interface SourceListItem {
  id: string
  title: string | null
  topics: string[]
  asset: SourceAsset | null
  embedded: boolean
  embedded_chunks: number
  insights_count: number
  created: string
  updated: string
  file_available: boolean | null
  // Статус асинхронной обработки.
  command_id: string | null
  status: string | null
  processing_info: Record<string, unknown> | null
  // Привязка к проекту (space kind=project). null — дефолтный (глобальный) источник.
  space_id: string | null
}

// Полный источник (GET /sources/{id}).
export interface Source extends SourceListItem {
  full_text: string | null
  notebooks: string[] | null
}

export interface SourceInsight {
  id: string
  source_id: string
  insight_type: string
  content: string
  created: string
  updated: string
}

// Тело создания источника (multipart на POST /sources).
export interface CreateSourceForm {
  type: SourceType
  notebook_id: string
  space_id?: string
  url?: string
  content?: string
  title?: string
  file?: File
  embed?: boolean
  async_processing?: boolean
}

export interface UpdateSourceRequest {
  title?: string
  topics?: string[]
  space_id?: string
}

// Статусы обработки, которые считаем «ещё не готово» (нужен поллинг).
export const SOURCE_PENDING_STATUSES = ['new', 'queued', 'running'] as const

export function isSourcePending(status: string | null | undefined): boolean {
  return !!status && (SOURCE_PENDING_STATUSES as readonly string[]).includes(status)
}
