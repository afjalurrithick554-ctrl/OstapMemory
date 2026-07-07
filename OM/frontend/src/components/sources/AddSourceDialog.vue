<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Link2, FileText, Type } from 'lucide-vue-next'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import ExpandableTextarea from '@/components/ui/ExpandableTextarea.vue'
import Label from '@/components/ui/Label.vue'
import { useCreateSource } from '@/composables/useSources'
import { useSpacesStore } from '@/stores/spaces'
import type { SourceType } from '@/types/source'

// notebookId пустой → источник добавляется без привязки (пространство «Источники»).
// spaceId задан (для проектов) → источник наследует проект.
const props = withDefaults(defineProps<{ notebookId?: string; spaceId?: string }>(), { notebookId: '', spaceId: '' })
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const create = useCreateSource()
const spaces = useSpacesStore()
onMounted(() => spaces.load())

const tab = ref<SourceType>('link')
const url = ref('')
const content = ref('')
const title = ref('')
const file = ref<File | null>(null)
const embed = ref(false)
const error = ref('')

// Выбор проекта доступен только при создании в дефолтном «Источники» (нет
// родителя-ячейки и не задан space заранее). Пусто = дефолтный (глобальный).
const chosenProject = ref('')
const canPickProject = computed(() => !props.notebookId && !props.spaceId)
const effectiveSpaceId = computed(() => props.spaceId || chosenProject.value || undefined)

const tabs: { value: SourceType; icon: typeof Link2; label: string }[] = [
  { value: 'link', icon: Link2, label: 'sources.tabLink' },
  { value: 'upload', icon: FileText, label: 'sources.tabFile' },
  { value: 'text', icon: Type, label: 'sources.tabText' },
]

function reset() {
  tab.value = 'link'
  url.value = ''
  content.value = ''
  title.value = ''
  file.value = null
  embed.value = false
  error.value = ''
  chosenProject.value = ''
}
watch(open, (v) => { if (!v) reset() })

function onFile(e: Event) {
  const target = e.target as HTMLInputElement
  file.value = target.files?.[0] ?? null
}

const canSubmit = computed(() => {
  if (create.isPending.value) return false
  if (tab.value === 'link') return !!url.value.trim()
  if (tab.value === 'upload') return !!file.value
  return !!content.value.trim()
})

async function submit() {
  error.value = ''
  try {
    await create.mutateAsync({
      type: tab.value,
      notebook_id: props.notebookId,
      space_id: effectiveSpaceId.value,
      title: title.value.trim() || undefined,
      url: tab.value === 'link' ? url.value.trim() : undefined,
      content: tab.value === 'text' ? content.value : undefined,
      file: tab.value === 'upload' ? file.value ?? undefined : undefined,
      embed: embed.value,
      async_processing: true,
    })
    open.value = false
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      || t('sources.addError')
  }
}
</script>

<template>
  <Dialog v-model:open="open" :title="t('sources.add')" :description="t('sources.addDesc')">
    <form class="space-y-4" @submit.prevent="submit">
      <div class="flex gap-2">
        <Button
          v-for="tb in tabs" :key="tb.value" type="button"
          :variant="tab === tb.value ? 'default' : 'outline'"
          class="h-auto flex-1 flex-col py-3" @click="tab = tb.value"
        >
          <component :is="tb.icon" class="size-4" />
          <span class="text-xs">{{ t(tb.label) }}</span>
        </Button>
      </div>

      <div v-if="tab === 'link'" class="space-y-2">
        <Label for="src-url">URL *</Label>
        <Input id="src-url" v-model="url" type="url" placeholder="https://..." />
      </div>

      <div v-else-if="tab === 'upload'" class="space-y-2">
        <Label for="src-file">{{ t('sources.file') }} *</Label>
        <input
          id="src-file" type="file" class="block w-full text-sm file:mr-3 file:rounded-md
          file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-secondary-foreground"
          @change="onFile"
        />
      </div>

      <div v-else class="space-y-2">
        <Label for="src-text">{{ t('sources.text') }} *</Label>
        <ExpandableTextarea id="src-text" v-model="content" :rows="6" :placeholder="t('sources.textPlaceholder')" :title="t('sources.text')" />
      </div>

      <!-- Проект источника: доступно только при создании в дефолтном «Источники».
           Пусто = дефолтный (глобальный) источник. -->
      <div v-if="canPickProject && spaces.projects.length" class="space-y-2">
        <Label for="src-project">{{ t('sources.projectLabel') }}</Label>
        <select
          id="src-project"
          v-model="chosenProject"
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">{{ t('sources.noProject') }}</option>
          <option v-for="p in spaces.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>

      <div class="space-y-2">
        <Label for="src-title">{{ t('sources.titleOptional') }}</Label>
        <Input id="src-title" v-model="title" :placeholder="t('sources.titlePlaceholder')" />
      </div>

      <label class="flex items-center gap-2 text-sm">
        <input v-model="embed" type="checkbox" class="size-4 rounded border-input" />
        {{ t('sources.embedHint') }}
      </label>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" @click="open = false">{{ t('common.cancel') }}</Button>
        <Button type="submit" :disabled="!canSubmit">
          {{ create.isPending.value ? t('sources.adding') : t('sources.add') }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>
