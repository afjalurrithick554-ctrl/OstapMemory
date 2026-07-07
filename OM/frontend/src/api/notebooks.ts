import { api } from './client'
import type {
  Notebook,
  CreateNotebookRequest,
  UpdateNotebookRequest,
  NotebookDeletePreview,
  NotebookDeleteResponse,
  GoalFile,
} from '@/types/notebook'

export async function listNotebooks(params?: { archived?: boolean; order_by?: string }): Promise<Notebook[]> {
  const { data } = await api.get<Notebook[]>('/notebooks', { params })
  return data
}

export async function getNotebook(id: string): Promise<Notebook> {
  const { data } = await api.get<Notebook>(`/notebooks/${id}`)
  return data
}

export async function createNotebook(body: CreateNotebookRequest): Promise<Notebook> {
  const { data } = await api.post<Notebook>('/notebooks', body)
  return data
}

export async function updateNotebook(id: string, body: UpdateNotebookRequest): Promise<Notebook> {
  const { data } = await api.put<Notebook>(`/notebooks/${id}`, body)
  return data
}

export async function uploadGoalFile(id: string, file: File): Promise<GoalFile> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<{ success: boolean; goal_file: GoalFile }>(
    `/notebooks/${id}/goal-file`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data.goal_file
}

export async function deleteGoalFile(id: string): Promise<void> {
  await api.delete(`/notebooks/${id}/goal-file`)
}

// URL для скачивания файла «Цели» (открывается в новой вкладке/скачивается).
export function goalFileUrl(id: string): string {
  return `${api.defaults.baseURL ?? ''}/notebooks/${id}/goal-file`
}

// Загрузка файла/изображения для «Внесённых замечаний». Возвращает метаданные;
// поле review_notes сохраняется отдельным PUT при возврате задачи в работу.
export async function uploadReviewFile(id: string, file: File): Promise<GoalFile> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<{ success: boolean; file: GoalFile }>(
    `/notebooks/${id}/review-file`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data.file
}

// URL для скачивания файла «Внесённых замечаний».
export function reviewFileUrl(id: string): string {
  return `${api.defaults.baseURL ?? ''}/notebooks/${id}/review-file`
}

export async function getNotebookChildren(id: string): Promise<Notebook[]> {
  const { data } = await api.get<Notebook[]>(`/notebooks/${id}/children`)
  return data
}

export async function getNotebookDeletePreview(id: string): Promise<NotebookDeletePreview> {
  const { data } = await api.get<NotebookDeletePreview>(`/notebooks/${id}/delete-preview`)
  return data
}

export async function deleteNotebook(id: string, deleteExclusiveSources = false): Promise<NotebookDeleteResponse> {
  const { data } = await api.delete<NotebookDeleteResponse>(`/notebooks/${id}`, {
    params: { delete_exclusive_sources: deleteExclusiveSources },
  })
  return data
}
