import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, unref, type MaybeRef } from 'vue'
import {
  listSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  buildContext,
} from '@/api/chat'
import { streamSSE } from '@/lib/sse'
import type {
  CreateSessionRequest,
  UpdateSessionRequest,
  ChatStreamEvent,
} from '@/types/chat'
import type { ContextConfig } from '@/types/context'

export const chatKeys = {
  all: ['chat'] as const,
  sessions: (notebookId: string) => [...chatKeys.all, 'sessions', notebookId] as const,
  session: (id: string) => [...chatKeys.all, 'session', id] as const,
}

export function useSessions(notebookId: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => chatKeys.sessions(unref(notebookId))),
    queryFn: () => listSessions(unref(notebookId)),
    enabled: computed(() => !!unref(notebookId)),
  })
}

export function useSession(id: MaybeRef<string | null>) {
  return useQuery({
    queryKey: computed(() => chatKeys.session(unref(id) || 'none')),
    queryFn: () => getSession(unref(id) as string),
    enabled: computed(() => !!unref(id)),
  })
}

export function useCreateSession(notebookId: MaybeRef<string>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateSessionRequest) => createSession(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatKeys.sessions(unref(notebookId)) }),
  })
}

export function useUpdateSession(notebookId: MaybeRef<string>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSessionRequest }) => updateSession(id, body),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: chatKeys.sessions(unref(notebookId)) })
      qc.invalidateQueries({ queryKey: chatKeys.session(s.id) })
    },
  })
}

export function useDeleteSession(notebookId: MaybeRef<string>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatKeys.sessions(unref(notebookId)) }),
  })
}

// Отправка сообщения со стримингом: собираем контекст, затем читаем SSE.
export async function sendChatMessage(opts: {
  notebookId: string
  sessionId: string
  message: string
  contextConfig: ContextConfig
  modelOverride?: string | null
  onEvent: (e: ChatStreamEvent) => void
  signal?: AbortSignal
}): Promise<void> {
  const built = await buildContext(opts.notebookId, opts.contextConfig)
  await streamSSE<ChatStreamEvent>(
    `/chat/sessions/${opts.sessionId}/stream`,
    {
      session_id: opts.sessionId,
      message: opts.message,
      context: built.context,
      model_override: opts.modelOverride ?? undefined,
    },
    opts.onEvent,
    opts.signal,
  )
}
