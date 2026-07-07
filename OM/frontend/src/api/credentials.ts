import { api } from './client'

export type ModelType = 'language' | 'embedding' | 'text_to_speech' | 'speech_to_text'

export interface Credential {
  id: string
  name: string
  provider: string
  modalities: string[]
  base_url?: string | null
  has_api_key: boolean
  model_count: number
  created: string
  updated: string
  decryption_error?: string | null
}

export interface CreateCredentialRequest {
  name: string
  provider: string
  modalities: string[]
  api_key?: string | null
  base_url?: string | null
}

export interface UpdateCredentialRequest {
  name?: string
  modalities?: string[]
  api_key?: string | null
  base_url?: string | null
}

export interface DiscoveredModel {
  name: string
  provider: string
  model_type?: string | null
  description?: string | null
}

export interface DiscoverModelsResponse {
  credential_id: string
  provider: string
  discovered: DiscoveredModel[]
}

export interface RegisterModelData {
  name: string
  provider: string
  model_type: string
}

export interface RegisterModelsResponse {
  created: number
  existing: number
}

export async function listCredentials(): Promise<Credential[]> {
  const { data } = await api.get<Credential[]>('/credentials')
  return data
}

export async function createCredential(body: CreateCredentialRequest): Promise<Credential> {
  const { data } = await api.post<Credential>('/credentials', body)
  return data
}

export async function updateCredential(id: string, body: UpdateCredentialRequest): Promise<Credential> {
  const { data } = await api.put<Credential>(`/credentials/${id}`, body)
  return data
}

export async function deleteCredential(id: string): Promise<void> {
  await api.delete(`/credentials/${id}`)
}

export async function testCredential(id: string): Promise<{ success?: boolean; message?: string; [k: string]: unknown }> {
  const { data } = await api.post(`/credentials/${id}/test`)
  return data
}

export async function discoverModels(id: string): Promise<DiscoverModelsResponse> {
  const { data } = await api.post<DiscoverModelsResponse>(`/credentials/${id}/discover`)
  return data
}

export async function registerModels(id: string, models: RegisterModelData[]): Promise<RegisterModelsResponse> {
  const { data } = await api.post<RegisterModelsResponse>(`/credentials/${id}/register-models`, { models })
  return data
}
