import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  listEpisodes,
  generatePodcast,
  deleteEpisode,
  retryEpisode,
  listEpisodeProfiles,
  createEpisodeProfile,
  updateEpisodeProfile,
  deleteEpisodeProfile,
  listSpeakerProfiles,
  createSpeakerProfile,
  updateSpeakerProfile,
  deleteSpeakerProfile,
} from '@/api/podcasts'
import type {
  PodcastGenerationRequest,
  EpisodeProfileCreate,
  SpeakerProfileCreate,
  EpisodeStatus,
} from '@/types/podcast'

const keys = {
  episodes: ['podcasts', 'episodes'] as const,
  episodeProfiles: ['podcasts', 'episode-profiles'] as const,
  speakerProfiles: ['podcasts', 'speaker-profiles'] as const,
}

export type StatusGroup = 'running' | 'pending' | 'completed' | 'failed'

// Нормализуем разнородные статусы бэкенда в 4 группы.
export function episodeGroup(status?: string | null): StatusGroup {
  const s = (status ?? '').toLowerCase()
  if (s === 'completed') return 'completed'
  if (s === 'failed' || s === 'error') return 'failed'
  if (s === 'pending' || s === 'submitted') return 'pending'
  return 'running'
}

export function usePodcastEpisodes() {
  return useQuery({
    queryKey: keys.episodes,
    queryFn: () => listEpisodes(),
    // Поллинг, пока есть незавершённые эпизоды.
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return false
      const active = data.some((e) => {
        const g = episodeGroup(e.job_status)
        return g === 'running' || g === 'pending'
      })
      return active ? 4000 : false
    },
  })
}

export function useGeneratePodcast() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PodcastGenerationRequest) => generatePodcast(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.episodes }),
  })
}

export function useDeleteEpisode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEpisode(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.episodes }),
  })
}

export function useRetryEpisode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => retryEpisode(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.episodes }),
  })
}

export const FAILED_STATUSES: EpisodeStatus[] = ['failed', 'error']

// --- Episode profiles ---
export function useEpisodeProfiles() {
  return useQuery({ queryKey: keys.episodeProfiles, queryFn: () => listEpisodeProfiles() })
}
export function useCreateEpisodeProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: EpisodeProfileCreate) => createEpisodeProfile(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.episodeProfiles }),
  })
}
export function useUpdateEpisodeProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: EpisodeProfileCreate }) => updateEpisodeProfile(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.episodeProfiles }),
  })
}
export function useDeleteEpisodeProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEpisodeProfile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.episodeProfiles }),
  })
}

// --- Speaker profiles ---
export function useSpeakerProfiles() {
  return useQuery({ queryKey: keys.speakerProfiles, queryFn: () => listSpeakerProfiles() })
}
export function useCreateSpeakerProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: SpeakerProfileCreate) => createSpeakerProfile(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.speakerProfiles }),
  })
}
export function useUpdateSpeakerProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SpeakerProfileCreate }) => updateSpeakerProfile(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.speakerProfiles }),
  })
}
export function useDeleteSpeakerProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSpeakerProfile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.speakerProfiles }),
  })
}
