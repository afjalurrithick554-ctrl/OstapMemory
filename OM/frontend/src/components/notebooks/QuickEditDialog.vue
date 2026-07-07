<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Dialog from '@/components/ui/Dialog.vue'
import NotebookHeader from '@/components/notebooks/NotebookHeader.vue'
import type { Notebook } from '@/types/notebook'
import { isCell } from '@/lib/notebook'

// Быстрое редактирование полей-гейтов прямо с карточки, без перехода на
// детальную страницу (B9-a). Переиспользует NotebookHeader — там уже вся
// логика сохранения (дедлайн/исполнитель/описание/план/отчёт + гейты).
// Пройденные поля остаются редактируемыми: состояние — производная, при
// очистке поля-условия карточка каскадно откатывается назад.
defineProps<{ notebook: Notebook }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
</script>

<template>
  <Dialog
    v-model:open="open"
    :title="isCell(notebook) ? notebook.name : t('notebooks.quickEditTitle')"
    content-class="max-w-2xl max-h-[85vh] overflow-y-auto"
  >
    <NotebookHeader :notebook="notebook" />
  </Dialog>
</template>
