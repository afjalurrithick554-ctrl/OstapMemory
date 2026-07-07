<script setup lang="ts">
// Поле-текст без встроенного редактора: по умолчанию показывает текст (или
// плейсхолдер), по клику открывается модалка-редактор (Markdown, Правка/Просмотр).
// Отдельной кнопки «развернуть» нет — редактор открывается кликом по полю.
// Сохранение — по кнопке в модалке, наружу единый эмит 'save'.
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pencil, Eye } from 'lucide-vue-next'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import { renderMarkdown } from '@/lib/markdown'

const props = withDefaults(
  defineProps<{
    placeholder?: string
    rows?: number
    disabled?: boolean
    title?: string
    id?: string
    inputClass?: string
  }>(),
  { rows: 3 },
)
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ save: [] }>()
const { t } = useI18n()

const open = ref(false)
const draft = ref('')
const preview = ref(false)

// Минимальная высота поля примерно соответствует числу строк.
const minHeight = computed(() => `${Math.max(props.rows, 2) * 1.5 + 1}rem`)

// При открытии модалки берём актуальное значение в черновик.
watch(open, (v) => {
  if (v) {
    draft.value = model.value ?? ''
    preview.value = false
  }
})

function openEditor() {
  if (!props.disabled) open.value = true
}

const rendered = computed(() => renderMarkdown(draft.value))

function saveModal() {
  if (draft.value !== (model.value ?? '')) {
    model.value = draft.value
    emit('save')
  }
  open.value = false
}
</script>

<template>
  <div>
    <!-- Кликабельное поле-текст (без встроенного редактора) -->
    <div
      :id="id"
      role="button"
      tabindex="0"
      :style="{ minHeight }"
      class="w-full cursor-text whitespace-pre-wrap rounded-md border border-input bg-background px-3 py-2 text-sm
        ring-offset-background transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :class="[inputClass, disabled ? 'cursor-not-allowed opacity-50' : '']"
      @click="openEditor"
      @keydown.enter.prevent="openEditor"
    >
      <span v-if="model">{{ model }}</span>
      <span v-else class="text-muted-foreground">{{ placeholder }}</span>
    </div>

    <Dialog
      v-model:open="open"
      :title="title || t('common.editor')"
      content-class="max-w-3xl"
    >
      <div class="space-y-2">
        <div class="flex items-center justify-end">
          <Button type="button" size="sm" variant="ghost" class="h-7 gap-1 px-2 text-xs" @click="preview = !preview">
            <component :is="preview ? Pencil : Eye" class="size-3.5" />
            {{ preview ? t('common.edit') : t('common.preview') }}
          </Button>
        </div>

        <textarea
          v-if="!preview" v-model="draft" rows="14"
          :placeholder="placeholder"
          class="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm
          ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div
          v-else
          class="md-body min-h-[20rem] max-w-none overflow-y-auto rounded-md border bg-muted/30 px-3 py-2"
          v-html="rendered || `<p class='text-muted-foreground'>${t('notes.previewEmpty')}</p>`"
        />
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" @click="open = false">{{ t('common.cancel') }}</Button>
        <Button type="button" @click="saveModal">{{ t('common.save') }}</Button>
      </div>
    </Dialog>
  </div>
</template>
