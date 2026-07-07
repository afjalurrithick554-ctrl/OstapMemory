<script setup lang="ts">
// Доска пространства: карточки сгруппированы в 4 условные колонки по состоянию
// (Идея · Готово к работе · Можно проверять · Завершено). Колонки не обводятся —
// только позиционная группировка. «В работе» (state 2) здесь не показывается —
// эти задачи живут в сквозном правом сайдбаре.
// Внутри колонки — ручной вертикальный порядок мышью (DnD), сохраняется в sort_order.
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import NotebookCard from '@/components/notebooks/NotebookCard.vue'
import { useUpdateNotebook } from '@/composables/useNotebooks'
import type { Notebook } from '@/types/notebook'

const props = defineProps<{ notebooks: Notebook[] }>()
const { t } = useI18n()
const update = useUpdateNotebook()

// Колонки доски: state → подпись. «В работе» (2) намеренно отсутствует.
const COLUMNS: { state: number; labelKey: string }[] = [
  { state: 0, labelKey: 'states.state0' },
  { state: 1, labelKey: 'states.state1' },
  { state: 3, labelKey: 'states.state3' },
  { state: 4, labelKey: 'states.state4' },
]

// Локальные (оптимистичные) списки по колонкам, чтобы DnD давал мгновенный отклик.
const groups = ref<Record<number, Notebook[]>>({})

function rebuild() {
  const next: Record<number, Notebook[]> = {}
  for (const col of COLUMNS) {
    next[col.state] = props.notebooks
      .filter((n) => n.state === col.state)
      .sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          new Date(b.created).getTime() - new Date(a.created).getTime(),
      )
  }
  groups.value = next
}
watch(() => props.notebooks, rebuild, { immediate: true, deep: false })

// --- Вертикальный DnD внутри колонки ---
const dragId = ref<string | null>(null)
const dragState = ref<number | null>(null)

function onDragStart(n: Notebook) {
  dragId.value = n.id
  dragState.value = n.state
}
function onDragEnd() {
  dragId.value = null
  dragState.value = null
}

// Вставить перетаскиваемую карточку перед целевой (в пределах одной колонки).
function onDropBefore(state: number, targetId: string) {
  reorder(state, targetId)
}
// Сброс в конец колонки (пустая область).
function onDropEnd(state: number) {
  reorder(state, null)
}

function reorder(state: number, beforeId: string | null) {
  if (dragId.value == null || dragState.value !== state) return // только внутри своей колонки
  const list = [...(groups.value[state] ?? [])]
  const from = list.findIndex((n) => n.id === dragId.value)
  if (from === -1) return
  const [moved] = list.splice(from, 1)
  const insertAt = beforeId ? list.findIndex((n) => n.id === beforeId) : list.length
  list.splice(insertAt === -1 ? list.length : insertAt, 0, moved)
  groups.value = { ...groups.value, [state]: list }
  persist(state, list)
}

// Сохраняем новый порядок: каждой карточке колонки — индекс в sort_order.
function persist(_state: number, list: Notebook[]) {
  list.forEach((n, i) => {
    if ((n.sort_order ?? 0) !== i) {
      update.mutate({ id: n.id, body: { sort_order: i } })
    }
  })
}
</script>

<template>
  <div class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
    <div
      v-for="col in COLUMNS"
      :key="col.state"
      class="flex flex-col gap-3"
      @dragover.prevent
      @drop.prevent="onDropEnd(col.state)"
    >
      <!-- Подпись колонки: без рамок/фона, только ориентир. -->
      <p class="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {{ t(col.labelKey) }}
        <span class="ml-1 opacity-60">{{ (groups[col.state] ?? []).length }}</span>
      </p>

      <div
        v-for="n in groups[col.state] ?? []"
        :key="n.id"
        draggable="true"
        class="cursor-grab active:cursor-grabbing"
        :class="dragId === n.id ? 'opacity-50' : ''"
        @dragstart="onDragStart(n)"
        @dragend="onDragEnd"
        @dragover.prevent
        @drop.prevent.stop="onDropBefore(col.state, n.id)"
      >
        <NotebookCard :notebook="n" />
      </div>

      <p
        v-if="(groups[col.state] ?? []).length === 0"
        class="rounded-md border border-dashed px-2 py-6 text-center text-xs text-muted-foreground/60"
      >
        —
      </p>
    </div>
  </div>
</template>
