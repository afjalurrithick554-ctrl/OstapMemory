<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQueryClient } from '@tanstack/vue-query'
import { ArrowLeftRight, CheckCircle2, Undo2, CornerLeftUp, Paperclip, Download, X, ShieldCheck, ShieldOff, Plus } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import ExpandableTextarea from '@/components/ui/ExpandableTextarea.vue'
import Label from '@/components/ui/Label.vue'
import DatePicker from '@/components/ui/DatePicker.vue'
import ReviewNotesDialog from '@/components/notebooks/ReviewNotesDialog.vue'
import type { Notebook, GoalFile, ReviewNotes, UpdateNotebookRequest } from '@/types/notebook'
import { stateColor, stateTextColor, isCell, legacyGoalText } from '@/lib/notebook'
import { useUpdateNotebook, useNotebook, useNotebookChildren, notebookKeys } from '@/composables/useNotebooks'
import { uploadGoalFile, deleteGoalFile, goalFileUrl, reviewFileUrl } from '@/api/notebooks'

const props = defineProps<{ notebook: Notebook }>()
const { t } = useI18n()
const router = useRouter()
const update = useUpdateNotebook()
const qc = useQueryClient()

// Исполнитель: Боба, Агент, либо «Без исполнителя» (пустое значение).
// Без исполнителя — легитимный выбор: снимает assigned и опускает задачу в «Идея».
const NO_ASSIGNEE = ''
const ASSIGNEES = ['Боба', 'Агент'] as const
// Варианты списка: «Без исполнителя» + базовые + текущее значение, если оно
// нестандартное (легаси-данные). Каждый вариант — {value, label}.
const assigneeOptions = computed(() => {
  const cur = nb.value.assigned
  const base = [
    { value: NO_ASSIGNEE, label: t('notebooks.noAssignee') },
    ...ASSIGNEES.map((a) => ({ value: a, label: a })),
  ]
  return cur && !ASSIGNEES.includes(cur as (typeof ASSIGNEES)[number])
    ? [{ value: cur, label: cur }, ...base]
    : base
})

const nb = computed(() => props.notebook)
const cell = computed(() => isCell(nb.value))

// Имя родителя для подзадачи: подтягиваем родителя, чтобы показать ссылку в шапке.
const parentId = computed(() => nb.value.parent_id ?? '')
const { data: parent } = useNotebook(parentId)
function openParent() {
  if (nb.value.parent_id) router.push(`/notebooks/${encodeURIComponent(nb.value.parent_id)}`)
}
// Ячейка в state 0 — «Новая ячейка»; задача — по состоянию.
const stateLabel = computed(() =>
  cell.value ? t('states.cell') : t(`states.state${nb.value.state}`),
)
const planFinalized = computed(() => !!nb.value.implementation_plan?.finalized)

// Гейт «Завершено» (3→4): нельзя принять, пока не закрыты все подзадачи и
// дополнительные (не-isDefault) чек-листы. Дефолтный чек-лист — контейнер цели,
// завершение не блокирует. Блокируем кнопку «Принять» с подсказкой, иначе клик
// молча ни к чему не приводит (бэкенд держит state на 3).
const { data: children } = useNotebookChildren(computed(() => nb.value.id))
const acceptBlocked = computed(() => {
  if ((children.value ?? []).some((k) => k.state !== 4)) return true
  for (const c of nb.value.checklist ?? []) {
    // Дефолтный (isDefault) чек-лист — контейнер цели, завершение не блокирует.
    if (c?.isDefault) continue
    if ((c.items ?? []).some((it) => (it.title || '').trim() && !it.isCompleted)) {
      return true
    }
  }
  return false
})
// Гейт «Готово» (2→3) по подзадачам: кнопка недоступна, пока не ВСЕ подзадачи в
// «Можно проверять» (3) или «Завершено» (4). Без подзадач — обычный гейт (не блокируем).
// Отступление от независимости эпик↔подзадачи согласовано с пользователем; это только
// блокировка кнопки, без авто-перемещения родителя (по образцу acceptBlocked).
const doneBlockedByChildren = computed(() =>
  (children.value ?? []).some((k) => k.state !== 3 && k.state !== 4),
)
// Заголовок поля «Цель» зависит от типа: «Цель ячейки» / «Цель задачи».
const goalTitle = computed(() =>
  cell.value ? t('notebooks.checklistTitleCell') : t('notebooks.checklistTitleTask'),
)

// Локальные редактируемые поля, синхронизируются при смене ячейки.
const name = ref(nb.value.name)
const description = ref(nb.value.description)
const deadline = ref<string | null>(nb.value.deadline)
const assigned = ref(nb.value.assigned || NO_ASSIGNEE)
const planText = ref(nb.value.implementation_plan?.text ?? '')
// Отчёт — append-журнал: список записей только для чтения + поле ввода новой.
const reportEntries = computed(() => nb.value.report ?? [])
const newReport = ref('')
// Цель: goal-поле, а если пусто — префилл из легаси-дефолтного чек-листа (миграция в UI).
const goal = ref(nb.value.goal || legacyGoalText(nb.value))
const goalFile = computed<GoalFile | null>(() => nb.value.goal_file ?? null)

watch(nb, (v) => {
  name.value = v.name
  description.value = v.description
  deadline.value = v.deadline
  assigned.value = v.assigned || NO_ASSIGNEE
  planText.value = v.implementation_plan?.text ?? ''
  newReport.value = ''
  goal.value = v.goal || legacyGoalText(v)
  // «Без исполнителя» — валидное состояние (задача в «Идея»). Автоподстановку
  // «Боба» убрали: пустой assigned больше не форсим, иначе выбор снять нельзя.
})

function patch(body: UpdateNotebookRequest) {
  update.mutate({ id: nb.value.id, body })
}

function saveName() {
  if (name.value.trim() && name.value !== nb.value.name) patch({ name: name.value.trim() })
}
function saveDescription() {
  if (description.value !== nb.value.description) patch({ description: description.value })
}
function saveDeadline() {
  patch({ deadline: deadline.value ?? '' })
}
function saveAssigned() {
  if (assigned.value !== (nb.value.assigned ?? '')) patch({ assigned: assigned.value })
}
function saveGoal() {
  if (goal.value !== (nb.value.goal ?? '')) patch({ goal: goal.value })
}
function savePlan() {
  // Сохраняем текст, не теряя признак финализации.
  if (planText.value !== (nb.value.implementation_plan?.text ?? '')) {
    patch({ implementation_plan: { text: planText.value, finalized: planFinalized.value } })
  }
}
// «План готов»: финализирует план (гейт 1→2, вместе с дедлайном).
function finalizePlan() {
  patch({ implementation_plan: { text: planText.value, finalized: true } })
}
function unfinalizePlan() {
  patch({ implementation_plan: { text: planText.value, finalized: false } })
}
// Тумблер «Готово» (гейт 2→3) и возврат в работу.
function markDone() {
  patch({ done: true })
}
// Возврат 3→2 требует «Внесённые замечания»: открываем диалог, снятие done —
// только после ввода замечаний (гейт).
const reviewOpen = ref(false)
function returnToWork() {
  reviewOpen.value = true
}
function onReviewSubmit(notes: ReviewNotes) {
  patch({ review_notes: notes, done: false })
}
// Дописать запись в журнал отчёта. Автор — исполнитель карточки (пусто, если без
// исполнителя); `at` проставляет бэкенд. Журнал append-only: правок/удаления нет.
function addReportEntry() {
  const text = newReport.value.trim()
  if (!text) return
  patch({ report_entry: { author: assigned.value || null, text } })
  newReport.value = ''
}
// Дата записи журнала отчёта: ISO → локальная строка (ru).
function formatReportAt(at: string): string {
  const d = new Date(at)
  return Number.isNaN(d.getTime())
    ? at
    : d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
}
function toggleType() {
  patch({ notebook_type: cell.value ? 'task' : 'cell' })
}
// Включение/выключение админки. Снятие возвращает ячейку/задачу в общие места
// (Ячейки, доска проекта) с сохранением привязки к пространству (space_id не трогаем).
function toggleAdmin() {
  patch({ is_admin: !nb.value.is_admin })
}
function accept() {
  patch({ accepted: true })
}
function returnToReview() {
  patch({ accepted: false })
}

// --- Файл «Цели» ---
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
async function refreshNotebook() {
  await qc.invalidateQueries({ queryKey: notebookKeys.detail(nb.value.id) })
  await qc.invalidateQueries({ queryKey: notebookKeys.list() })
}
async function onGoalFilePick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    await uploadGoalFile(nb.value.id, file)
    await refreshNotebook()
  } finally {
    uploading.value = false
    input.value = ''
  }
}
async function removeGoalFile() {
  await deleteGoalFile(nb.value.id)
  await refreshNotebook()
}
</script>

<template>
  <div class="rounded-lg border p-4 ring-1 ring-inset" :class="stateColor(nb.state).replace('bg-', 'ring-') + '/40'">
    <!-- Строка состояния + тип -->
    <div class="mb-3 flex items-center gap-2">
      <span class="size-2.5 rounded-full" :class="stateColor(nb.state)" />
      <span class="text-sm font-medium" :class="stateTextColor(nb.state)">{{ stateLabel }}</span>
      <Badge variant="outline">
        {{ cell ? t('notebooks.typeCell') : (nb.notebook_type === 'subtask' ? t('notebooks.typeSubtask') : t('notebooks.typeTask')) }}
      </Badge>
      <!-- Правая группа: ссылка на родителя (для подзадачи), переключатель админки
           (для любой ячейки/задачи) и смена типа (кроме подзадачи). -->
      <div class="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
        <button
          v-if="nb.notebook_type === 'subtask' && parent"
          type="button"
          class="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground transition-colors hover:text-foreground"
          :title="t('notebooks.parentLabel', { name: parent.name })"
          @click="openParent"
        >
          <CornerLeftUp class="size-3.5 shrink-0" />
          <span class="truncate">{{ parent.name }}</span>
        </button>
        <Button variant="ghost" size="sm" @click="toggleAdmin">
          <ShieldOff v-if="nb.is_admin" class="size-4" />
          <ShieldCheck v-else class="size-4" />
          {{ nb.is_admin ? t('notebooks.unmakeAdmin') : t('notebooks.makeAdmin') }}
        </Button>
        <Button v-if="nb.notebook_type !== 'subtask'" variant="ghost" size="sm" @click="toggleType">
          <ArrowLeftRight class="size-4" />{{ cell ? t('notebooks.toggleToTask') : t('notebooks.toggleToCell') }}
        </Button>
      </div>
    </div>

    <!-- Имя + описание -->
    <Input v-model="name" class="mb-2 text-lg font-semibold" @blur="saveName" @keyup.enter="saveName" />
    <ExpandableTextarea
      v-model="description"
      :placeholder="t('notebooks.descPlaceholder')"
      :rows="2"
      :title="t('common.description')"
      @save="saveDescription"
    />

    <!-- Поля задачи -->
    <div v-if="!cell" class="mt-4 space-y-4">
      <!-- Исполнитель (для задач всегда): по умолчанию Боба, либо Агент. -->
      <div class="space-y-1 md:max-w-xs">
        <Label>{{ t('notebooks.assigned') }}</Label>
        <select
          v-model="assigned"
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @change="saveAssigned"
        >
          <option v-for="a in assigneeOptions" :key="a.value" :value="a.value">{{ a.label }}</option>
        </select>
      </div>

      <!-- Дедлайн + план реализации: появляются с «Готово к работе» (state ≥ 1);
           в состоянии «Идея» не показываются. Оба нужны для перехода в «В работе». -->
      <template v-if="nb.state >= 1">
        <div class="space-y-1 md:max-w-xs">
          <Label>{{ t('notebooks.deadline') }}</Label>
          <DatePicker v-model="deadline" class="w-full" @change="saveDeadline" />
        </div>
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <Label>{{ t('notebooks.implementationPlan') }}</Label>
            <!-- Гейт 1→2: план финализируется кнопкой «План готов». -->
            <Button
              v-if="!planFinalized"
              size="sm"
              :disabled="!planText.trim()"
              @click="finalizePlan"
            >
              <CheckCircle2 class="size-4" />{{ t('notebooks.planReady') }}
            </Button>
            <Button v-else size="sm" variant="outline" @click="unfinalizePlan">
              <Undo2 class="size-4" />{{ t('notebooks.planUnfinalize') }}
            </Button>
          </div>
          <ExpandableTextarea
            v-model="planText"
            :placeholder="t('notebooks.planPlaceholder')"
            :rows="3"
            :title="t('notebooks.implementationPlan')"
            @save="savePlan"
          />
        </div>
      </template>
    </div>

    <!-- Цель ячейки/задачи: простое поле (текст + файл), заменяет обязательный чек-лист. -->
    <div class="mt-4 space-y-2">
      <Label>{{ goalTitle }}</Label>
      <ExpandableTextarea
        v-model="goal"
        :placeholder="t('notebooks.goalPlaceholder')"
        :rows="3"
        :title="goalTitle"
        @save="saveGoal"
      />
      <div class="flex flex-wrap items-center gap-2">
        <input ref="fileInput" type="file" class="hidden" @change="onGoalFilePick" />
        <Button type="button" variant="outline" size="sm" :disabled="uploading" @click="fileInput?.click()">
          <Paperclip class="size-4" />{{ uploading ? t('common.loading') : t('notebooks.goalAttach') }}
        </Button>
        <template v-if="goalFile">
          <a
            :href="goalFileUrl(nb.id)"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-1 truncate text-sm text-primary hover:underline"
          >
            <Download class="size-3.5 shrink-0" />
            <span class="truncate">{{ goalFile.name }}</span>
          </a>
          <Button type="button" variant="ghost" size="icon" class="size-7" :title="t('common.delete')" @click="removeGoalFile">
            <X class="size-4" />
          </Button>
        </template>
      </div>
    </div>

    <!-- Отчёт о выполнении + гейт ревью (для задач/подзадач от состояния «В работе») -->
    <div v-if="!cell && nb.state >= 2" class="mt-4 space-y-2 border-t pt-4">
      <Label>{{ t('notebooks.report') }}</Label>
      <!-- Журнал отчёта (append-only): записи в хронологическом порядке, только чтение. -->
      <ul v-if="reportEntries.length" class="space-y-2">
        <li
          v-for="(entry, i) in reportEntries"
          :key="i"
          class="rounded-md border bg-muted/40 px-3 py-2 text-sm"
        >
          <div class="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span v-if="entry.author" class="font-medium">{{ entry.author }}</span>
            <span>{{ formatReportAt(entry.at) }}</span>
          </div>
          <div class="whitespace-pre-wrap">{{ entry.text }}</div>
        </li>
      </ul>
      <!-- Ввод новой записи журнала. -->
      <ExpandableTextarea
        v-model="newReport"
        :placeholder="t('notebooks.reportPlaceholder')"
        :rows="3"
        :title="t('notebooks.report')"
        @save="addReportEntry"
      />
      <div class="flex flex-wrap justify-end gap-2">
        <Button
          v-if="newReport.trim()"
          type="button"
          variant="outline"
          @click="addReportEntry"
        >
          <Plus class="size-4" />{{ t('notebooks.reportAdd') }}
        </Button>
        <!-- Гейт 2→3: тумблер «Готово». Требует хотя бы одну запись отчёта.
             Блокируется, пока не все подзадачи в «Можно проверять»/«Завершено». -->
        <Button
          v-if="nb.state === 2"
          :disabled="!reportEntries.length || doneBlockedByChildren"
          :title="doneBlockedByChildren ? t('notebooks.markDoneBlocked') : ''"
          @click="markDone"
        >
          <CheckCircle2 class="size-4" />{{ t('notebooks.markDone') }}
        </Button>
        <!-- Состояние «Можно проверять»: вернуть в работу или принять (гейт 3→4). -->
        <template v-else-if="nb.state === 3">
          <Button variant="outline" @click="returnToWork">
            <Undo2 class="size-4" />{{ t('notebooks.returnToWork') }}
          </Button>
          <Button
            :disabled="acceptBlocked"
            :title="acceptBlocked ? t('notebooks.acceptBlocked') : ''"
            @click="accept"
          >
            <CheckCircle2 class="size-4" />{{ t('notebooks.accept') }}
          </Button>
        </template>
        <!-- Завершено: вернуть на проверку. -->
        <Button v-else-if="nb.state === 4" variant="outline" @click="returnToReview">
          <Undo2 class="size-4" />{{ t('notebooks.returnToReview') }}
        </Button>
      </div>
    </div>

    <!-- «Внесённые замечания» — показываем исполнителю, когда они заполнены
         (после возврата задачи из «Можно проверять» в «В работе»). -->
    <div v-if="!cell && nb.review_notes?.text" class="mt-4 space-y-2 rounded-md border border-amber-400/40 bg-amber-50/50 p-3 dark:bg-amber-950/20">
      <Label class="text-amber-700 dark:text-amber-400">{{ t('notebooks.reviewNotesTitle') }}</Label>
      <p class="whitespace-pre-wrap text-sm">{{ nb.review_notes.text }}</p>
      <a
        v-if="nb.review_notes.url"
        :href="nb.review_notes.url"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-1 truncate text-sm text-primary hover:underline"
      >
        <Paperclip class="size-3.5 shrink-0" /><span class="truncate">{{ nb.review_notes.url }}</span>
      </a>
      <a
        v-if="nb.review_notes.file"
        :href="reviewFileUrl(nb.id)"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-1 truncate text-sm text-primary hover:underline"
      >
        <Download class="size-3.5 shrink-0" /><span class="truncate">{{ nb.review_notes.file.name }}</span>
      </a>
    </div>

    <ReviewNotesDialog v-model:open="reviewOpen" :notebook-id="nb.id" @submit="onReviewSubmit" />
  </div>
</template>
