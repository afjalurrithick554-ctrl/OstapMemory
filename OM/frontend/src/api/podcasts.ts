import { api, getToken } from './client'
import type {
  PodcastEpisode,
  PodcastGenerationRequest,
  EpisodeProfile,
  EpisodeProfileCreate,
  SpeakerProfile,
  SpeakerProfileCreate,
} from '@/types/podcast'

// --- Episodes ---
export async function listEpisodes(): Promise<PodcastEpisode[]> {
  const { data } = await api.get<PodcastEpisode[]>('/podcasts/episodes')
  return data
}

export async function generatePodcast(body: PodcastGenerationRequest) {
  const { data } = await api.post('/podcasts/generate', body)
  return data
}

export async function deleteEpisode(id: string): Promise<void> {
  await api.delete(`/podcasts/episodes/${id}`)
}

export async function retryEpisode(id: string): Promise<void> {
  await api.post(`/podcasts/episodes/${id}/retry`)
}

// Аудио защищено авторизацией — тянем blob с Bearer и отдаём object URL.
export async function fetchEpisodeAudioUrl(id: string): Promise<string> {
  const token = getToken()
  const res = await fetch(`/api/podcasts/episodes/${id}/audio`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

// --- Episode profiles ---
export async function listEpisodeProfiles(): Promise<EpisodeProfile[]> {
  const { data } = await api.get<EpisodeProfile[]>('/episode-profiles')
  return data
}
export async function createEpisodeProfile(body: EpisodeProfileCreate): Promise<EpisodeProfile> {
  const { data } = await api.post<EpisodeProfile>('/episode-profiles', body)
  return data
}
export async function updateEpisodeProfile(id: string, body: EpisodeProfileCreate): Promise<EpisodeProfile> {
  const { data } = await api.put<EpisodeProfile>(`/episode-profiles/${id}`, body)
  return data
}
export async function deleteEpisodeProfile(id: string): Promise<void> {
  await api.delete(`/episode-profiles/${id}`)
}

// --- Speaker profiles ---
export async function listSpeakerProfiles(): Promise<SpeakerProfile[]> {
  const { data } = await api.get<SpeakerProfile[]>('/speaker-profiles')
  return data
}
export async function createSpeakerProfile(body: SpeakerProfileCreate): Promise<SpeakerProfile> {
  const { data } = await api.post<SpeakerProfile>('/speaker-profiles', body)
  return data
}
export async function updateSpeakerProfile(id: string, body: SpeakerProfileCreate): Promise<SpeakerProfile> {
  const { data } = await api.put<SpeakerProfile>(`/speaker-profiles/${id}`, body)
  return data
}
export async function deleteSpeakerProfile(id: string): Promise<void> {
  await api.delete(`/speaker-profiles/${id}`)
}
