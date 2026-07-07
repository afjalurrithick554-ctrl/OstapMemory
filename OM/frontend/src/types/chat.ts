// Типы чата. Портированы из api/routers/chat.py.

export type ChatMessageType = 'human' | 'ai'

export interface ChatMessage {
  id: string
  type: ChatMessageType | string
  content: string
  timestamp?: string | null
}

export interface ChatSession {
  id: string
  title: string
  notebook_id?: string | null
  created: string
  updated: string
  message_count?: number | null
  model_override?: string | null
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[]
}

export interface CreateSessionRequest {
  notebook_id: string
  title?: string
  model_override?: string
}

export interface UpdateSessionRequest {
  title?: string
  model_override?: string
}

// SSE-события чата (см. stream_notebook_chat_response / source_chat).
export type ChatStreamEvent =
  | { type: 'user_message'; content: string; timestamp?: string | null }
  | { type: 'ai_message'; content: string; timestamp?: string | null }
  | { type: 'context_indicators'; data: unknown }
  | { type: 'complete' }
  | { type: 'error'; message: string }
