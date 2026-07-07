<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Info, RefreshCcw, Trash2 } from 'lucide-vue-next'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Dialog from '@/components/ui/Dialog.vue'
import { fetchEpisodeAudioUrl } from '@/api/podcasts'
import { useDeleteEpisode, useRetryEpisode, FAILED_STATUSES } from '@/composables/usePodcasts'
import type { PodcastEpisode, OutlineSegment, TranscriptEntry, EpisodeStatus } from '@/types/podcast'

const props = defineProps<{ episode: PodcastEpisode }>()
const { t } = useI18n()
const del = useDeleteEpisode()
const retry = useRetryEpisode()

const status = computed(() => (props.episode.job_status ?? '') as string)
const isCompleted = computed(() => status.value === 'completed')
const isFailed = computed(() => FAILED_STATUSES.includes(status.value as EpisodeStatus))

const statusMeta = computed(() => {
  const s = status.value
  if (s === 'completed') return { label: t('podcasts.completedLabel'), cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' }
  if (s === 'failed' || s === 'error') return { label: t('podcasts.failedLabel'), cls: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' }
  if (s === 'pending' || s === 'submitted') return { label: t('podcasts.pendingLabel'), cls: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300' }
  return { label: t('podcasts.processingLabel'), cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' }
})

const profileName = computed(() => (props.episode.episode_profile?.name as string) || t('common.none'))
const outlineSegments = computed<OutlineSegment[]>(() => props.episode.outline?.segments ?? [])
const transcriptEntries = computed<TranscriptEntry[]>(() => props.episode.transcript?.transcript ?? [])

// Аудио — подгружаем blob с авторизацией, только когда эпизод готов.
const audioSrc = ref<string>()
const audioError = ref('')
watch(
  () => [props.episode.id, isCompleted.value] as const,
  async ([, done]) => {
    if (audioSrc.value) { URL.revokeObjectURL(audioSrc.value); audioSrc.value = undefined }
    audioError.value = ''
    if (!done) return
    try {
      audioSrc.value = await fetchEpisodeAudioUrl(props.episode.id)
    } catch {
      audioError.value = t('podcasts.audioUnavailable')
    }
  },
  { immediate: true },
)
onUnmounted(() => { if (audioSrc.value) URL.revokeObjectURL(audioSrc.value) })

const detailsOpen = ref(false)
const detailsTab = ref<'summary' | 'outline' | 'transcript'>('summary')

function remove() {
  if (confirm(t('podcasts.deleteEpisodeDesc', { name: props.episode.name }))) del.mutate(props.episode.id)
}
</script>

<template>
  <Card class="space-y-3 p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="font-semibold">{{ episode.name }}</h3>
          <Badge v-if="!isCompleted" variant="outline" :class="statusMeta.cls">{{ statusMeta.label }}</Badge>
        </div>
        <p class="text-xs text-muted-foreground">{{ t('podcasts.profile') }}: {{ profileName }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <Button variant="outline" size="sm" @click="detailsOpen = true"><Info class="size-4" />{{ t('podcasts.details') }}</Button>
        <Button v-if="isFailed" variant="outline" size="sm" :disabled="retry.isPending.value" @click="retry.mutate(episode.id)">
          <RefreshCcw class="size-4" :class="retry.isPending.value ? 'animate-spin' : ''" />{{ t('podcasts.retry') }}
        </Button>
        <Button variant="ghost" size="icon" class="size-8 text-destructive" @click="remove"><Trash2 class="size-4" /></Button>
      </div>
    </div>

    <audio v-if="audioSrc" controls preload="none" :src="audioSrc" class="w-full" />
    <p v-else-if="audioError" class="text-sm text-destructive">{{ audioError }}</p>

    <div v-if="isFailed && episode.error_message" class="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
      <p class="text-xs font-medium text-red-800 dark:text-red-300">{{ t('podcasts.errorDetails') }}</p>
      <p class="mt-1 whitespace-pre-wrap text-xs text-red-700 dark:text-red-400">{{ episode.error_message }}</p>
    </div>

    <!-- Детали -->
    <Dialog v-model:open="detailsOpen" :title="episode.name" :description="profileName">
      <div class="mb-3 inline-flex rounded-md border p-0.5 text-sm">
        <button v-for="tabKey in (['summary','outline','transcript'] as const)" :key="tabKey"
          class="rounded px-3 py-1" :class="detailsTab === tabKey ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'"
          @click="detailsTab = tabKey">
          {{ t(`podcasts.${tabKey}Tab`) }}
        </button>
      </div>

      <div class="max-h-[55vh] space-y-3 overflow-y-auto text-sm">
        <template v-if="detailsTab === 'summary'">
          <div v-if="episode.briefing" class="whitespace-pre-wrap rounded border bg-muted/30 p-3 text-xs">{{ episode.briefing }}</div>
          <p v-else class="text-xs text-muted-foreground">{{ t('podcasts.noBriefing') }}</p>
        </template>

        <template v-else-if="detailsTab === 'outline'">
          <div v-if="outlineSegments.length" class="space-y-2">
            <div v-for="(s, i) in outlineSegments" :key="i" class="rounded border bg-muted/20 p-3 text-xs">
              <div class="flex items-center justify-between">
                <p class="font-semibold">{{ s.name ?? `${t('podcasts.segment')} ${i + 1}` }}</p>
                <Badge v-if="s.size" variant="outline" class="text-[10px]">{{ s.size }}</Badge>
              </div>
              <p class="mt-1 whitespace-pre-wrap text-muted-foreground">{{ s.description ?? t('podcasts.noDescription') }}</p>
            </div>
          </div>
          <p v-else class="text-xs text-muted-foreground">{{ t('podcasts.noOutline') }}</p>
        </template>

        <template v-else>
          <div v-if="transcriptEntries.length" class="space-y-2">
            <div v-for="(e, i) in transcriptEntries" :key="i" class="rounded border bg-muted/20 p-3 text-xs">
              <p class="font-semibold">{{ e.speaker ?? t('podcasts.speaker') }}</p>
              <p class="mt-1 whitespace-pre-wrap text-muted-foreground">{{ e.dialogue ?? '' }}</p>
            </div>
          </div>
          <p v-else class="text-xs text-muted-foreground">{{ t('podcasts.noTranscript') }}</p>
        </template>
      </div>
    </Dialog>
  </Card>
</template>
