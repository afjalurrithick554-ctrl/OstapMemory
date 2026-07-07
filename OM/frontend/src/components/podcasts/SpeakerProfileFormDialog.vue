<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2 } from 'lucide-vue-next'
import Dialog from '@/components/ui/Dialog.vue'
import Input from '@/components/ui/Input.vue'
import ExpandableTextarea from '@/components/ui/ExpandableTextarea.vue'
import Label from '@/components/ui/Label.vue'
import Button from '@/components/ui/Button.vue'
import { useModelsByType } from '@/composables/useModels'
import { useCreateSpeakerProfile, useUpdateSpeakerProfile } from '@/composables/usePodcasts'
import type { SpeakerProfile, Speaker } from '@/types/podcast'

const props = defineProps<{ profile?: SpeakerProfile | null }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const { data: ttsModels } = useModelsByType('text_to_speech')
const create = useCreateSpeakerProfile()
const update = useUpdateSpeakerProfile()

const name = ref('')
const description = ref('')
const voiceModel = ref('')
const speakers = ref<Speaker[]>([])
const error = ref('')

function emptySpeaker(): Speaker {
  return { name: '', voice_id: '', backstory: '', personality: '' }
}

watch(open, (v) => {
  if (!v) return
  const p = props.profile
  name.value = p?.name ?? ''
  description.value = p?.description ?? ''
  voiceModel.value = p?.voice_model ?? ''
  speakers.value = p?.speakers?.length
    ? p.speakers.map((s) => ({ ...s }))
    : [emptySpeaker()]
  error.value = ''
})

function addSpeaker() {
  if (speakers.value.length >= 4) return
  speakers.value = [...speakers.value, emptySpeaker()]
}
function removeSpeaker(i: number) {
  speakers.value = speakers.value.filter((_, idx) => idx !== i)
}

async function submit() {
  if (!name.value.trim() || !speakers.value.length || speakers.value.some((s) => !s.name.trim() || !s.voice_id.trim())) {
    error.value = t('podcasts.speakerRequired')
    return
  }
  error.value = ''
  const body = {
    name: name.value,
    description: description.value,
    voice_model: voiceModel.value || null,
    speakers: speakers.value,
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
    :title="profile ? t('podcasts.editSpeakerProfile') : t('podcasts.newSpeakerProfile')"
    :description="t('podcasts.speakerProfileDesc')"
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
        <Label>{{ t('podcasts.voiceModel') }}</Label>
        <select v-model="voiceModel" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
          <option value="">{{ t('common.none') }}</option>
          <option v-for="m in ttsModels" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>{{ t('podcasts.speakers') }}</Label>
          <Button v-if="speakers.length < 4" variant="outline" size="sm" @click="addSpeaker">
            <Plus class="size-4" />{{ t('podcasts.addSpeaker') }}
          </Button>
        </div>
        <div v-for="(s, i) in speakers" :key="i" class="space-y-2 rounded-md border p-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-muted-foreground">{{ t('podcasts.speaker') }} {{ i + 1 }}</span>
            <Button v-if="speakers.length > 1" variant="ghost" size="icon" class="size-7 text-destructive" @click="removeSpeaker(i)">
              <Trash2 class="size-3.5" />
            </Button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <Input v-model="s.name" :placeholder="t('podcasts.speakerName')" />
            <Input v-model="s.voice_id" :placeholder="t('podcasts.voiceId')" />
          </div>
          <ExpandableTextarea v-model="s.backstory" :rows="2" :placeholder="t('podcasts.backstory')" :title="t('podcasts.backstory')" />
          <ExpandableTextarea v-model="s.personality" :rows="2" :placeholder="t('podcasts.personality')" :title="t('podcasts.personality')" />
        </div>
      </div>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="open = false">{{ t('common.cancel') }}</Button>
        <Button :disabled="create.isPending.value || update.isPending.value" @click="submit">{{ t('common.save') }}</Button>
      </div>
    </div>
  </Dialog>
</template>
