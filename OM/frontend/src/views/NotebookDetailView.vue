<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import NotebookHeader from '@/components/notebooks/NotebookHeader.vue'
import ChildrenSection from '@/components/notebooks/ChildrenSection.vue'
import CollapsibleColumn from '@/components/notebooks/CollapsibleColumn.vue'
import SourcesColumn from '@/components/sources/SourcesColumn.vue'
import NotesColumn from '@/components/notes/NotesColumn.vue'
import ChatColumn from '@/components/chat/ChatColumn.vue'
import ContextSummaryBar from '@/components/context/ContextSummaryBar.vue'
import { useNotebook } from '@/composables/useNotebooks'
import { useSpacesStore } from '@/stores/spaces'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const spaces = useSpacesStore()
onMounted(() => spaces.load())

const id = computed(() => decodeURIComponent(route.params.id as string))
const { data: notebook, isLoading, isError } = useNotebook(id)

// Проект ячейки/задачи: заметки и источники, созданные внутри, наследуют его
// (space_id), иначе бы помечались ложно «дефолтными». Наследуем ТОЛЬКО проектное
// пространство — если ячейка глобальная, оставляем пусто (заметка дефолтная).
const projectSpaceId = computed(() => {
  const sid = notebook.value?.space_id || ''
  return spaces.projects.some((p) => p.id === sid) ? sid : ''
})

// «Назад» = шаг назад по истории (страница-источник с её параметрами сохраняется).
// Если истории нет (прямой заход/F5) — уводим на «Ячейки».
function goBack() {
  if (window.history.state?.back) router.back()
  else router.push('/notebooks')
}

// На мобиле (<lg) показываем колонки как табы; на lg+ — все три в ряд.
type Tab = 'sources' | 'notes' | 'chat'
const activeTab = ref<Tab>('sources')
const tabs: { key: Tab; labelKey: string }[] = [
  { key: 'sources', labelKey: 'detail.sources' },
  { key: 'notes', labelKey: 'detail.notes' },
  { key: 'chat', labelKey: 'detail.chat' },
]
</script>

<template>
  <div class="mx-auto max-w-6xl p-6">
    <Button variant="ghost" size="sm" class="mb-4" @click="goBack">
      <ArrowLeft class="size-4" />{{ t('common.back') }}
    </Button>

    <div v-if="isLoading" class="py-16 text-center text-sm text-muted-foreground">{{ t('common.loading') }}</div>
    <div v-else-if="isError || !notebook" class="py-16 text-center text-sm text-muted-foreground">
      {{ t('common.connectionError') }}
    </div>

    <template v-else>
      <NotebookHeader :notebook="notebook" />

      <ContextSummaryBar :notebook-id="notebook.id" class="mt-6" />

      <!-- Подзадачи — выше колонок Источники/Заметки/Чат (по фидбеку). -->
      <ChildrenSection :parent-id="notebook.id" :space-id="notebook.space_id" />

      <!-- Табы для переключения колонок на мобиле (<lg) -->
      <div class="mt-4 flex gap-1 rounded-lg border p-1 lg:hidden">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="activeTab === tab.key ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'"
          @click="activeTab = tab.key"
        >
          {{ t(tab.labelKey) }}
        </button>
      </div>

      <!-- Три колонки: Источники | Заметки | Чат с ИИ.
           На lg+ все три в ряд; на мобиле видна только активная вкладка. -->
      <div class="mt-4 flex flex-col gap-4 lg:flex-row">
        <CollapsibleColumn
          :title="t('detail.sources')"
          :class="activeTab === 'sources' ? '' : 'hidden lg:flex'"
        >
          <SourcesColumn :notebook-id="notebook.id" :space-id="projectSpaceId" />
        </CollapsibleColumn>
        <CollapsibleColumn
          :title="t('detail.notes')"
          :class="activeTab === 'notes' ? '' : 'hidden lg:flex'"
        >
          <NotesColumn :notebook-id="notebook.id" :space-id="projectSpaceId" />
        </CollapsibleColumn>
        <CollapsibleColumn
          :title="t('detail.chat')"
          :class="activeTab === 'chat' ? '' : 'hidden lg:flex'"
        >
          <ChatColumn :notebook-id="notebook.id" />
        </CollapsibleColumn>
      </div>
    </template>
  </div>
</template>
