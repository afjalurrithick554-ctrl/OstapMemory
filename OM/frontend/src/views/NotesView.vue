<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { StickyNote, Plus, Trash2, Folder, FolderMinus } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Dialog from '@/components/ui/Dialog.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import DropdownItem from '@/components/ui/DropdownItem.vue'
import NoteEditorDialog from '@/components/notes/NoteEditorDialog.vue'
import { listAllNotes, deleteNote, updateNote } from '@/api/notes'
import type { Note } from '@/types/note'
import { useSpacesStore } from '@/stores/spaces'

const { t, locale } = useI18n()
const spaces = useSpacesStore()

// Стикер родителя: проект (space kind=project) по space_id; null → глобальная (без стикера).
function projectFor(note: Note) {
  return note.space_id ? spaces.projects.find((s) => s.id === note.space_id) ?? null : null
}
function moveTargetsFor(note: Note) {
  return spaces.projects.filter((s) => s.id !== note.space_id)
}
async function assignProject(note: Note, spaceId: string | null) {
  await updateNote(note.id, { space_id: spaceId ?? '' })
  note.space_id = spaceId // локально обновляем стикер (список ведём вручную)
}

const notes = ref<Note[]>([])
const loading = ref(true)

// Диалог создания/редактирования: notebookId="" — заметка без привязки.
const editorOpen = ref(false)
const editing = ref<Note | null>(null)
const deleteDialog = ref<{ open: boolean; note: Note | null }>({ open: false, note: null })

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const lang = locale.value === 'ru-RU' ? 'ru' : 'en'
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  if (days >= 1) return rtf.format(-days, 'day')
  if (hours >= 1) return rtf.format(-hours, 'hour')
  if (minutes >= 1) return rtf.format(-minutes, 'minute')
  return rtf.format(-Math.floor(diff / 1000), 'second')
}

function snippet(note: Note): string {
  const text = (note.content ?? '').replace(/\s+/g, ' ').trim()
  return text.length > 160 ? text.slice(0, 160) + '…' : text
}

async function fetchNotes() {
  loading.value = true
  try {
    notes.value = await listAllNotes()
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  fetchNotes()
  spaces.load()
})

function openCreate() {
  editing.value = null
  editorOpen.value = true
}
function openEdit(note: Note) {
  editing.value = note
  editorOpen.value = true
}
function onEditorClosed(open: boolean) {
  if (!open) fetchNotes()
}

function openDelete(e: MouseEvent, note: Note) {
  e.stopPropagation()
  deleteDialog.value = { open: true, note }
}
async function confirmDelete() {
  if (!deleteDialog.value.note) return
  await deleteNote(deleteDialog.value.note.id)
  notes.value = notes.value.filter((n) => n.id !== deleteDialog.value.note?.id)
  deleteDialog.value = { open: false, note: null }
}
</script>

<template>
  <div class="flex h-full flex-col p-6">
    <!-- Шапка -->
    <div class="mb-6 flex shrink-0 items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">{{ t('notes.allNotes') }}</h1>
        <p class="mt-2 text-muted-foreground">{{ t('notes.allNotesDesc') }}</p>
      </div>
      <Button class="shrink-0 gap-2" @click="openCreate">
        <Plus class="size-4" />
        {{ t('notes.add') }}
      </Button>
    </div>

    <!-- Загрузка -->
    <div v-if="loading" class="flex flex-1 items-center justify-center">
      <span class="text-sm text-muted-foreground">{{ t('common.loading') }}</span>
    </div>

    <!-- Пустое состояние -->
    <div v-else-if="!notes.length" class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <StickyNote class="size-12 text-muted-foreground/40" />
      <p class="text-lg font-medium">{{ t('notes.empty') }}</p>
      <Button class="mt-2 gap-2" @click="openCreate">
        <Plus class="size-4" />
        {{ t('notes.add') }}
      </Button>
    </div>

    <!-- Список заметок -->
    <div v-else class="flex-1 overflow-auto">
      <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="note in notes"
          :key="note.id"
          class="group relative cursor-pointer rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-shadow hover:shadow-md"
          @click="openEdit(note)"
        >
          <div class="mb-1 flex items-start justify-between gap-2">
            <h3 class="truncate font-medium">{{ note.title || t('notes.untitled') }}</h3>
            <button
              class="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-destructive group-hover:opacity-100"
              :aria-label="t('common.delete')"
              @click="openDelete($event, note)"
            >
              <Trash2 class="size-3.5" />
            </button>
          </div>
          <p class="line-clamp-3 text-sm text-muted-foreground">{{ snippet(note) }}</p>
          <div class="mt-2 flex items-center justify-between gap-2">
            <!-- Ярлык родителя: имя ноутбука (ячейки/подзадачи), к которому привязана
                 заметка. Показываем родителя, а не весь проект. Read-only. -->
            <Badge
              v-if="note.parent_name"
              variant="secondary"
              class="max-w-[10rem] gap-1"
              :title="note.parent_name"
            >
              <Folder class="size-3 shrink-0" /><span class="truncate">{{ note.parent_name }}</span>
            </Badge>
            <!-- Заметка без родителя-ноутбука: стикер проекта, клик — сменить/убрать. -->
            <div v-else-if="projectFor(note)" @click.stop>
              <DropdownMenu>
                <template #trigger>
                  <Badge variant="secondary" class="max-w-[9rem] cursor-pointer gap-1 hover:opacity-80">
                    <Folder class="size-3 shrink-0" /><span class="truncate">{{ projectFor(note)!.name }}</span>
                  </Badge>
                </template>
                <DropdownItem v-for="p in moveTargetsFor(note)" :key="p.id" @select="assignProject(note, p.id)">
                  <Folder class="size-4" />{{ t('notes.assignTo', { name: p.name }) }}
                </DropdownItem>
                <DropdownItem @select="assignProject(note, null)">
                  <FolderMinus class="size-4" />{{ t('notes.makeDefault') }}
                </DropdownItem>
              </DropdownMenu>
            </div>
            <!-- Дефолтная заметка (без стикера): дать назначить проект. -->
            <div v-else-if="moveTargetsFor(note).length" @click.stop>
              <DropdownMenu>
                <template #trigger>
                  <Badge variant="outline" class="cursor-pointer gap-1 border-dashed text-muted-foreground hover:opacity-80">
                    <Folder class="size-3 shrink-0" />{{ t('notes.assignProject') }}
                  </Badge>
                </template>
                <DropdownItem v-for="p in moveTargetsFor(note)" :key="p.id" @select="assignProject(note, p.id)">
                  <Folder class="size-4" />{{ t('notes.assignTo', { name: p.name }) }}
                </DropdownItem>
              </DropdownMenu>
            </div>
            <span class="ml-auto shrink-0 text-xs text-muted-foreground/70">{{ formatRelative(note.updated) }}</span>
          </div>
        </li>
      </ul>
    </div>

    <!-- Создание/редактирование заметки без привязки -->
    <NoteEditorDialog
      v-model:open="editorOpen"
      :notebook-id="''"
      :note="editing"
      @update:open="onEditorClosed"
    />

    <!-- Подтверждение удаления -->
    <Dialog v-model:open="deleteDialog.open" :title="t('notes.deleteConfirm')">
      <div class="flex justify-end gap-2 pt-2">
        <Button variant="outline" @click="deleteDialog.open = false">{{ t('common.cancel') }}</Button>
        <Button variant="destructive" @click="confirmDelete">{{ t('common.delete') }}</Button>
      </div>
    </Dialog>
  </div>
</template>
