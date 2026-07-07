<script setup lang="ts">
import { ref, computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import NoteCard from './NoteCard.vue'
import NoteEditorDialog from './NoteEditorDialog.vue'
import { useNotes, useDeleteNote } from '@/composables/useNotes'
import { useContextStore } from '@/stores/context'
import type { Note } from '@/types/note'
import type { NoteContextLevel } from '@/types/context'

// spaceId задан (для проектов) → новая заметка наследует этот проект.
const props = withDefaults(defineProps<{ notebookId: string; spaceId?: string }>(), { spaceId: '' })
const { t } = useI18n()

const id = toRef(props, 'notebookId')
const { data: notes, isLoading } = useNotes(id)
const del = useDeleteNote(id)
const ctx = useContextStore()

const editorOpen = ref(false)
const editing = ref<Note | null>(null)

const ids = computed(() => (notes.value ?? []).map((n) => n.id))

function levelOf(noteId: string): string {
  return ctx.noteLevel(props.notebookId, noteId)
}
function setLevel(noteId: string, level: string) {
  ctx.setNoteLevel(props.notebookId, noteId, level as NoteContextLevel)
}
function setAll(level: NoteContextLevel) {
  ctx.setAllNotes(props.notebookId, ids.value, level)
}

function openNew() {
  editing.value = null
  editorOpen.value = true
}
function openEdit(note: Note) {
  editing.value = note
  editorOpen.value = true
}
async function remove(noteId: string) {
  if (!confirm(t('notes.deleteConfirm'))) return
  await del.mutateAsync(noteId)
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <Button size="sm" variant="outline" class="gap-1" @click="openNew">
        <Plus class="size-4" />{{ t('notes.add') }}
      </Button>
      <div v-if="notes && notes.length" class="flex gap-1">
        <Button size="sm" variant="ghost" class="h-7 px-2 text-xs" @click="setAll('full content')">
          {{ t('context.allIn') }}
        </Button>
        <Button size="sm" variant="ghost" class="h-7 px-2 text-xs" @click="setAll('not in')">
          {{ t('context.allOut') }}
        </Button>
      </div>
    </div>

    <p v-if="isLoading" class="text-sm text-muted-foreground">{{ t('common.loading') }}</p>
    <p v-else-if="!notes?.length" class="text-sm text-muted-foreground">{{ t('notes.empty') }}</p>

    <div v-else class="space-y-2">
      <NoteCard
        v-for="n in notes" :key="n.id" :note="n"
        :level="levelOf(n.id)"
        @update:level="setLevel(n.id, $event)"
        @edit="openEdit(n)"
        @delete="remove(n.id)"
      />
    </div>

    <NoteEditorDialog v-model:open="editorOpen" :notebook-id="notebookId" :note="editing" :space-id="spaceId" />
  </div>
</template>
