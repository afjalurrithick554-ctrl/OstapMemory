<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Cpu } from 'lucide-vue-next'
import { useLanguageModels, useDefaultModels } from '@/composables/useModels'

// Выбор модели для сессии. Пусто = модель чата по умолчанию.
const model = defineModel<string | null>({ default: null })
const { t } = useI18n()
const { data: models } = useLanguageModels()
const { data: defaults } = useDefaultModels()

const defaultName = computed(() => {
  const id = defaults.value?.default_chat_model
  return models.value?.find((m) => m.id === id)?.name
})
</script>

<template>
  <div class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
    <Cpu class="size-3.5 shrink-0" />
    <select
      :value="model ?? ''"
      class="min-w-0 max-w-[12rem] truncate rounded border bg-background px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      @change="model = ($event.target as HTMLSelectElement).value || null"
    >
      <option value="">
        {{ defaultName ? t('chat.defaultModel', { name: defaultName }) : t('chat.defaultModelNone') }}
      </option>
      <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
    </select>
  </div>
</template>
