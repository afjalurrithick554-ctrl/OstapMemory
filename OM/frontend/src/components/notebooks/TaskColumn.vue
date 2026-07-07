<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { PanelRightClose, PanelRightOpen, CalendarClock, Clock, ListTodo, CornerLeftUp } from 'lucide-vue-next'
import Tooltip from '@/components/ui/Tooltip.vue'
import { useNotebooks } from '@/composables/useNotebooks'
import { stateColor, stateTextColor, isArchived } from '@/lib/notebook'
import { useTaskColumnStore } from '@/stores/taskColumn'
import type { Notebook } from '@/types/notebook'

const { t } = useI18n()
const router = useRouter()
const col = useTaskColumnStore()
const { data } = useNotebooks()

// Сквозная колонка «В работе»: задачи И подзадачи в состоянии 2 (В работе) по всем
// пространствам — как отдельные сущности. Ячейки и архив исключены; подзадачи помечены
// связью с родителем.
const parentName = (id: string | null) =>
  id ? (data.value ?? []).find((n) => n.id === id)?.name ?? null : null
const tasks = computed<Notebook[]>(() => {
  const list = (data.value ?? []).filter(
    (n) => n.notebook_type !== 'cell' && n.state === 2 && !isArchived(n),
  )
  if (col.sort === 'deadline') {
    // По дедлайну (ближайшие сверху); без дедлайна — в конец.
    return [...list].sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return a.deadline.localeCompare(b.deadline)
    })
  }
  // По добавлению (новые сверху).
  return [...list].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
})

function openTask(id: string) {
  router.push(`/notebooks/${encodeURIComponent(id)}`)
}
</script>

<template>
  <aside
    class="flex h-full flex-col border-l bg-sidebar text-sidebar-foreground transition-all duration-200"
    :class="col.collapsed ? 'w-12' : 'w-72'"
  >
    <!-- Шапка: заголовок + свёртка -->
    <div class="flex h-12 shrink-0 items-center gap-2 border-b px-2">
      <template v-if="!col.collapsed">
        <ListTodo class="size-4 shrink-0 text-muted-foreground" />
        <span class="text-sm font-medium">{{ t('taskColumn.title') }}</span>
        <span class="text-xs text-muted-foreground">({{ tasks.length }})</span>
        <!-- Фильтр: по добавлению / по дедлайну -->
        <div class="ml-auto flex items-center gap-0.5">
          <Tooltip :label="t('taskColumn.sortByAdded')">
            <button
              class="rounded p-1.5 hover:bg-sidebar-accent"
              :class="col.sort === 'added' ? 'text-primary' : 'text-muted-foreground'"
              @click="col.sort = 'added'"
            >
              <Clock class="size-4" />
            </button>
          </Tooltip>
          <Tooltip :label="t('taskColumn.sortByDeadline')">
            <button
              class="rounded p-1.5 hover:bg-sidebar-accent"
              :class="col.sort === 'deadline' ? 'text-primary' : 'text-muted-foreground'"
              @click="col.sort = 'deadline'"
            >
              <CalendarClock class="size-4" />
            </button>
          </Tooltip>
        </div>
      </template>
      <Tooltip :label="col.collapsed ? t('taskColumn.expand') : t('taskColumn.collapse')" :disabled="!col.collapsed">
        <button
          class="rounded-md p-1.5 hover:bg-sidebar-accent"
          :class="col.collapsed ? '' : 'ml-1'"
          :aria-label="col.collapsed ? t('taskColumn.expand') : t('taskColumn.collapse')"
          @click="col.toggle()"
        >
          <PanelRightOpen v-if="col.collapsed" class="size-4" />
          <PanelRightClose v-else class="size-4" />
        </button>
      </Tooltip>
    </div>

    <!-- Список миникарт (скрыт в свёрнутом виде) -->
    <div v-if="!col.collapsed" class="flex-1 space-y-1.5 overflow-y-auto p-2">
      <button
        v-for="task in tasks"
        :key="task.id"
        class="flex w-full flex-col gap-1 rounded-md border border-l-4 bg-card p-2 text-left text-card-foreground transition-shadow hover:shadow-sm"
        :class="stateColor(task.state).replace('bg-', 'border-l-')"
        @click="openTask(task.id)"
      >
        <div class="flex items-center gap-1.5">
          <span class="size-1.5 shrink-0 rounded-full" :class="stateColor(task.state)" />
          <span class="truncate text-sm font-medium">{{ task.name }}</span>
        </div>
        <!-- Подзадача: связь с родителем. -->
        <div
          v-if="task.parent_id"
          class="flex items-center gap-1 truncate text-[11px] text-muted-foreground"
          :title="t('notebooks.parentLabel', { name: parentName(task.parent_id) ?? '' })"
        >
          <CornerLeftUp class="size-3 shrink-0" />
          <span class="truncate">{{ parentName(task.parent_id) }}</span>
        </div>
        <div class="flex items-center justify-between text-[11px]">
          <span :class="stateTextColor(task.state)">{{ t(`states.state${task.state}`) }}</span>
          <span v-if="task.deadline" class="flex items-center gap-1 text-muted-foreground">
            <CalendarClock class="size-3" />{{ task.deadline }}
          </span>
        </div>
      </button>

      <p v-if="!tasks.length" class="px-1 py-4 text-center text-xs text-muted-foreground">
        {{ t('taskColumn.empty') }}
      </p>
    </div>
  </aside>
</template>
