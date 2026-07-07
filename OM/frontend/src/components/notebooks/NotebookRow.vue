<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { FileText, StickyNote, ListChecks, ShieldCheck, CornerLeftUp, GitBranch, Folder } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import type { Notebook } from '@/types/notebook'
import { stateColor, stateTextColor, stateRing, checklistProgress, isCell, isArchived } from '@/lib/notebook'
import { useNotebooks } from '@/composables/useNotebooks'
import { useSpacesStore } from '@/stores/spaces'
import { useThemeStore } from '@/stores/theme'

const props = defineProps<{ notebook: Notebook }>()
const { t } = useI18n()
const router = useRouter()
const theme = useThemeStore()
const spaces = useSpacesStore()
onMounted(() => spaces.load())

const nb = computed(() => props.notebook)
const cell = computed(() => isCell(nb.value))
const progress = computed(() => checklistProgress(nb.value))

// Связь родитель↔подзадача (список из общего кэша).
const { data: allNotebooks } = useNotebooks()
const parent = computed(() =>
  nb.value.parent_id ? (allNotebooks.value ?? []).find((n) => n.id === nb.value.parent_id) ?? null : null,
)
// Стикер-пространство для верхнеуровневой карточки (когда нет родителя).
const projectSpace = computed(() =>
  nb.value.space_id ? spaces.projects.find((s) => s.id === nb.value.space_id) ?? null : null,
)
const childCount = computed(() =>
  (allNotebooks.value ?? []).filter((n) => n.parent_id === nb.value.id && !isArchived(n)).length,
)
function openParent() {
  if (nb.value.parent_id) router.push(`/notebooks/${encodeURIComponent(nb.value.parent_id)}`)
}

// Инверсия темы для административных ячеек (как в NotebookCard).
const invertClass = computed(() =>
  nb.value.is_admin ? (theme.isDark ? 'theme-light' : 'dark') : '',
)

function open() {
  router.push(`/notebooks/${encodeURIComponent(nb.value.id)}`)
}
</script>

<template>
  <div
    class="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 ring-1 ring-inset transition-colors hover:bg-accent"
    :class="[stateRing(nb.state), invertClass, nb.is_admin ? 'bg-card' : '']"
    @click="open"
  >
    <span class="size-2.5 shrink-0 rounded-full" :class="stateColor(nb.state)" />
    <span class="truncate font-medium" :class="stateTextColor(nb.state)">{{ nb.name }}</span>
    <Badge variant="outline" class="h-4 px-1 py-0 text-[10px]">
      {{ cell ? t('notebooks.typeCell') : (nb.notebook_type === 'subtask' ? t('notebooks.typeSubtask') : t('notebooks.typeTask')) }}
    </Badge>
    <Badge v-if="nb.is_admin" variant="secondary" class="h-4 gap-1 px-1 py-0 text-[10px]">
      <ShieldCheck class="size-3" />{{ t('notebooks.adminBadge') }}
    </Badge>
    <!-- Стикер родителя: подзадача → родитель (клик ведёт к родителю);
         иначе → пространство-проект (в ряду — только показ). -->
    <Badge
      v-if="parent"
      variant="outline"
      class="h-4 max-w-[12rem] cursor-pointer gap-1 px-1 py-0 text-[10px] hover:bg-accent"
      :title="t('notebooks.parentLabel', { name: parent.name })"
      @click.stop="openParent"
    >
      <CornerLeftUp class="size-3 shrink-0" /><span class="truncate">{{ parent.name }}</span>
    </Badge>
    <Badge v-else-if="projectSpace" variant="secondary" class="h-4 max-w-[12rem] gap-1 px-1 py-0 text-[10px]">
      <Folder class="size-3 shrink-0" /><span class="truncate">{{ projectSpace.name }}</span>
    </Badge>
    <!-- Отметка связи: есть подзадачи. -->
    <Badge
      v-if="childCount > 0"
      variant="outline"
      class="h-4 gap-1 px-1 py-0 text-[10px]"
      :title="t('notebooks.children')"
    >
      <GitBranch class="size-3 shrink-0" />{{ childCount }}
    </Badge>
    <span class="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
      <span v-if="progress.total > 0" class="flex items-center gap-1">
        <ListChecks class="size-3" />{{ progress.completed }}/{{ progress.total }}
      </span>
      <span class="flex items-center gap-1"><FileText class="size-3" />{{ nb.source_count }}</span>
      <span class="flex items-center gap-1"><StickyNote class="size-3" />{{ nb.note_count }}</span>
    </span>
  </div>
</template>
