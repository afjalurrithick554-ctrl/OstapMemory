<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  MoreHorizontal, Archive, ArchiveRestore, Trash2, FileText, StickyNote, ListChecks, ArrowLeftRight,
} from 'lucide-vue-next'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import DropdownItem from '@/components/ui/DropdownItem.vue'
import type { Notebook } from '@/types/notebook'
import { stateColor, stateTextColor, stateRing, checklistProgress, isCell, formatRelative } from '@/lib/notebook'
import { useUpdateNotebook, useDeleteNotebook } from '@/composables/useNotebooks'
import { useLocaleStore } from '@/stores/locale'

const props = defineProps<{ notebook: Notebook }>()
const { t } = useI18n()
const router = useRouter()
const locale = useLocaleStore()
const update = useUpdateNotebook()
const del = useDeleteNotebook()

const nb = computed(() => props.notebook)
const cell = computed(() => isCell(nb.value))
const stateLabel = computed(() => t(`states.state${nb.value.state}`))
const progress = computed(() => checklistProgress(nb.value))

function open() {
  router.push(`/notebooks/${encodeURIComponent(nb.value.id)}`)
}
function toggleArchive() {
  update.mutate({ id: nb.value.id, body: { archived: !nb.value.archived } })
}
function toggleType() {
  update.mutate({ id: nb.value.id, body: { notebook_type: cell.value ? 'task' : 'cell' } })
}
function remove() {
  if (confirm(t('notebooks.deleteConfirm', { name: nb.value.name }))) {
    del.mutate({ id: nb.value.id })
  }
}
</script>

<template>
  <Card
    class="group cursor-pointer p-4 ring-1 ring-inset transition-shadow hover:shadow-md"
    :class="stateRing(nb.state)"
    @click="open"
  >
    <div class="flex items-start justify-between">
      <div class="min-w-0 flex-1">
        <div class="mb-1 flex items-center gap-2">
          <span class="size-2 rounded-full" :class="stateColor(nb.state)" />
          <span class="text-xs" :class="stateTextColor(nb.state)">{{ stateLabel }}</span>
          <Badge variant="outline" class="h-4 px-1 py-0 text-[10px]">
            {{ cell ? t('notebooks.typeCell') : (nb.notebook_type === 'subtask' ? t('notebooks.typeSubtask') : t('notebooks.typeTask')) }}
          </Badge>
        </div>
        <h3 class="truncate font-semibold" :class="stateTextColor(nb.state)">{{ nb.name }}</h3>
        <Badge v-if="nb.archived" variant="secondary" class="mt-1">{{ t('notebooks.archive') }}</Badge>
      </div>

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
        <DropdownItem class="text-destructive" @select="remove">
          <Trash2 class="size-4" />
          {{ t('common.delete') }}
        </DropdownItem>
      </DropdownMenu>
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
