<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import NotebookRow from '@/components/notebooks/NotebookRow.vue'
import CreateCellDialog from '@/components/notebooks/CreateCellDialog.vue'
import { useNotebookChildren } from '@/composables/useNotebooks'
import { isArchived } from '@/lib/notebook'

// spaceId родителя — чтобы новая подзадача наследовала пространство (иначе она
// выпадала бы из фильтра пространства).
const props = defineProps<{ parentId: string; spaceId?: string | null }>()
const { t } = useI18n()
const { data: children, isLoading } = useNotebookChildren(toRef(props, 'parentId'))
// Архивные подзадачи в карточке родителя не показываем — они уходят в «Архив».
const visibleChildren = computed(() => (children.value ?? []).filter((c) => !isArchived(c)))
// Активные подзадачи — как раньше; завершённые (state 4) сворачиваем в одну строку.
const activeChildren = computed(() => visibleChildren.value.filter((c) => c.state !== 4))
const completedChildren = computed(() => visibleChildren.value.filter((c) => c.state === 4))
// Свёрнуты по умолчанию; раскрываются кликом по строке-сводке.
const completedOpen = ref(false)
const createOpen = ref(false)
</script>

<template>
  <section class="mt-6">
    <div class="mb-3 flex items-center gap-2">
      <h2 class="text-sm font-medium uppercase tracking-wider text-muted-foreground">{{ t('notebooks.children') }}</h2>
      <Button variant="outline" size="sm" class="ml-auto" @click="createOpen = true">
        <Plus class="size-4" />{{ t('notebooks.addSubtask') }}
      </Button>
    </div>

    <div v-if="isLoading" class="text-sm text-muted-foreground">{{ t('common.loading') }}</div>
    <div v-else-if="visibleChildren.length === 0" class="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
      {{ t('notebooks.noChildren') }}
    </div>
    <div v-else class="space-y-2">
      <!-- Активные подзадачи. -->
      <NotebookRow v-for="c in activeChildren" :key="c.id" :notebook="c" />

      <!-- Завершённые подзадачи свёрнуты в одну строку-сводку; клик раскрывает. -->
      <template v-if="completedChildren.length">
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent"
          @click="completedOpen = !completedOpen"
        >
          <ChevronDown v-if="completedOpen" class="size-4 shrink-0" />
          <ChevronRight v-else class="size-4 shrink-0" />
          <CheckCircle2 class="size-4 shrink-0 text-green-500" />
          <span class="font-medium">{{ t('notebooks.completedSubtasks', { count: completedChildren.length }) }}</span>
        </button>
        <div v-if="completedOpen" class="space-y-2 pl-4">
          <NotebookRow v-for="c in completedChildren" :key="c.id" :notebook="c" />
        </div>
      </template>
    </div>

    <CreateCellDialog v-model:open="createOpen" :parent-id="parentId" :space-id="spaceId ?? undefined" />
  </section>
</template>
