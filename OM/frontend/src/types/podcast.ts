// Типы подкастов — совпадают с api/routers/podcasts.py, episode_profiles.py, speaker_profiles.py.

export type EpisodeStatus =
  | 'running' | 'processing' | 'pending' | 'submitted' | 'completed' | 'failed' | 'error'

export interface OutlineSegment { name?: string; description?: string; size?: string }
export interface TranscriptEntry { speaker?: string; dialogue?: string }

export interface PodcastEpisode {
  id: string
  name: string
  episode_profile: Record<string, unknown>
  speaker_profile: Record<string, unknown>
  briefing: string
  audio_file?: string | null
  audio_url?: string | null
  transcript?: { transcript?: TranscriptEntry[] } | null
  outline?: { segments?: OutlineSegment[] } | null
  created?: string | null
  job_status?: EpisodeStatus | string | null
  error_message?: string | null
}

export interface PodcastGenerationRequest {
  episode_profile: string
  speaker_profile: string
  episode_name: string
  content?: string | null
  notebook_id?: string | null
  briefing_suffix?: string | null
}

export interface EpisodeProfile {
  id: string
  name: string
  description: string
  speaker_config: string
  outline_llm?: string | null
  transcript_llm?: string | null
  language?: string | null
  default_briefing: string
  num_segments: number
  outline_provider?: string | null
  outline_model?: string | null
  transcript_provider?: string | null
  transcript_model?: string | null
}

export interface EpisodeProfileCreate {
  name: string
  description?: string
  speaker_config: string
  outline_llm?: string | null
  transcript_llm?: string | null
  language?: string | null
  default_briefing: string
  num_segments?: number
}

export interface Speaker {
  name: string
  voice_id: string
  backstory: string
  personality: string
}

export interface SpeakerProfile {
  id: string
  name: string
  description: string
  voice_model?: string | null
  speakers: Speaker[]
  tts_provider?: string | null
  tts_model?: string | null
}

export interface SpeakerProfileCreate {
  name: string
  description?: string
  voice_model?: string | null
  speakers: Speaker[]
}
