import { api } from './client'
import type { ChatSession, ChatSessionWithMessages } from '@/types/chat'

export async function listSourceSessions(sourceId: string): Promise<ChatSession[]> {
  const sid = encodeURIComponent(sourceId)
  const { data } = await api.get<ChatSession[]>(`/sources/${sid}/chat/sessions`)
  return data
}

export async function getSourceSession(
  sourceId: string,
  sessionId: string,
): Promise<ChatSessionWithMessages> {
  const sid = encodeURIComponent(sourceId)
  const cid = encodeURIComponent(sessionId)
  const { data } = await api.get<ChatSessionWithMessages>(`/sources/${sid}/chat/sessions/${cid}`)
  return data
}

export async function createSourceSession(
  sourceId: string,
  title?: string,
): Promise<ChatSession> {
  const sid = encodeURIComponent(sourceId)
  // Бэкенд требует source_id и в теле (CreateSourceChatSessionRequest).
  const { data } = await api.post<ChatSession>(`/sources/${sid}/chat/sessions`, {
    source_id: sourceId,
    title,
  })
  return data
}

// Путь стрима сообщений источника (для streamSSE).
export function sourceChatStreamPath(sourceId: string, sessionId: string): string {
  return `/sources/${encodeURIComponent(sourceId)}/chat/sessions/${encodeURIComponent(sessionId)}/messages`
}
