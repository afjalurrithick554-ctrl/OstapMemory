import { api } from './client'

export interface AppSettings {
  default_content_processing_engine_doc?: string | null
  default_content_processing_engine_url?: string | null
  default_embedding_option?: string | null
  auto_delete_files?: string | null
  youtube_preferred_languages?: string[] | null
}

export async function getSettings(): Promise<AppSettings> {
  const { data } = await api.get<AppSettings>('/settings')
  return data
}

export async function updateSettings(body: AppSettings): Promise<AppSettings> {
  const { data } = await api.put<AppSettings>('/settings', body)
  return data
}
