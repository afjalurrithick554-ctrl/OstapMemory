import { api } from './client'
import type {
  ChatSession,
  ChatSessionWithMessages,
  CreateSessionRequest,
  UpdateSessionRequest,
} from '@/types/chat'
import type { ContextConfig } from '@/types/context'

export async function listSessions(notebookId: string): Promise<ChatSession[]> {
  const { data } = await api.get<ChatSession[]>('/chat/sessions', {
    params: { notebook_id: notebookId },
  })
  return data
}

export async function getSession(id: string): Promise<ChatSessionWithMessages> {
  const { data } = await api.get<ChatSessionWithMessages>(`/chat/sessions/${id}`)
  return data
}

export async function createSession(body: CreateSessionRequest): Promise<ChatSession> {
  const { data } = await api.post<ChatSession>('/chat/sessions', body)
  return data
}

export async function updateSession(id: string, body: UpdateSessionRequest): Promise<ChatSession> {
  const { data } = await api.put<ChatSession>(`/chat/sessions/${id}`, body)
  return data
}

export async function deleteSession(id: string): Promise<void> {
  await api.delete(`/chat/sessions/${id}`)
}

// Сборка контекста из конфига Фазы 3: возвращает готовый объект контекста + оценку токенов.
export interface BuiltContext {
  context: Record<string, unknown>
  token_count: number
  char_count: number
}

export async function buildContext(
  notebookId: string,
  config: ContextConfig,
): Promise<BuiltContext> {
  const { data } = await api.post<BuiltContext>('/chat/context', {
    notebook_id: notebookId,
    context_config: config,
  })
  return data
}
