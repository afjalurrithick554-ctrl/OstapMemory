import { api } from './client'

export interface AiModel {
  id: string
  name: string
  provider: string
  type: string
  created: string
  updated: string
}

export interface DefaultModels {
  default_chat_model?: string | null
  default_transformation_model?: string | null
  large_context_model?: string | null
  default_embedding_model?: string | null
  [key: string]: string | null | undefined
}

export interface CreateModelRequest {
  name: string
  provider: string
  type: string
  credential?: string | null
}

export interface ProviderAvailability {
  available: string[]
  unavailable: string[]
  supported_types: Record<string, string[]>
}

export async function listModels(type?: string): Promise<AiModel[]> {
  const { data } = await api.get<AiModel[]>('/models', { params: type ? { type } : undefined })
  return data
}

export async function getDefaultModels(): Promise<DefaultModels> {
  const { data } = await api.get<DefaultModels>('/models/defaults')
  return data
}

export async function updateDefaultModels(body: DefaultModels): Promise<DefaultModels> {
  const { data } = await api.put<DefaultModels>('/models/defaults', body)
  return data
}

export async function createModel(body: CreateModelRequest): Promise<AiModel> {
  const { data } = await api.post<AiModel>('/models', body)
  return data
}

export async function deleteModel(id: string): Promise<void> {
  await api.delete(`/models/${id}`)
}

export async function testModel(id: string): Promise<{ success?: boolean; message?: string; [k: string]: unknown }> {
  const { data } = await api.post(`/models/${id}/test`)
  return data
}

export async function getProviders(): Promise<ProviderAvailability> {
  const { data } = await api.get<ProviderAvailability>('/models/providers')
  return data
}
