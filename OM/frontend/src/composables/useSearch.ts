import { ref } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { searchKnowledgeBase, streamAsk, type AskModels } from '@/api/search'
import type { SearchRequest } from '@/types/search'

export function useSearch() {
  return useMutation({
    mutationFn: (req: SearchRequest) => searchKnowledgeBase(req),
  })
}

// Ask (RAG) со стримингом: накапливает стратегию, промежуточные ответы и финальный ответ.
export function useAsk() {
  const isStreaming = ref(false)
  const strategy = ref<{ reasoning: string; searches: { term: string; instructions: string }[] } | null>(null)
  const answers = ref<string[]>([])
  const finalAnswer = ref('')
  const error = ref('')

  async function ask(question: string, models: AskModels) {
    if (!question.trim() || isStreaming.value) return
    isStreaming.value = true
    strategy.value = null
    answers.value = []
    finalAnswer.value = ''
    error.value = ''

    try {
      await streamAsk(question, models, (e) => {
        if (e.type === 'strategy') strategy.value = { reasoning: e.reasoning, searches: e.searches }
        else if (e.type === 'answer') answers.value = [...answers.value, e.content]
        else if (e.type === 'final_answer') finalAnswer.value = e.content
        else if (e.type === 'complete') {
          if (e.final_answer) finalAnswer.value = e.final_answer
        } else if (e.type === 'error') error.value = e.message
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      isStreaming.value = false
    }
  }

  return { isStreaming, strategy, answers, finalAnswer, error, ask }
}
