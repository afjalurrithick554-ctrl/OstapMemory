<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from '@/components/ui/Dialog.vue'
import Input from '@/components/ui/Input.vue'
import ExpandableTextarea from '@/components/ui/ExpandableTextarea.vue'
import Label from '@/components/ui/Label.vue'
import Button from '@/components/ui/Button.vue'
import { useLanguageModels } from '@/composables/useModels'
import { useSpeakerProfiles, useCreateEpisodeProfile, useUpdateEpisodeProfile } from '@/composables/usePodcasts'
import type { EpisodeProfile } from '@/types/podcast'

const props = defineProps<{ profile?: EpisodeProfile | null }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const { data: languageModels } = useLanguageModels()
const { data: speakerProfiles } = useSpeakerProfiles()
const create = useCreateEpisodeProfile()
const update = useUpdateEpisodeProfile()

const name = ref('')
const description = ref('')
const speakerConfig = ref('')
const outlineLlm = ref('')
const transcriptLlm = ref('')
const language = ref('')
const defaultBriefing = ref('')
const numSegments = ref(5)
const error = ref('')

watch(open, (v) => {
  if (!v) return
  const p = props.profile
  name.value = p?.name ?? ''
  description.value = p?.description ?? ''
  speakerConfig.value = p?.speaker_config ?? speakerProfiles.value?.[0]?.name ?? ''
  outlineLlm.value = p?.outline_llm ?? ''
  transcriptLlm.value = p?.transcript_llm ?? ''
  language.value = p?.language ?? ''
  defaultBriefing.value = p?.default_briefing ?? ''
  numSegments.value = p?.num_segments ?? 5
  error.value = ''
})

async function submit() {
  if (!name.value.trim() || !speakerConfig.value || !defaultBriefing.value.trim()) {
    error.value = t('podcasts.profileRequired')
    return
  }
  error.value = ''
  const body = {
    name: name.value,
    description: description.value,
    speaker_config: speakerConfig.value,
    outline_llm: outlineLlm.value || null,
    transcript_llm: transcriptLlm.value || null,
    language: language.value || null,
    default_briefing: defaultBriefing.value,
    num_segments: numSegments.value,
  }
  try {
    if (props.profile) await update.mutateAsync({ id: props.profile.id, body })
    else await create.mutateAsync(body)
    open.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}
</script>

<template>
  <Dialog
    v-model:open="open"
    :title="profile ? t('podcasts.editEpisodeProfile') : t('podcasts.newEpisodeProfile')"
    :description="t('podcasts.episodeProfileDesc')"
  >
    <div class="max-h-[70vh] space-y-4 overflow-y-auto">
      <div class="space-y-1">
        <Label>{{ t('podcasts.profileName') }}</Label>
        <Input v-model="name" :placeholder="t('podcasts.profileNamePlaceholder')" />
      </div>
      <div class="space-y-1">
        <Label>{{ t('common.description') }}</Label>
        <Input v-model="description" />
      </div>
      <div class="space-y-1">
        <Label>{{ t('podcasts.speakerProfile') }}</Label>
        <select v-model="speakerConfig" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
          <option value="" disabled>{{ t('podcasts.selectSpeakerProfile') }}</option>
          <option v-for="p in speakerProfiles" :key="p.id" :value="p.name">{{ p.name }}</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <Label>{{ t('podcasts.outlineModel') }}</Label>
          <select v-model="outlineLlm" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="">{{ t('common.none') }}</option>
            <option v-for="m in languageModels" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
        <div class="space-y-1">
          <Label>{{ t('podcasts.transcriptModel') }}</Label>
          <select v-model="transcriptLlm" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="">{{ t('common.none') }}</option>
            <option v-for="m in languageModels" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <Label>{{ t('podcasts.language') }}</Label>
          <Input v-model="language" placeholder="ru" />
        </div>
        <div class="space-y-1">
          <Label>{{ t('podcasts.segments') }}</Label>
          <input
            v-model.number="numSegments"
            type="number"
            min="1"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
      <div class="space-y-1">
        <Label>{{ t('podcasts.defaultBriefing') }}</Label>
        <ExpandableTextarea v-model="defaultBriefing" :rows="4" :placeholder="t('podcasts.defaultBriefingPlaceholder')" :title="t('podcasts.defaultBriefing')" />
      </div>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="open = false">{{ t('common.cancel') }}</Button>
        <Button :disabled="create.isPending.value || update.isPending.value" @click="submit">{{ t('common.save') }}</Button>
      </div>
    </div>
  </Dialog>
</template>
