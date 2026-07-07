<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from '@/components/ui/Dialog.vue'
import Input from '@/components/ui/Input.vue'
import ExpandableTextarea from '@/components/ui/ExpandableTextarea.vue'
import Label from '@/components/ui/Label.vue'
import Button from '@/components/ui/Button.vue'
import { useCreateTransformation, useUpdateTransformation } from '@/composables/useTransformations'
import type { Transformation } from '@/types/transformation'

const props = defineProps<{ transformation?: Transformation | null }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const create = useCreateTransformation()
const update = useUpdateTransformation()

const name = ref('')
const title = ref('')
const description = ref('')
const prompt = ref('')
const applyDefault = ref(false)
const error = ref('')

// При открытии заполняем поля из редактируемой трансформации (или очищаем).
watch(open, (v) => {
  if (!v) return
  const s = props.transformation
  name.value = s?.name ?? ''
  title.value = s?.title ?? ''
  description.value = s?.description ?? ''
  prompt.value = s?.prompt ?? ''
  applyDefault.value = s?.apply_default ?? false
  error.value = ''
})

const isEditing = () => !!props.transformation
const saving = () => create.isPending.value || update.isPending.value

async function submit() {
  if (!name.value.trim() || !prompt.value.trim()) {
    error.value = t('transformations.requiredFields')
    return
  }
  error.value = ''
  try {
    if (props.transformation) {
      await update.mutateAsync({
        id: props.transformation.id,
        body: {
          name: name.value,
          title: title.value || name.value,
          description: description.value,
          prompt: prompt.value,
          apply_default: applyDefault.value,
        },
      })
    } else {
      await create.mutateAsync({
        name: name.value,
        title: title.value || name.value,
        description: description.value,
        prompt: prompt.value,
        apply_default: applyDefault.value,
      })
    }
    open.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}
</script>

<template>
  <Dialog
    v-model:open="open"
    :title="isEditing() ? t('common.edit') : t('transformations.createNew')"
    :description="t('transformations.editorDesc')"
  >
    <div class="space-y-4">
      <div class="space-y-1">
        <Label>{{ t('transformations.name') }}</Label>
        <Input v-model="name" :placeholder="t('transformations.namePlaceholder')" />
      </div>

      <div class="flex items-end gap-3">
        <div class="flex-1 space-y-1">
          <Label>{{ t('common.title') }}</Label>
          <Input v-model="title" :placeholder="t('transformations.titlePlaceholder')" />
        </div>
        <label class="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" v-model="applyDefault" />{{ t('transformations.suggestDefault') }}
        </label>
      </div>

      <div class="space-y-1">
        <Label>{{ t('common.description') }}</Label>
        <ExpandableTextarea v-model="description" :rows="2" :placeholder="t('transformations.descriptionPlaceholder')" :title="t('common.description')" />
      </div>

      <div class="space-y-1">
        <Label>{{ t('transformations.systemPrompt') }}</Label>
        <ExpandableTextarea v-model="prompt" :rows="8" input-class="font-mono" :placeholder="t('transformations.promptPlaceholder')" :title="t('transformations.systemPrompt')" />
        <p class="text-xs text-muted-foreground">{{ t('transformations.promptHint') }}</p>
      </div>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="open = false">{{ t('common.cancel') }}</Button>
        <Button :disabled="saving()" @click="submit">
          {{ saving() ? t('common.saving') : (isEditing() ? t('common.save') : t('common.create')) }}
        </Button>
      </div>
    </div>
  </Dialog>
</template>
