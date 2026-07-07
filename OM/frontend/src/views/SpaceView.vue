<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { Plus, RefreshCw, Folder } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import ExpandableTextarea from '@/components/ui/ExpandableTextarea.vue'
import SpaceBoard from '@/components/notebooks/SpaceBoard.vue'
import CreateCellDialog from '@/components/notebooks/CreateCellDialog.vue'
import CollapsibleColumn from '@/components/notebooks/CollapsibleColumn.vue'
import SourcesColumn from '@/components/sources/SourcesColumn.vue'
import NotesColumn from '@/components/notes/NotesColumn.vue'
import ChatColumn from '@/components/chat/ChatColumn.vue'
import { useNotebooks } from '@/composables/useNotebooks'
import { getSpaceContainer } from '@/api/spaces'
import { useSpacesStore } from '@/stores/spaces'
import { isArchived, compareByStateThenNewest } from '@/lib/notebook'

// Проект = пользовательское пространство: показывает только карточки со своим
// space_id (в отличие от «Ячеек», где все карточки). Создание идёт внутрь проекта.
const route = useRoute()
const { t } = useI18n()
const spaces = useSpacesStore()
const { data, isLoading, refetch } = useNotebooks()

const spaceId = computed(() => String(route.params.id))
const space = computed(() => spaces.spaces.find((s) => s.id === spaceId.value) ?? null)

onMounted(() => spaces.load())

// Описание пространства: у проектов редактируемое, у прочих — только чтение.
const description = ref('')
watch(space, (s) => { description.value = s?.description ?? '' }, { immediate: true })
function saveDescription() {
  if (space.value && space.value.kind === 'project' && description.value !== (space.value.description ?? '')) {
    spaces.update(space.value.id, { description: description.value })
  }
}

const search = ref('')
const createOpen = ref(false)
const q = computed(() => search.value.trim().toLowerCase())
const matchesQuery = (n: { name: string }) => !q.value || n.name.toLowerCase().includes(q.value)

// Карточки этого проекта: как в «Ячейках», но только сущности пространства —
// ячейки, задачи И подзадачи. Подзадача принадлежит пространству своего родителя
// (её собственный space_id может быть пуст), поэтому учитываем и связь.
const inSpace = computed(() => {
  const list = data.value ?? []
  const belongs = (n: (typeof list)[number]) => {
    // Админские ячейки уходят в Админ-панель и на доске проекта не показываются.
    if (n.is_admin) return false
    if (n.space_id === spaceId.value) return true
    if (n.parent_id) {
      const parent = list.find((m) => m.id === n.parent_id)
      return !!parent && parent.space_id === spaceId.value
    }
    return false
  }
  return list.filter(belongs)
})
const active = computed(() =>
  inSpace.value.filter((n) => !isArchived(n) && matchesQuery(n)).sort(compareByStateThenNewest),
)

// Контейнер пространства: скрытый notebook, к которому привязаны источники/заметки/чат
// уровня пространства (создаётся лениво на бэкенде). Даёт вкладки «как у ячейки».
const { data: containerId } = useQuery({
  queryKey: computed(() => ['space-container', spaceId.value]),
  queryFn: () => getSpaceContainer(spaceId.value),
  enabled: computed(() => !!spaceId.value),
  staleTime: Infinity,
})

// На мобиле (<lg) колонки показываем как табы; на lg+ — три в ряд.
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
    <div class="mb-4 flex items-center gap-3">
      <Folder class="size-6 shrink-0 text-primary" />
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ space?.name ?? t('spaces.spaceFallbackTitle') }}
      </h1>
      <Button variant="ghost" size="icon" class="size-8" :title="t('common.loading')" @click="refetch()">
        <RefreshCw class="size-4" :class="isLoading ? 'animate-spin' : ''" />
      </Button>
    </div>

    <!-- Описание пространства: проект — редактируемое, остальные — только чтение. -->
    <div v-if="space" class="mb-4">
      <ExpandableTextarea
        v-if="space.kind === 'project'"
        v-model="description"
        :placeholder="t('spaces.descriptionPlaceholder')"
        :rows="2"
        :title="t('spaces.description')"
        @save="saveDescription"
      />
      <p v-else-if="space.description" class="text-sm text-muted-foreground">{{ space.description }}</p>
    </div>

    <div class="mb-6 flex items-center gap-2">
      <Input v-model="search" :placeholder="t('notebooks.searchPlaceholder')" class="max-w-sm" />
      <Button @click="createOpen = true"><Plus class="size-4" />{{ t('notebooks.createNew') }}</Button>
    </div>

    <div v-if="isLoading" class="py-16 text-center text-sm text-muted-foreground">{{ t('common.loading') }}</div>

    <div v-else-if="active.length === 0" class="py-16 text-center">
      <p class="text-lg font-medium">{{ t('spaces.projectEmpty') }}</p>
      <p class="mt-1 text-sm text-muted-foreground">{{ t('spaces.projectEmptyHint') }}</p>
      <Button class="mt-4" @click="createOpen = true"><Plus class="size-4" />{{ t('notebooks.createNew') }}</Button>
    </div>

    <SpaceBoard v-else :notebooks="active" />

    <!-- Вкладки пространства: Источники / Заметки / Чат с ИИ — как у ячейки, но
         на уровне всего пространства (привязаны к его контейнеру). -->
    <template v-if="containerId">
      <div class="mt-8 flex gap-1 rounded-lg border p-1 lg:hidden">
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

      <div class="mt-4 flex flex-col gap-4 lg:flex-row">
        <CollapsibleColumn
          :title="t('detail.sources')"
          :class="activeTab === 'sources' ? '' : 'hidden lg:flex'"
        >
          <SourcesColumn :notebook-id="containerId" :space-id="space?.kind === 'project' ? spaceId : ''" />
        </CollapsibleColumn>
        <CollapsibleColumn
          :title="t('detail.notes')"
          :class="activeTab === 'notes' ? '' : 'hidden lg:flex'"
        >
          <NotesColumn :notebook-id="containerId" :space-id="space?.kind === 'project' ? spaceId : ''" />
        </CollapsibleColumn>
        <CollapsibleColumn
          :title="t('detail.chat')"
          :class="activeTab === 'chat' ? '' : 'hidden lg:flex'"
        >
          <ChatColumn :notebook-id="containerId" />
        </CollapsibleColumn>
      </div>
    </template>

    <!-- Создание идёт внутрь проекта: карточка получает space_id текущего проекта. -->
    <CreateCellDialog v-model:open="createOpen" :space-id="spaceId" />
  </div>
</template>
