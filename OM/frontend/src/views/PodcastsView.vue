<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Mic, LayoutTemplate, RefreshCcw, Plus, Pencil, Trash2, Loader2 } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import EpisodeCard from '@/components/podcasts/EpisodeCard.vue'
import GeneratePodcastDialog from '@/components/podcasts/GeneratePodcastDialog.vue'
import EpisodeProfileFormDialog from '@/components/podcasts/EpisodeProfileFormDialog.vue'
import SpeakerProfileFormDialog from '@/components/podcasts/SpeakerProfileFormDialog.vue'
import {
  usePodcastEpisodes,
  episodeGroup,
  useEpisodeProfiles,
  useSpeakerProfiles,
  useDeleteEpisodeProfile,
  useDeleteSpeakerProfile,
  type StatusGroup,
} from '@/composables/usePodcasts'
import type { EpisodeProfile, SpeakerProfile, PodcastEpisode } from '@/types/podcast'

const { t } = useI18n()
const tab = ref<'episodes' | 'templates'>('episodes')

// --- Episodes ---
const { data: episodes, isLoading, isFetching, refetch } = usePodcastEpisodes()
const generateOpen = ref(false)

const statusGroups = computed(() => {
  const out: Record<StatusGroup, PodcastEpisode[]> = { running: [], pending: [], completed: [], failed: [] }
  for (const e of episodes.value ?? []) out[episodeGroup(e.job_status)].push(e)
  return out
})
const counts = computed(() => ({
  total: episodes.value?.length ?? 0,
  running: statusGroups.value.running.length,
  pending: statusGroups.value.pending.length,
  completed: statusGroups.value.completed.length,
  failed: statusGroups.value.failed.length,
}))
const statusOrder = [
  { key: 'running', title: 'statusRunningTitle' },
  { key: 'pending', title: 'statusPendingTitle' },
  { key: 'completed', title: 'statusCompletedTitle' },
  { key: 'failed', title: 'statusFailedTitle' },
] as const

// --- Templates ---
const { data: episodeProfiles } = useEpisodeProfiles()
const { data: speakerProfiles } = useSpeakerProfiles()
const delEpisodeProfile = useDeleteEpisodeProfile()
const delSpeakerProfile = useDeleteSpeakerProfile()

const episodeFormOpen = ref(false)
const editingEpisode = ref<EpisodeProfile | null>(null)
function newEpisodeProfile() { editingEpisode.value = null; episodeFormOpen.value = true }
function editEpisodeProfile(p: EpisodeProfile) { editingEpisode.value = p; episodeFormOpen.value = true }

const speakerFormOpen = ref(false)
const editingSpeaker = ref<SpeakerProfile | null>(null)
function newSpeakerProfile() { editingSpeaker.value = null; speakerFormOpen.value = true }
function editSpeakerProfile(p: SpeakerProfile) { editingSpeaker.value = p; speakerFormOpen.value = true }
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6 p-6">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">{{ t('podcasts.listTitle') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('podcasts.listDesc') }}</p>
    </header>

    <!-- Tabs -->
    <div class="inline-flex rounded-md border p-0.5">
      <button class="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm" :class="tab === 'episodes' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'" @click="tab = 'episodes'">
        <Mic class="size-4" />{{ t('podcasts.episodesTab') }}
      </button>
      <button class="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm" :class="tab === 'templates' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'" @click="tab = 'templates'">
        <LayoutTemplate class="size-4" />{{ t('podcasts.templatesTab') }}
      </button>
    </div>

    <!-- EPISODES -->
    <div v-if="tab === 'episodes'" class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-2">
          <Badge variant="outline">{{ t('podcasts.total') }}: {{ counts.total }}</Badge>
          <Badge variant="outline">{{ t('podcasts.processingLabel') }}: {{ counts.running }}</Badge>
          <Badge variant="outline">{{ t('podcasts.completedLabel') }}: {{ counts.completed }}</Badge>
          <Badge variant="outline">{{ t('podcasts.failedLabel') }}: {{ counts.failed }}</Badge>
        </div>
        <div class="flex items-center gap-2">
          <Button @click="generateOpen = true"><Plus class="size-4" />{{ t('podcasts.generateBtn') }}</Button>
          <Button variant="outline" size="icon" class="size-9" @click="refetch()">
            <RefreshCcw class="size-4" :class="isFetching ? 'animate-spin' : ''" />
          </Button>
        </div>
      </div>

      <div v-if="isLoading" class="flex items-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        <Loader2 class="size-4 animate-spin" />{{ t('podcasts.loadingEpisodes') }}
      </div>
      <div v-else-if="counts.total === 0" class="rounded-lg border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">
        {{ t('podcasts.noEpisodesYet') }}
      </div>

      <section v-for="grp in statusOrder" v-else :key="grp.key">
        <template v-if="statusGroups[grp.key].length">
          <h3 class="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">{{ t(`podcasts.${grp.title}`) }}</h3>
          <div class="space-y-3">
            <EpisodeCard v-for="ep in statusGroups[grp.key]" :key="ep.id" :episode="ep" />
          </div>
        </template>
      </section>
    </div>

    <!-- TEMPLATES -->
    <div v-else class="space-y-8">
      <!-- Episode profiles -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-medium">{{ t('podcasts.episodeProfiles') }}</h2>
          <Button variant="outline" size="sm" @click="newEpisodeProfile"><Plus class="size-4" />{{ t('podcasts.newEpisodeProfile') }}</Button>
        </div>
        <div v-if="!episodeProfiles?.length" class="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          {{ t('podcasts.noEpisodeProfiles') }}
        </div>
        <div v-else class="grid gap-3 sm:grid-cols-2">
          <Card v-for="p in episodeProfiles" :key="p.id" class="p-4">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-semibold">{{ p.name }}</p>
                <p class="truncate text-sm text-muted-foreground">{{ p.description || t('notebooks.noDescription') }}</p>
              </div>
              <div class="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" class="size-8" @click="editEpisodeProfile(p)"><Pencil class="size-4" /></Button>
                <Button variant="ghost" size="icon" class="size-8 text-destructive" @click="delEpisodeProfile.mutate(p.id)"><Trash2 class="size-4" /></Button>
              </div>
            </div>
            <div class="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline">{{ t('podcasts.speakerProfile') }}: {{ p.speaker_config }}</Badge>
              <Badge variant="outline">{{ t('podcasts.segments') }}: {{ p.num_segments }}</Badge>
            </div>
          </Card>
        </div>
      </section>

      <!-- Speaker profiles -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-medium">{{ t('podcasts.speakerProfiles') }}</h2>
          <Button variant="outline" size="sm" @click="newSpeakerProfile"><Plus class="size-4" />{{ t('podcasts.newSpeakerProfile') }}</Button>
        </div>
        <div v-if="!speakerProfiles?.length" class="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          {{ t('podcasts.noSpeakerProfiles') }}
        </div>
        <div v-else class="grid gap-3 sm:grid-cols-2">
          <Card v-for="p in speakerProfiles" :key="p.id" class="p-4">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-semibold">{{ p.name }}</p>
                <p class="truncate text-sm text-muted-foreground">{{ p.description || t('notebooks.noDescription') }}</p>
              </div>
              <div class="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" class="size-8" @click="editSpeakerProfile(p)"><Pencil class="size-4" /></Button>
                <Button variant="ghost" size="icon" class="size-8 text-destructive" @click="delSpeakerProfile.mutate(p.id)"><Trash2 class="size-4" /></Button>
              </div>
            </div>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <Badge v-for="(s, i) in p.speakers" :key="i" variant="outline">{{ s.name }}</Badge>
            </div>
          </Card>
        </div>
      </section>
    </div>

    <GeneratePodcastDialog v-model:open="generateOpen" />
    <EpisodeProfileFormDialog v-model:open="episodeFormOpen" :profile="editingEpisode" />
    <SpeakerProfileFormDialog v-model:open="speakerFormOpen" :profile="editingSpeaker" />
  </div>
</template>
