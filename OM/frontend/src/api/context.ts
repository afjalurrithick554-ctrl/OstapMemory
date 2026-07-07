import { api } from './client'
import type { ContextConfig, ContextResponse } from '@/types/context'

// Оценка контекста/токенов для ячейки по конфигу include/exclude.
export async function getNotebookContext(
  notebookId: string,
  config: ContextConfig,
): Promise<ContextResponse> {
  const { data } = await api.post<ContextResponse>(`/notebooks/${notebookId}/context`, {
    notebook_id: notebookId,
    context_config: config,
  })
  return data
}
