<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import ExpandableTextarea from '@/components/ui/ExpandableTextarea.vue'
import Label from '@/components/ui/Label.vue'
import { useCreateNotebook } from '@/composables/useNotebooks'

// parentId задан → создаём подзадачу (всегда поведение task), без выбора типа.
// spaceId задан → карточка создаётся внутри проекта (получает space_id).
const props = defineProps<{ parentId?: string; spaceId?: string }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const create = useCreateNotebook()

const isSubtask = computed(() => !!props.parentId)
const type = ref<'cell' | 'task'>('cell')
// Заголовок поля «Цель» зависит от типа (подзадача ведёт себя как задача).
const goalLabel = computed(() =>
  isSubtask.value || type.value === 'task'
    ? t('notebooks.checklistTitleTask')
    : t('notebooks.checklistTitleCell'),
)
const name = ref('')
const description = ref('')
const goal = ref('')

function reset() {
  type.value = 'cell'
  name.value = ''
  description.value = ''
  goal.value = ''
}

watch(open, (v) => {
  if (!v) reset()
})

async function submit() {
  if (!name.value.trim()) return
  await create.mutateAsync({
    name: name.value.trim(),
    description: description.value || '',
    notebook_type: isSubtask.value ? 'subtask' : type.value,
    parent_id: props.parentId,
    space_id: props.spaceId,
    goal: goal.value || '',
  })
  open.value = false
}
</script>

<template>
  <Dialog
    v-model:open="open"
    :title="isSubtask ? t('notebooks.addSubtask') : t('notebooks.createNew')"
    :description="t('notebooks.createNewDesc')"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <div v-if="!isSubtask" class="space-y-2">
        <Label>{{ t('common.type') }}</Label>
        <div class="flex gap-2">
          <Button type="button" :variant="type === 'cell' ? 'default' : 'outline'" class="h-auto flex-1 flex-col py-3" @click="type = 'cell'">
            <span class="font-medium">{{ t('notebooks.typeCell') }}</span>
            <span class="text-[10px] opacity-70">{{ t('notebooks.typeCellDesc') }}</span>
          </Button>
          <Button type="button" :variant="type === 'task' ? 'default' : 'outline'" class="h-auto flex-1 flex-col py-3" @click="type = 'task'">
            <span class="font-medium">{{ t('notebooks.typeTask') }}</span>
            <span class="text-[10px] opacity-70">{{ t('notebooks.typeTaskDesc') }}</span>
          </Button>
        </div>
      </div>

      <div class="space-y-2">
        <Label for="cell-name">{{ t('common.name') }} *</Label>
        <Input id="cell-name" v-model="name" :placeholder="t('notebooks.namePlaceholder')" />
      </div>

      <div class="space-y-2">
        <Label for="cell-desc">{{ t('common.description') }}</Label>
        <ExpandableTextarea id="cell-desc" v-model="description" :placeholder="t('notebooks.descPlaceholder')" :rows="3" :title="t('common.description')" />
      </div>

      <div class="space-y-2">
        <Label for="cell-goal">{{ goalLabel }}</Label>
        <ExpandableTextarea id="cell-goal" v-model="goal" :placeholder="t('notebooks.goalPlaceholder')" :rows="3" :title="goalLabel" />
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" @click="open = false">{{ t('common.cancel') }}</Button>
        <Button type="submit" :disabled="!name.trim() || create.isPending.value">
          {{ create.isPending.value ? t('common.creating') : t('notebooks.createNew') }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>
