<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { LayoutGrid, List as ListIcon, Plus, RefreshCw } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import NotebookCard from '@/components/notebooks/NotebookCard.vue'
import NotebookRow from '@/components/notebooks/NotebookRow.vue'
import SpaceBoard from '@/components/notebooks/SpaceBoard.vue'
import CreateCellDialog from '@/components/notebooks/CreateCellDialog.vue'
import { useNotebooks } from '@/composables/useNotebooks'
import { useSpacesStore } from '@/stores/spaces'
import { isArchived, compareByStateThenNewest } from '@/lib/notebook'

const { t } = useI18n()
const { data, isLoading, refetch } = useNotebooks()
const spaces = useSpacesStore()
onMounted(() => spaces.load())
// Описание пространства «Ячейки» (дефолтное, slug=shortcuts).
const shortcutsSpace = computed(() => spaces.spaces.find((s) => s.slug === 'shortcuts') ?? null)

const search = ref('')
const view = ref<'tile' | 'list'>((localStorage.getItem('om-notebooks-view') as 'tile' | 'list') || 'tile')
const createOpen = ref(false)

function setView(v: 'tile' | 'list') {
  view.value = v
  localStorage.setItem('om-notebooks-view', v)
}

const q = computed(() => search.value.trim().toLowerCase())
// В пространстве «Ячейки» показываем ВСЕ сущности как отдельные карточки — ячейки,
// задачи и подзадачи. Связь (родитель↔подзадача) отмечена бейджем на карточке.
// Админские ячейки уходят в Админ-панель и в общих местах не показываются.
const allCards = computed(() => (data.value ?? []).filter((n) => !n.is_admin))
const matchesQuery = (n: { name: string }) => !q.value || n.name.toLowerCase().includes(q.value)
// Активные карточки отсортированы по группам состояний (Идея → … → Завершено),
// новые сверху. Архивные (ручной флаг или «Завершено» старше N дней) скрыты.
const active = computed(() =>
  allCards.value.filter((n) => !isArchived(n) && matchesQuery(n)).sort(compareByStateThenNewest),
)
const archived = computed(() =>
  allCards.value.filter((n) => isArchived(n) && matchesQuery(n)),
)
</script>

<template>
  <div class="mx-auto max-w-6xl p-6">
    <div class="mb-4 flex items-center gap-3">
      <h1 class="text-2xl font-semibold tracking-tight">{{ t('notebooks.title') }}</h1>
      <Button variant="ghost" size="icon" class="size-8" :title="t('common.loading')" @click="refetch()">
        <RefreshCw class="size-4" :class="isLoading ? 'animate-spin' : ''" />
      </Button>
      <div class="ml-auto flex items-center gap-1 rounded-md border p-0.5">
        <Button :variant="view === 'tile' ? 'default' : 'ghost'" size="icon" class="size-8" :title="t('notebooks.tileView')" @click="setView('tile')">
          <LayoutGrid class="size-4" />
        </Button>
        <Button :variant="view === 'list' ? 'default' : 'ghost'" size="icon" class="size-8" :title="t('notebooks.listView')" @click="setView('list')">
          <ListIcon class="size-4" />
        </Button>
      </div>
    </div>

    <p v-if="shortcutsSpace?.description" class="mb-4 text-sm text-muted-foreground">
      {{ shortcutsSpace.description }}
    </p>

    <div class="mb-6 flex items-center gap-2">
      <Input v-model="search" :placeholder="t('notebooks.searchPlaceholder')" class="max-w-sm" />
      <Button @click="createOpen = true"><Plus class="size-4" />{{ t('notebooks.createNew') }}</Button>
    </div>

    <div v-if="isLoading" class="py-16 text-center text-sm text-muted-foreground">{{ t('common.loading') }}</div>

    <div v-else-if="active.length === 0 && archived.length === 0" class="py-16 text-center">
      <p class="text-lg font-medium">{{ t('notebooks.empty') }}</p>
      <p class="mt-1 text-sm text-muted-foreground">{{ t('notebooks.emptyHint') }}</p>
      <Button class="mt-4" @click="createOpen = true"><Plus class="size-4" />{{ t('notebooks.createNew') }}</Button>
    </div>

    <template v-else>
      <!-- Плиточный вид = доска пространства: 4 условные колонки по состоянию + DnD. -->
      <SpaceBoard v-if="view === 'tile'" :notebooks="active" />
      <div v-else class="space-y-2">
        <NotebookRow v-for="n in active" :key="n.id" :notebook="n" />
      </div>

      <div v-if="archived.length" class="mt-10">
        <h2 class="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">{{ t('notebooks.archived') }}</h2>
        <div v-if="view === 'tile'" class="grid grid-cols-1 gap-4 opacity-70 sm:grid-cols-2 lg:grid-cols-3">
          <NotebookCard v-for="n in archived" :key="n.id" :notebook="n" />
        </div>
        <div v-else class="space-y-2 opacity-70">
          <NotebookRow v-for="n in archived" :key="n.id" :notebook="n" />
        </div>
      </div>
    </template>

    <CreateCellDialog v-model:open="createOpen" />
  </div>
</template>
