<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { KeyRound, ChevronRight } from 'lucide-vue-next'
import Card from '@/components/ui/Card.vue'
import Label from '@/components/ui/Label.vue'
import Button from '@/components/ui/Button.vue'
import { useSettings, useUpdateSettings } from '@/composables/useSettings'
import type { AppSettings } from '@/api/settings'

const { t } = useI18n()
const router = useRouter()
const { data: settings, isLoading } = useSettings()
const update = useUpdateSettings()

const form = ref<AppSettings>({})
watch(settings, (v) => { if (v) form.value = { ...v } }, { immediate: true })

const dirty = computed(() => JSON.stringify(form.value) !== JSON.stringify(settings.value ?? {}))
const saved = ref(false)

async function save() {
  saved.value = false
  await update.mutateAsync(form.value)
  saved.value = true
}

const docEngines = ['auto', 'docling', 'simple']
const urlEngines = ['auto', 'firecrawl', 'jina', 'simple']
const embeddingOptions = ['ask', 'always', 'never']
const autoDeleteOptions = ['yes', 'no']
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-6">
    <h1 class="text-2xl font-semibold tracking-tight">{{ t('navigation.settings') }}</h1>

    <!-- Ключи и модели -->
    <Card class="cursor-pointer p-4 transition-colors hover:bg-muted/40" @click="router.push('/settings/api-keys')">
      <div class="flex items-center gap-3">
        <KeyRound class="size-5 text-muted-foreground" />
        <div class="flex-1">
          <p class="font-medium">{{ t('pages.apiKeys') }}</p>
          <p class="text-sm text-muted-foreground">{{ t('apiKeys.pageDesc') }}</p>
        </div>
        <ChevronRight class="size-5 text-muted-foreground" />
      </div>
    </Card>

    <div v-if="isLoading" class="py-10 text-center text-sm text-muted-foreground">{{ t('common.loading') }}</div>

    <template v-else>
      <!-- Обработка контента -->
      <Card class="space-y-4 p-5">
        <div>
          <h2 class="text-lg font-medium">{{ t('settings.contentProcessing') }}</h2>
          <p class="text-sm text-muted-foreground">{{ t('settings.contentProcessingDesc') }}</p>
        </div>
        <div class="space-y-1">
          <Label>{{ t('settings.docEngine') }}</Label>
          <select v-model="form.default_content_processing_engine_doc" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option v-for="o in docEngines" :key="o" :value="o">{{ t(`settings.opt_${o}`) }}</option>
          </select>
        </div>
        <div class="space-y-1">
          <Label>{{ t('settings.urlEngine') }}</Label>
          <select v-model="form.default_content_processing_engine_url" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option v-for="o in urlEngines" :key="o" :value="o">{{ t(`settings.opt_${o}`) }}</option>
          </select>
        </div>
      </Card>

      <!-- Эмбеддинги и поиск -->
      <Card class="space-y-4 p-5">
        <div>
          <h2 class="text-lg font-medium">{{ t('settings.embeddingAndSearch') }}</h2>
          <p class="text-sm text-muted-foreground">{{ t('settings.embeddingAndSearchDesc') }}</p>
        </div>
        <div class="space-y-1">
          <Label>{{ t('settings.defaultEmbeddingOption') }}</Label>
          <select v-model="form.default_embedding_option" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option v-for="o in embeddingOptions" :key="o" :value="o">{{ t(`settings.opt_${o}`) }}</option>
          </select>
        </div>
      </Card>

      <!-- Файлы -->
      <Card class="space-y-4 p-5">
        <div>
          <h2 class="text-lg font-medium">{{ t('settings.fileManagement') }}</h2>
          <p class="text-sm text-muted-foreground">{{ t('settings.fileManagementDesc') }}</p>
        </div>
        <div class="space-y-1">
          <Label>{{ t('settings.autoDeleteFiles') }}</Label>
          <select v-model="form.auto_delete_files" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option v-for="o in autoDeleteOptions" :key="o" :value="o">{{ t(`settings.opt_${o}`) }}</option>
          </select>
        </div>
      </Card>

      <div class="flex items-center justify-end gap-3">
        <span v-if="saved && !dirty" class="text-sm text-emerald-600 dark:text-emerald-400">{{ t('common.saved') }}</span>
        <Button :disabled="!dirty || update.isPending.value" @click="save">
          {{ update.isPending.value ? t('common.saving') : t('common.save') }}
        </Button>
      </div>
    </template>
  </div>
</template>
