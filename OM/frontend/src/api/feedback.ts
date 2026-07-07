import { api } from './client'

// Отправка фидбека Dev Mode на бэкенд (пишется в файл data/dev_feedback.jsonl).
export async function sendFeedback(element: string, comment: string): Promise<void> {
  await api.post('/feedback', { element, comment })
}
