<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  MoreHorizontal, Archive, ArchiveRestore, Trash2, FileText, StickyNote, ListChecks, ArrowLeftRight, ShieldCheck, Pencil, Folder, FolderMinus, CornerLeftUp, GitBranch,
} from 'lucide-vue-next'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import DropdownItem from '@/components/ui/DropdownItem.vue'
import QuickEditDialog from '@/components/notebooks/QuickEditDialog.vue'
import type { Notebook } from '@/types/notebook'
import { stateColor, stateTextColor, stateRing, stateBorder, stateTint, checklistProgress, isCell, isArchived, formatRelative } from '@/lib/notebook'
import { useNotebooks, useUpdateNotebook, useDeleteNotebook } from '@/composables/useNotebooks'
import { useSpacesStore } from '@/stores/spaces'
import { useLocaleStore } from '@/stores/locale'
import { useThemeStore } from '@/stores/theme'

const props = defineProps<{ notebook: Notebook }>()
const { t } = useI18n()
const router = useRouter()
const locale = useLocaleStore()
const theme = useThemeStore()
const spaces = useSpacesStore()
const update = useUpdateNotebook()
const del = useDeleteNotebook()

onMounted(() => spaces.load())

const nb = computed(() => props.notebook)
const cell = computed(() => isCell(nb.value))

// Связь родитель↔подзадача. Список ноутбуков переиспользуем из кэша (тот же
// query-ключ, что и в пространстве) — родителя и число подзадач берём из него.
const { data: allNotebooks } = useNotebooks()
const parent = computed(() =>
  nb.value.parent_id ? (allNotebooks.value ?? []).find((n) => n.id === nb.value.parent_id) ?? null : null,
)
// Архивные подзадачи в карточке родителя не учитываем (в списке их тоже не показываем).
const childCount = computed(() =>
  (allNotebooks.value ?? []).filter((n) => n.parent_id === nb.value.id && !isArchived(n)).length,
)
function openParent() {
  if (nb.value.parent_id) router.push(`/notebooks/${encodeURIComponent(nb.value.parent_id)}`)
}
// Стикер проекта: пространство, к которому привязана карточка (space_id).
const projectSpace = computed(() =>
  nb.value.space_id ? spaces.projects.find((s) => s.id === nb.value.space_id) ?? null : null,
)
// Проекты-получатели переноса (кроме текущего).
const moveTargets = computed(() => spaces.projects.filter((s) => s.id !== nb.value.space_id))
// Ячейка в state 0 подписывается «Новая ячейка», задача — «Идея».
const stateLabel = computed(() =>
  cell.value ? t('states.cell') : t(`states.state${nb.value.state}`),
)
const progress = computed(() => checklistProgress(nb.value))

// Модалка быстрого редактирования полей-гейтов (B9-a).
const editOpen = ref(false)

// Административная ячейка рендерится в противоположной теме: в тёмной теме
// форсируем светлую палитру (theme-light), в светлой — тёмную (dark).
const invertClass = computed(() =>
  nb.value.is_admin ? (theme.isDark ? 'theme-light' : 'dark') : '',
)
// Состояние отмечено цветом карточки: левая акцент-граница + мягкая заливка.
const cardClass = computed(() =>
  [
    stateRing(nb.value.state),
    'border-l-4',
    stateBorder(nb.value.state),
    stateTint(nb.value.state),
    invertClass.value,
  ]
    .filter(Boolean)
    .join(' '),
)

function open() {
  router.push(`/notebooks/${encodeURIComponent(nb.value.id)}`)
}
function toggleArchive() {
  update.mutate({ id: nb.value.id, body: { archived: !nb.value.archived } })
}
function toggleType() {
  update.mutate({ id: nb.value.id, body: { notebook_type: cell.value ? 'task' : 'cell' } })
}
function toggleAdmin() {
  update.mutate({ id: nb.value.id, body: { is_admin: !nb.value.is_admin } })
}
function remove() {
  if (confirm(t('notebooks.deleteConfirm', { name: nb.value.name }))) {
    del.mutate({ id: nb.value.id })
  }
}
// Перенос карточки в проект (spaceId) или в глобальные «Ячейки» (null → '').
function move(spaceId: string | null) {
  update.mutate({ id: nb.value.id, body: { space_id: spaceId ?? '' } })
}
</script>

<template>
  <Card
    class="group cursor-pointer p-4 ring-1 ring-inset transition-shadow hover:shadow-md"
    :class="cardClass"
    @click="open"
  >
    <div class="flex items-start justify-between">
      <div class="min-w-0 flex-1">
        <div class="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span class="size-2 rounded-full" :class="stateColor(nb.state)" />
          <span class="text-xs" :class="stateTextColor(nb.state)">{{ stateLabel }}</span>
          <Badge variant="outline" class="h-4 px-1 py-0 text-[10px]">
            {{ cell ? t('notebooks.typeCell') : (nb.notebook_type === 'subtask' ? t('notebooks.typeSubtask') : t('notebooks.typeTask')) }}
          </Badge>
          <Badge v-if="nb.is_admin" variant="secondary" class="h-4 gap-1 px-1 py-0 text-[10px]">
            <ShieldCheck class="size-3" />{{ t('notebooks.adminBadge') }}
          </Badge>
          <!-- Стикер родителя: есть parent_id → родительская ячейка (клик — открыть);
               иначе → пространство-проект (клик — сменить/убрать). Глобальная ячейка → стикера нет. -->
          <Badge
            v-if="parent"
            variant="outline"
            class="h-4 max-w-[10rem] cursor-pointer gap-1 px-1 py-0 text-[10px] hover:bg-accent"
            :title="t('notebooks.parentLabel', { name: parent.name })"
            @click.stop="openParent"
          >
            <CornerLeftUp class="size-3 shrink-0" /><span class="truncate">{{ parent.name }}</span>
          </Badge>
          <DropdownMenu v-else-if="projectSpace">
            <template #trigger>
              <Badge variant="secondary" class="h-4 max-w-[10rem] cursor-pointer gap-1 px-1 py-0 text-[10px] hover:opacity-80" @click.stop>
                <Folder class="size-3 shrink-0" /><span class="truncate">{{ projectSpace.name }}</span>
              </Badge>
            </template>
            <DropdownItem v-for="p in moveTargets" :key="p.id" @select="move(p.id)">
              <Folder class="size-4" />{{ t('notebooks.moveTo', { name: p.name }) }}
            </DropdownItem>
            <DropdownItem @select="move(null)">
              <FolderMinus class="size-4" />{{ t('notebooks.moveToGlobal') }}
            </DropdownItem>
          </DropdownMenu>
          <!-- Отметка связи: у карточки есть подзадачи. -->
          <Badge
            v-if="childCount > 0"
            variant="outline"
            class="h-4 gap-1 px-1 py-0 text-[10px]"
            :title="t('notebooks.children')"
          >
            <GitBranch class="size-3 shrink-0" />{{ childCount }}
          </Badge>
        </div>
        <h3 class="truncate font-semibold" :class="stateTextColor(nb.state)">{{ nb.name }}</h3>
        <Badge v-if="nb.archived" variant="secondary" class="mt-1">{{ t('notebooks.archive') }}</Badge>
      </div>

      <div class="flex items-center">
        <!-- Быстрое редактирование полей-гейтов без перехода в детальную (B9-a). -->
        <Button
          variant="ghost"
          size="icon"
          class="size-8 opacity-0 group-hover:opacity-100"
          :title="t('notebooks.quickEdit')"
          @click.stop="editOpen = true"
        >
          <Pencil class="size-4" />
        </Button>
        <DropdownMenu>
          <template #trigger>
            <Button variant="ghost" size="icon" class="size-8 opacity-0 group-hover:opacity-100" @click.stop>
              <MoreHorizontal class="size-4" />
            </Button>
          </template>
        <DropdownItem @select="toggleArchive">
          <ArchiveRestore v-if="nb.archived" class="size-4" />
          <Archive v-else class="size-4" />
          {{ nb.archived ? t('notebooks.unarchive') : t('notebooks.archive') }}
        </DropdownItem>
        <DropdownItem @select="toggleType">
          <ArrowLeftRight class="size-4" />
          {{ cell ? t('notebooks.toggleToTask') : t('notebooks.toggleToCell') }}
        </DropdownItem>
        <DropdownItem @select="toggleAdmin">
          <ShieldCheck class="size-4" />
          {{ nb.is_admin ? t('notebooks.unmakeAdmin') : t('notebooks.makeAdmin') }}
        </DropdownItem>
        <!-- Перенос между проектами / в глобальные «Ячейки». Для ячейки-проекта
             перенос доступен кликом по стикеру, поэтому в меню дублируем только
             когда стикера-проекта нет (глобальная ячейка или подзадача). -->
        <template v-if="parent || !projectSpace">
          <DropdownItem v-for="p in moveTargets" :key="p.id" @select="move(p.id)">
            <Folder class="size-4" />{{ t('notebooks.moveTo', { name: p.name }) }}
          </DropdownItem>
          <DropdownItem v-if="nb.space_id" @select="move(null)">
            <FolderMinus class="size-4" />{{ t('notebooks.moveToGlobal') }}
          </DropdownItem>
        </template>
          <DropdownItem class="text-destructive" @select="remove">
            <Trash2 class="size-4" />
            {{ t('common.delete') }}
          </DropdownItem>
        </DropdownMenu>
      </div>
    </div>

    <!-- Модалка быстрого редактирования; клик по её содержимому не должен всплывать в open(). -->
    <div @click.stop>
      <QuickEditDialog v-model:open="editOpen" :notebook="nb" />
    </div>

    <p class="mt-2 line-clamp-2 text-sm text-muted-foreground">
      {{ nb.description || t('notebooks.noDescription') }}
    </p>

    <div v-if="!cell && nb.deadline" class="mt-2 text-xs text-muted-foreground">
      {{ t('notebooks.deadline') }}: {{ nb.deadline }}
    </div>
    <div v-if="!cell && nb.assigned" class="text-xs text-muted-foreground">
      {{ t('notebooks.assigned') }}: {{ nb.assigned }}
    </div>

    <div v-if="progress.total > 0" class="mt-2 space-y-1">
      <div class="flex items-center justify-between text-xs text-muted-foreground">
        <span class="flex items-center gap-1"><ListChecks class="size-3" />{{ progress.completed }}/{{ progress.total }}</span>
        <span>{{ progress.pct }}%</span>
      </div>
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div class="h-full rounded-full transition-all" :class="stateColor(nb.state)" :style="{ width: progress.pct + '%' }" />
      </div>
    </div>

    <div class="mt-2 text-xs text-muted-foreground">
      {{ t('common.updated', { time: formatRelative(nb.updated, locale.current) }) }}
    </div>

    <div class="mt-3 flex items-center gap-1.5 border-t pt-3">
      <Badge variant="outline" class="gap-1"><FileText class="size-3" />{{ nb.source_count }}</Badge>
      <Badge variant="outline" class="gap-1"><StickyNote class="size-3" />{{ nb.note_count }}</Badge>
    </div>
  </Card>
</template>
