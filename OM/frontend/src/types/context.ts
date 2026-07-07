// Типы управления контекстом. Уровни — строки, которые парсит backend (api/routers/context.py):
//   источник: "not in" → исключён; "insights" → краткий (инсайты); "full content" → полный текст
//   заметка:  "not in" → исключена; "full content" → полный текст

export type SourceContextLevel = 'not in' | 'insights' | 'full content'
export type NoteContextLevel = 'not in' | 'full content'

export const SOURCE_LEVELS: SourceContextLevel[] = ['not in', 'insights', 'full content']
export const NOTE_LEVELS: NoteContextLevel[] = ['not in', 'full content']

// Конфиг, который уходит на POST /notebooks/{id}/context.
export interface ContextConfig {
  sources: Record<string, string>
  notes: Record<string, string>
}

export interface ContextResponse {
  notebook_id: string
  sources: Record<string, unknown>[]
  notes: Record<string, unknown>[]
  total_tokens: number | null
}

export function isInContext(level: string | undefined): boolean {
  return !!level && level !== 'not in'
}
