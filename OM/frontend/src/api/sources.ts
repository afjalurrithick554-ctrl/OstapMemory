import { api } from './client'
import type {
  Source,
  SourceListItem,
  SourceInsight,
  CreateSourceForm,
  UpdateSourceRequest,
} from '@/types/source'

export async function listSources(notebookId: string): Promise<SourceListItem[]> {
  const { data } = await api.get<SourceListItem[]>('/sources', {
    params: { notebook_id: notebookId, sort_by: 'updated', sort_order: 'desc' },
  })
  return data
}

export interface ListAllSourcesParams {
  limit?: number
  offset?: number
  sort_by?: 'created' | 'updated'
  sort_order?: 'asc' | 'desc'
}

export async function listAllSources(params: ListAllSourcesParams = {}): Promise<SourceListItem[]> {
  const { data } = await api.get<SourceListItem[]>('/sources', {
    params: { limit: 30, offset: 0, sort_by: 'updated', sort_order: 'desc', ...params },
  })
  return data
}

export async function getSource(id: string): Promise<Source> {
  const { data } = await api.get<Source>(`/sources/${id}`)
  return data
}

// Создание идёт multipart-формой: backend читает поля через Form(...)/File(...).
export async function createSource(form: CreateSourceForm): Promise<Source> {
  const fd = new FormData()
  fd.append('type', form.type)
  // Без notebook_id источник создаётся без привязки (пространство «Источники»).
  fd.append('notebooks', JSON.stringify(form.notebook_id ? [form.notebook_id] : []))
  if (form.space_id) fd.append('space_id', form.space_id)
  fd.append('embed', String(form.embed ?? false))
  fd.append('async_processing', String(form.async_processing ?? true))
  if (form.title) fd.append('title', form.title)
  if (form.url) fd.append('url', form.url)
  if (form.content) fd.append('content', form.content)
  if (form.file) fd.append('file', form.file)
  const { data } = await api.post<Source>('/sources', fd)
  return data
}

export async function updateSource(id: string, body: UpdateSourceRequest): Promise<Source> {
  const { data } = await api.put<Source>(`/sources/${id}`, body)
  return data
}

export async function deleteSource(id: string): Promise<void> {
  await api.delete(`/sources/${id}`)
}

export async function getSourceInsights(id: string): Promise<SourceInsight[]> {
  const { data } = await api.get<SourceInsight[]>(`/sources/${id}/insights`)
  return data
}
