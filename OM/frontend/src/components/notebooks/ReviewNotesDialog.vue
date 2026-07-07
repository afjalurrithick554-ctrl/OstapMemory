<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Paperclip, X } from 'lucide-vue-next'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import ExpandableTextarea from '@/components/ui/ExpandableTextarea.vue'
import { uploadReviewFile } from '@/api/notebooks'
import type { GoalFile, ReviewNotes } from '@/types/notebook'

// Диалог «Внесённые замечания»: заполняется при возврате задачи из «Можно
// проверять» (3) в «В работе» (2). Текст обязателен; url и файл — опционально.
const props = defineProps<{ notebookId: string }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ submit: [notes: ReviewNotes] }>()
const { t } = useI18n()

const text = ref('')
const url = ref('')
const file = ref<GoalFile | null>(null)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function reset() {
  text.value = ''
  url.value = ''
  file.value = null
  uploading.value = false
}
watch(open, (v) => { if (v) reset() })

async function onFilePick(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (!f) return
  uploading.value = true
  try {
    file.value = await uploadReviewFile(props.notebookId, f)
  } finally {
    uploading.value = false
    input.value = ''
  }
}

const canSubmit = computed(() => !!text.value.trim() && !uploading.value)

function submit() {
  if (!canSubmit.value) return
  emit('submit', {
    text: text.value.trim(),
    url: url.value.trim() || undefined,
    file: file.value ?? undefined,
    created: new Date().toISOString(),
  })
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open" :title="t('notebooks.reviewNotesTitle')" :description="t('notebooks.reviewNotesDesc')">
    <form class="space-y-4" @submit.prevent="submit">
      <div class="space-y-2">
        <Label for="rn-text">{{ t('notebooks.reviewNotesText') }} *</Label>
        <ExpandableTextarea
          id="rn-text"
          v-model="text"
          :rows="4"
          :placeholder="t('notebooks.reviewNotesPlaceholder')"
          :title="t('notebooks.reviewNotesText')"
        />
      </div>

      <div class="space-y-2">
        <Label for="rn-url">URL</Label>
        <Input id="rn-url" v-model="url" type="url" placeholder="https://..." />
      </div>

      <div class="space-y-2">
        <Label>{{ t('notebooks.reviewNotesFile') }}</Label>
        <input ref="fileInput" type="file" class="hidden" @change="onFilePick" />
        <div class="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" :disabled="uploading" @click="fileInput?.click()">
            <Paperclip class="size-4" />{{ uploading ? t('common.loading') : t('notebooks.reviewNotesAttach') }}
          </Button>
          <span v-if="file" class="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            <span class="truncate">{{ file.name }}</span>
            <button type="button" class="shrink-0 hover:text-destructive" @click="file = null">
              <X class="size-3.5" />
            </button>
          </span>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" @click="open = false">{{ t('common.cancel') }}</Button>
        <Button type="submit" :disabled="!canSubmit">{{ t('notebooks.reviewNotesSubmit') }}</Button>
      </div>
    </form>
  </Dialog>
</template>
