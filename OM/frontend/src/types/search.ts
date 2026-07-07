// Типы поиска и Ask (RAG). Совпадают с api/models.py (SearchRequest/Response, AskRequest).

export type SearchType = 'text' | 'vector'

export interface SearchRequest {
  query: string
  type: SearchType
  limit?: number
  search_sources?: boolean
  search_notes?: boolean
  minimum_score?: number
}

// results — List[Dict[str, Any]] на бэке; фиксируем поля, которые реально используем.
export interface SearchResult {
  parent_id?: string | null
  title?: string
  final_score?: number
  matches?: string[]
  [key: string]: unknown
}

export interface SearchResponse {
  results: SearchResult[]
  total_count: number
  search_type: string
}

// SSE-события Ask (/search/ask)
export interface AskStrategyEvent {
  type: 'strategy'
  reasoning: string
  searches: { term: string; instructions: string }[]
}
export interface AskAnswerEvent {
  type: 'answer'
  content: string
}
export interface AskFinalEvent {
  type: 'final_answer'
  content: string
}
export interface AskCompleteEvent {
  type: 'complete'
  final_answer: string | null
}
export interface AskErrorEvent {
  type: 'error'
  message: string
}
export type AskEvent =
  | AskStrategyEvent
  | AskAnswerEvent
  | AskFinalEvent
  | AskCompleteEvent
  | AskErrorEvent
