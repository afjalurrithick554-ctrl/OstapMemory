<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Activity, RefreshCw } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import NotebookCard from '@/components/notebooks/NotebookCard.vue'
import { useNotebooks } from '@/composables/useNotebooks'
import { isArchived, stateColor } from '@/lib/notebook'
import type { Notebook } from '@/types/notebook'

const { t } = useI18n()
const { data, isLoading, refetch } = useNotebooks()

// Процесс — зеркало реальных задач: те же записи, что в проектах (реактивно через
// vue-query), отфильтрованные по состоянию. Изменения отражаются везде автоматически.
// Колонка 1 — «Готово к работе» (state 1), колонка 2 — «Можно проверять» (state 3).
// После проверки задача уходит в «Завершено» (state 4) и исчезает из Процесса.
function byState(state: number): Notebook[] {
  return (data.value ?? []).filter(
    (n) => n.notebook_type !== 'cell' && !isArchived(n) && n.state === state,
  )
}
const ready = computed(() => byState(1))
const toCheck = computed(() => byState(3))

const columns = computed(() => [
  { key: 'ready', state: 1, titleKey: 'progress.readyColumn', items: ready.value },
  { key: 'toCheck', state: 3, titleKey: 'progress.toCheckColumn', items: toCheck.value },
])
</script>

<template>
  <div class="mx-auto max-w-6xl p-6">
    <div class="mb-4 flex items-center gap-3">
      <h1 class="text-2xl font-semibold tracking-tight">{{ t('navigation.progress') }}</h1>
      <Button variant="ghost" size="icon" class="size-8" :title="t('common.loading')" @click="refetch()">
        <RefreshCw class="size-4" :class="isLoading ? 'animate-spin' : ''" />
      </Button>
    </div>

    <div v-if="isLoading" class="py-10 text-center text-sm text-muted-foreground">
      {{ t('common.loading') }}
    </div>

    <!-- Две колонки-зеркала -->
    <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <section v-for="col in columns" :key="col.key">
        <h2 class="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <span class="size-2 rounded-full" :class="stateColor(col.state)" />
          {{ t(col.titleKey) }}
          <span class="text-xs normal-case">({{ col.items.length }})</span>
        </h2>

        <div v-if="col.items.length" class="space-y-4">
          <NotebookCard v-for="n in col.items" :key="n.id" :notebook="n" />
        </div>

        <div v-else class="rounded-lg border border-dashed py-12 text-center">
          <Activity class="mx-auto mb-2 size-8 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">{{ t('progress.empty') }}</p>
        </div>
      </section>
    </div>
  </div>
</template>
