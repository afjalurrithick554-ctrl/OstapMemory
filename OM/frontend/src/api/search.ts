import { api } from './client'
import { streamSSE } from '@/lib/sse'
import type { SearchRequest, SearchResponse, AskEvent } from '@/types/search'

export async function searchKnowledgeBase(req: SearchRequest): Promise<SearchResponse> {
  const { data } = await api.post<SearchResponse>('/search', {
    limit: 100,
    search_sources: true,
    search_notes: true,
    minimum_score: 0.2,
    ...req,
  })
  return data
}

export interface AskModels {
  strategy_model: string
  answer_model: string
  final_answer_model: string
}

// SSE-поток Ask. onEvent зовётся на каждое событие (strategy/answer/final_answer/complete/error).
export function streamAsk(
  question: string,
  models: AskModels,
  onEvent: (e: AskEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  return streamSSE<AskEvent>('/search/ask', { question, ...models }, onEvent, signal)
}
