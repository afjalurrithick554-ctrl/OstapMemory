<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pencil, Eye } from 'lucide-vue-next'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import { renderMarkdown } from '@/lib/markdown'
import { useCreateNote, useUpdateNote } from '@/composables/useNotes'
import type { Note } from '@/types/note'

// note задан → редактирование; иначе создание.
// spaceId задан (для проектов) → новая заметка наследует проект.
const props = withDefaults(defineProps<{ notebookId: string; note?: Note | null; spaceId?: string }>(), { spaceId: '' })
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const create = useCreateNote(props.notebookId)
const update = useUpdateNote(props.notebookId)

const title = ref('')
const content = ref('')
const preview = ref(false)

watch(open, (v) => {
  if (v) {
    title.value = props.note?.title ?? ''
    content.value = props.note?.content ?? ''
    preview.value = false
  }
})

const isEdit = computed(() => !!props.note)
const rendered = computed(() => renderMarkdown(content.value))
const pending = computed(() => create.isPending.value || update.isPending.value)

async function submit() {
  if (!content.value.trim()) return
  if (isEdit.value && props.note) {
    await update.mutateAsync({
      id: props.note.id,
      body: { title: title.value.trim() || undefined, content: content.value },
    })
  } else {
    await create.mutateAsync({
      title: title.value.trim() || undefined,
      content: content.value,
      note_type: 'human',
      notebook_id: props.notebookId,
      space_id: props.spaceId || undefined,
    })
  }
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open" :title="isEdit ? t('notes.edit') : t('notes.add')">
    <form class="space-y-4" @submit.prevent="submit">
      <div class="space-y-2">
        <Label for="note-title">{{ t('notes.titleOptional') }}</Label>
        <Input id="note-title" v-model="title" :placeholder="t('notes.titlePlaceholder')" />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>{{ t('notes.content') }} *</Label>
          <Button type="button" size="sm" variant="ghost" class="h-7 gap-1 px-2 text-xs" @click="preview = !preview">
            <component :is="preview ? Pencil : Eye" class="size-3.5" />
            {{ preview ? t('notes.edit') : t('notes.preview') }}
          </Button>
        </div>

        <textarea
          v-if="!preview" v-model="content" rows="10"
          :placeholder="t('notes.contentPlaceholder')"
          class="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm
          ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div
          v-else
          class="md-body min-h-[16rem] max-w-none overflow-y-auto rounded-md border bg-muted/30 px-3 py-2"
          v-html="rendered || `<p class='text-muted-foreground'>${t('notes.previewEmpty')}</p>`"
        />
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" @click="open = false">{{ t('common.cancel') }}</Button>
        <Button type="submit" :disabled="!content.trim() || pending">
          {{ pending ? t('common.saving') : t('common.save') }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>
