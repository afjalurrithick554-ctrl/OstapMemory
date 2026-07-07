import { api } from './client'
import type {
  Transformation,
  TransformationCreate,
  TransformationUpdate,
  TransformationExecuteRequest,
  TransformationExecuteResponse,
  DefaultPrompt,
} from '@/types/transformation'

export async function listTransformations(): Promise<Transformation[]> {
  const { data } = await api.get<Transformation[]>('/transformations')
  return data
}

export async function createTransformation(body: TransformationCreate): Promise<Transformation> {
  const { data } = await api.post<Transformation>('/transformations', body)
  return data
}

export async function updateTransformation(id: string, body: TransformationUpdate): Promise<Transformation> {
  const { data } = await api.put<Transformation>(`/transformations/${id}`, body)
  return data
}

export async function deleteTransformation(id: string): Promise<void> {
  await api.delete(`/transformations/${id}`)
}

export async function executeTransformation(
  body: TransformationExecuteRequest,
): Promise<TransformationExecuteResponse> {
  const { data } = await api.post<TransformationExecuteResponse>('/transformations/execute', body)
  return data
}

export async function getDefaultPrompt(): Promise<DefaultPrompt> {
  const { data } = await api.get<DefaultPrompt>('/transformations/default-prompt')
  return data
}

export async function updateDefaultPrompt(body: DefaultPrompt): Promise<DefaultPrompt> {
  const { data } = await api.put<DefaultPrompt>('/transformations/default-prompt', body)
  return data
}
