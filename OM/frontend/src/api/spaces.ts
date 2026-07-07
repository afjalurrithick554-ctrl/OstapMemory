import { api } from './client'
import type { Space, CreateSpaceRequest, UpdateSpaceRequest } from '@/types/space'

export async function listSpaces(): Promise<Space[]> {
  const { data } = await api.get<Space[]>('/spaces')
  return data
}

export async function createSpace(body: CreateSpaceRequest): Promise<Space> {
  const { data } = await api.post<Space>('/spaces', body)
  return data
}

export async function updateSpace(id: string, body: UpdateSpaceRequest): Promise<Space> {
  const { data } = await api.put<Space>(`/spaces/${id}`, body)
  return data
}

export async function deleteSpace(id: string): Promise<void> {
  await api.delete(`/spaces/${id}`)
}

// ID контейнера-notebook пространства (создаётся лениво на бэкенде). Используется
// для вкладок Источники/Заметки/Чат уровня пространства — как у ячейки.
export async function getSpaceContainer(id: string): Promise<string> {
  const { data } = await api.get<{ container_id: string; space_id: string }>(`/spaces/${id}/container`)
  return data.container_id
}
