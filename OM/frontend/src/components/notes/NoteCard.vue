<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQueryClient } from '@tanstack/vue-query'
import { Pencil, Trash2, MoreVertical, Sparkles, User, CircleSlash, FileText, Folder, FolderMinus } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import DropdownItem from '@/components/ui/DropdownItem.vue'
import ContextToggle from '@/components/context/ContextToggle.vue'
import type { Note } from '@/types/note'
import type { NoteContextLevel } from '@/types/context'
import { updateNote } from '@/api/notes'
import { noteKeys } from '@/composables/useNotes'
import { useSpacesStore } from '@/stores/spaces'

const props = defineProps<{ note: Note }>()
const emit = defineEmits<{ edit: []; delete: [] }>()
const level = defineModel<string>('level', { required: true })
const { t } = useI18n()
const spaces = useSpacesStore()
const qc = useQueryClient()
onMounted(() => spaces.load())

const isAi = computed(() => props.note.note_type === 'ai')

// Метка «дефолтная/проект»: к какому проекту привязана заметка (space_id).
const projectSpace = computed(() =>
  props.note.space_id ? spaces.projects.find((s) => s.id === props.note.space_id) ?? null : null,
)
const moveTargets = computed(() => spaces.projects.filter((s) => s.id !== props.note.space_id))
async function assign(spaceId: string | null) {
  await updateNote(props.note.id, { space_id: spaceId ?? '' })
  await qc.invalidateQueries({ queryKey: noteKeys.all })
}

// Краткое превью без markdown-разметки.
const snippet = computed(() => {
  const raw = (props.note.content ?? '').replace(/[#*`_>\-]/g, '').trim()
  return raw.length > 140 ? raw.slice(0, 140) + '…' : raw
})

const levelOptions = computed<{ value: NoteContextLevel; label: string; icon: typeof CircleSlash }[]>(() => [
  { value: 'not in', label: t('context.notIn'), icon: CircleSlash },
  { value: 'full content', label: t('context.fullContent'), icon: FileText },
])
</script>

<template>
  <div class="rounded-lg border bg-card p-3 text-card-foreground">
    <div class="flex items-start gap-2">
      <button type="button" class="min-w-0 flex-1 text-left" @click="emit('edit')">
        <p class="truncate text-sm font-medium hover:underline">
          {{ note.title || t('notes.untitled') }}
        </p>
        <p v-if="snippet" class="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{{ snippet }}</p>
      </button>
      <DropdownMenu>
        <template #trigger>
          <Button variant="ghost" size="icon" class="size-7 shrink-0"><MoreVertical class="size-4" /></Button>
        </template>
        <DropdownItem @select="emit('edit')"><Pencil class="size-4" />{{ t('common.edit') }}</DropdownItem>
        <!-- Назначить проект из меню — только для глобальной (без стикера) заметки. -->
        <template v-if="!note.space_id">
          <DropdownItem v-for="p in moveTargets" :key="p.id" @select="assign(p.id)">
            <Folder class="size-4" />{{ t('notes.assignTo', { name: p.name }) }}
          </DropdownItem>
        </template>
        <DropdownItem class="text-destructive" @select="emit('delete')">
          <Trash2 class="size-4" />{{ t('common.delete') }}
        </DropdownItem>
      </DropdownMenu>
    </div>

    <div class="mt-2 flex items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" class="gap-1">
          <component :is="isAi ? Sparkles : User" class="size-3" />
          {{ isAi ? t('notes.ai') : t('notes.human') }}
        </Badge>
        <!-- Ярлык родителя: имя ноутбука (ячейки/подзадачи), к которому привязана
             заметка. Показываем родителя, а не весь проект. Read-only. -->
        <Badge
          v-if="note.parent_name"
          variant="secondary"
          class="max-w-[9rem] gap-1"
          :title="note.parent_name"
        >
          <Folder class="size-3 shrink-0" /><span class="truncate">{{ note.parent_name }}</span>
        </Badge>
        <!-- Заметка без родителя-ноутбука: стикер проекта, клик — сменить/убрать. -->
        <DropdownMenu v-else-if="projectSpace">
          <template #trigger>
            <Badge variant="secondary" class="max-w-[9rem] cursor-pointer gap-1 hover:opacity-80">
              <Folder class="size-3 shrink-0" /><span class="truncate">{{ projectSpace.name }}</span>
            </Badge>
          </template>
          <DropdownItem v-for="p in moveTargets" :key="p.id" @select="assign(p.id)">
            <Folder class="size-4" />{{ t('notes.assignTo', { name: p.name }) }}
          </DropdownItem>
          <DropdownItem @select="assign(null)">
            <FolderMinus class="size-4" />{{ t('notes.makeDefault') }}
          </DropdownItem>
        </DropdownMenu>
      </div>
      <ContextToggle v-model="level" :options="levelOptions" />
    </div>
  </div>
</template>
