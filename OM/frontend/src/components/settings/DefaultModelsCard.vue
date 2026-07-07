<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/ui/Card.vue'
import Label from '@/components/ui/Label.vue'
import Button from '@/components/ui/Button.vue'
import { useAllModels, useDefaultModels, useUpdateDefaultModels } from '@/composables/useModels'
import type { DefaultModels } from '@/api/models'

const { t } = useI18n()
const { data: models } = useAllModels()
const { data: defaults } = useDefaultModels()
const update = useUpdateDefaultModels()

// Каждый дефолт → тип модели, из которого выбираем.
const fields: { key: keyof DefaultModels; type: string }[] = [
  { key: 'default_chat_model', type: 'language' },
  { key: 'default_transformation_model', type: 'language' },
  { key: 'large_context_model', type: 'language' },
  { key: 'default_tools_model', type: 'language' },
  { key: 'default_embedding_model', type: 'embedding' },
  { key: 'default_text_to_speech_model', type: 'text_to_speech' },
  { key: 'default_speech_to_text_model', type: 'speech_to_text' },
]

const form = ref<DefaultModels>({})
watch(defaults, (v) => { if (v) form.value = { ...v } }, { immediate: true })

function modelsOfType(type: string) {
  return (models.value ?? []).filter((m) => m.type === type)
}

const saved = ref(false)
async function save() {
  saved.value = false
  await update.mutateAsync(form.value)
  saved.value = true
}

const dirty = computed(() => JSON.stringify(form.value) !== JSON.stringify(defaults.value ?? {}))
</script>

<template>
  <Card class="space-y-4 p-5">
    <div>
      <h2 class="text-lg font-medium">{{ t('apiKeys.defaultModels') }}</h2>
      <p class="text-sm text-muted-foreground">{{ t('apiKeys.defaultModelsDesc') }}</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <div v-for="f in fields" :key="f.key" class="space-y-1">
        <Label>{{ t(`apiKeys.${f.key}`) }}</Label>
        <select v-model="form[f.key]" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
          <option :value="null">{{ t('common.none') }}</option>
          <option v-for="m in modelsOfType(f.type)" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>
    </div>

    <div class="flex items-center justify-end gap-3">
      <span v-if="saved && !dirty" class="text-sm text-emerald-600 dark:text-emerald-400">{{ t('common.saved') }}</span>
      <Button :disabled="!dirty || update.isPending.value" @click="save">
        {{ update.isPending.value ? t('common.saving') : t('common.save') }}
      </Button>
    </div>
  </Card>
</template>
