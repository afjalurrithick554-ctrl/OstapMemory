<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from '@/components/ui/Dialog.vue'
import Input from '@/components/ui/Input.vue'
import ExpandableTextarea from '@/components/ui/ExpandableTextarea.vue'
import Label from '@/components/ui/Label.vue'
import Button from '@/components/ui/Button.vue'
import { useEpisodeProfiles, useSpeakerProfiles, useGeneratePodcast } from '@/composables/usePodcasts'

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const { data: episodeProfiles } = useEpisodeProfiles()
const { data: speakerProfiles } = useSpeakerProfiles()
const generate = useGeneratePodcast()

const episodeProfile = ref('')
const speakerProfile = ref('')
const episodeName = ref('')
const content = ref('')
const briefingSuffix = ref('')
const error = ref('')

watch(open, (v) => {
  if (!v) return
  episodeProfile.value = episodeProfiles.value?.[0]?.name ?? ''
  speakerProfile.value = speakerProfiles.value?.[0]?.name ?? ''
  episodeName.value = ''
  content.value = ''
  briefingSuffix.value = ''
  error.value = ''
})

async function submit() {
  if (!episodeProfile.value || !speakerProfile.value || !episodeName.value.trim()) {
    error.value = t('podcasts.generateRequired')
    return
  }
  error.value = ''
  try {
    await generate.mutateAsync({
      episode_profile: episodeProfile.value,
      speaker_profile: speakerProfile.value,
      episode_name: episodeName.value,
      content: content.value || null,
      briefing_suffix: briefingSuffix.value || null,
    })
    open.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}
</script>

<template>
  <Dialog v-model:open="open" :title="t('podcasts.generateTitle')" :description="t('podcasts.generateDesc')">
    <div class="space-y-4">
      <div class="space-y-1">
        <Label>{{ t('podcasts.episodeProfile') }}</Label>
        <select v-model="episodeProfile" class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="" disabled>{{ t('podcasts.selectEpisodeProfile') }}</option>
          <option v-for="p in episodeProfiles" :key="p.id" :value="p.name">{{ p.name }}</option>
        </select>
      </div>

      <div class="space-y-1">
        <Label>{{ t('podcasts.speakerProfile') }}</Label>
        <select v-model="speakerProfile" class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="" disabled>{{ t('podcasts.selectSpeakerProfile') }}</option>
          <option v-for="p in speakerProfiles" :key="p.id" :value="p.name">{{ p.name }}</option>
        </select>
      </div>

      <div class="space-y-1">
        <Label>{{ t('podcasts.episodeName') }}</Label>
        <Input v-model="episodeName" :placeholder="t('podcasts.episodeNamePlaceholder')" />
      </div>

      <div class="space-y-1">
        <Label>{{ t('podcasts.contentLabel') }}</Label>
        <ExpandableTextarea v-model="content" :rows="4" :placeholder="t('podcasts.contentPlaceholder')" :title="t('podcasts.contentLabel')" />
      </div>

      <div class="space-y-1">
        <Label>{{ t('podcasts.briefingSuffix') }}</Label>
        <ExpandableTextarea v-model="briefingSuffix" :rows="2" :placeholder="t('podcasts.briefingSuffixPlaceholder')" :title="t('podcasts.briefingSuffix')" />
      </div>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="open = false">{{ t('common.cancel') }}</Button>
        <Button :disabled="generate.isPending.value" @click="submit">
          {{ generate.isPending.value ? t('podcasts.generating') : t('podcasts.generateBtn') }}
        </Button>
      </div>
    </div>
  </Dialog>
</template>
