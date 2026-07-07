<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, ArrowLeftRight, CheckCircle2, Undo2, Plus, X } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Label from '@/components/ui/Label.vue'
import DatePicker from '@/components/ui/DatePicker.vue'
import type { Notebook, ChecklistItem, UpdateNotebookRequest } from '@/types/notebook'
import { stateColor, stateTextColor, isCell } from '@/lib/notebook'
import { useUpdateNotebook } from '@/composables/useNotebooks'

const props = defineProps<{ notebook: Notebook }>()
const { t } = useI18n()
const update = useUpdateNotebook()

const nb = computed(() => props.notebook)
const cell = computed(() => isCell(nb.value))
const stateLabel = computed(() => t(`states.state${nb.value.state}`))

// Локальные редактируемые поля, синхронизируются при смене ячейки.
const name = ref(nb.value.name)
const description = ref(nb.value.description)
const deadline = ref<string | null>(nb.value.deadline)
const assigned = ref(nb.value.assigned ?? '')
const planText = ref(nb.value.implementation_plan?.text ?? '')
const report = ref(nb.value.report ?? '')
const checklist = ref<ChecklistItem[]>(nb.value.checklist ? [...nb.value.checklist] : [])

watch(nb, (v) => {
  name.value = v.name
  description.value = v.description
  deadline.value = v.deadline
  assigned.value = v.assigned ?? ''
  planText.value = v.implementation_plan?.text ?? ''
  report.value = v.report ?? ''
  checklist.value = v.checklist ? [...v.checklist] : []
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
function savePlan() {
  if (planText.value !== (nb.value.implementation_plan?.text ?? '')) patch({ implementation_plan: { text: planText.value } })
}
function saveReport() {
  if (report.value !== (nb.value.report ?? '')) patch({ report: report.value })
}
function saveChecklist() {
  patch({ checklist: checklist.value })
}
function toggleItem(i: number) {
  checklist.value[i].isCompleted = !checklist.value[i].isCompleted
  saveChecklist()
}
function addItem() {
  checklist.value.push({ title: '', isCompleted: false })
}
function removeItem(i: number) {
  checklist.value.splice(i, 1)
  saveChecklist()
}
function toggleType() {
  patch({ notebook_type: cell.value ? 'task' : 'cell' })
}
function accept() {
  patch({ accepted: true })
}
function returnToReview() {
  patch({ accepted: false })
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
      <Button v-if="nb.notebook_type !== 'subtask'" variant="ghost" size="sm" class="ml-auto" @click="toggleType">
        <ArrowLeftRight class="size-4" />{{ cell ? t('notebooks.toggleToTask') : t('notebooks.toggleToCell') }}
      </Button>
    </div>

    <!-- Имя + описание -->
    <Input v-model="name" class="mb-2 text-lg font-semibold" @blur="saveName" @keyup.enter="saveName" />
    <Textarea v-model="description" :placeholder="t('notebooks.descPlaceholder')" :rows="2" @blur="saveDescription" />

    <!-- Поля задачи -->
    <div v-if="!cell" class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="space-y-1">
        <Label>{{ t('notebooks.deadline') }}</Label>
        <DatePicker v-model="deadline" class="w-full" @change="saveDeadline" />
      </div>
      <div class="space-y-1">
        <Label>{{ t('notebooks.assigned') }}</Label>
        <Input v-model="assigned" :placeholder="t('notebooks.assignedPlaceholder')" @blur="saveAssigned" />
      </div>
      <div class="space-y-1 md:col-span-2">
        <Label>{{ t('notebooks.implementationPlan') }}</Label>
        <Textarea v-model="planText" :placeholder="t('notebooks.planPlaceholder')" :rows="3" @blur="savePlan" />
      </div>
    </div>

    <!-- Чеклист -->
    <div class="mt-4 space-y-2">
      <Label>{{ t('notebooks.checklistTitle') }}</Label>
      <div v-for="(item, i) in checklist" :key="i" class="flex items-center gap-2">
        <button
          type="button"
          class="flex size-5 shrink-0 items-center justify-center rounded border"
          :class="item.isCompleted ? 'bg-primary text-primary-foreground' : ''"
          @click="toggleItem(i)"
        >
          <Check v-if="item.isCompleted" class="size-3.5" />
        </button>
        <Input v-model="item.title" class="flex-1" :class="item.isCompleted ? 'line-through opacity-60' : ''" @blur="saveChecklist" />
        <Button variant="ghost" size="icon" @click="removeItem(i)"><X class="size-4" /></Button>
      </div>
      <Button variant="outline" size="sm" @click="addItem"><Plus class="size-4" />{{ t('notebooks.addChecklistItem') }}</Button>
    </div>

    <!-- Отчёт о выполнении + гейт ревью (для задач/подзадач от состояния «В работе») -->
    <div v-if="!cell && nb.state >= 2" class="mt-4 space-y-2 border-t pt-4">
      <Label>{{ t('notebooks.report') }}</Label>
      <Textarea v-model="report" :placeholder="t('notebooks.reportPlaceholder')" :rows="3" @blur="saveReport" />
      <div class="flex justify-end">
        <Button v-if="nb.state === 3" @click="accept"><CheckCircle2 class="size-4" />{{ t('notebooks.accept') }}</Button>
        <Button v-else-if="nb.state === 4" variant="outline" @click="returnToReview">
          <Undo2 class="size-4" />{{ t('notebooks.returnToReview') }}
        </Button>
      </div>
    </div>
  </div>
</template>
