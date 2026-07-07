<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { FileText, Link as LinkIcon, Upload, AlignLeft, Trash2, ArrowUpDown, Plus, Folder, FolderMinus, MoreVertical } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Dialog from '@/components/ui/Dialog.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import DropdownItem from '@/components/ui/DropdownItem.vue'
import AddSourceDialog from '@/components/sources/AddSourceDialog.vue'
import { listAllSources, deleteSource, updateSource } from '@/api/sources'
import type { SourceListItem } from '@/types/source'
import { useSpacesStore } from '@/stores/spaces'

const { t, locale } = useI18n()

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)
  const lang = locale.value === 'ru-RU' ? 'ru' : 'en'
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  if (years >= 1) return rtf.format(-years, 'year')
  if (months >= 1) return rtf.format(-months, 'month')
  if (days >= 1) return rtf.format(-days, 'day')
  if (hours >= 1) return rtf.format(-hours, 'hour')
  if (minutes >= 1) return rtf.format(-minutes, 'minute')
  return rtf.format(-seconds, 'second')
}
const router = useRouter()
const spaces = useSpacesStore()

// Привязка источника к проекту (space kind=project). space_id=null → дефолтный (глобальный).
function projectOf(source: SourceListItem) {
  return source.space_id ? spaces.projects.find((s) => s.id === source.space_id) ?? null : null
}
function moveTargetsFor(source: SourceListItem) {
  return spaces.projects.filter((s) => s.id !== source.space_id)
}
async function assignProject(source: SourceListItem, spaceId: string | null) {
  await updateSource(source.id, { space_id: spaceId ?? '' })
  source.space_id = spaceId // локально обновляем бейдж (список ведём вручную, без vue-query)
}

const PAGE_SIZE = 30
const sources = ref<SourceListItem[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(true)
const offset = ref(0)
const selectedIndex = ref(0)
const sortBy = ref<'created' | 'updated'>('updated')
const sortOrder = ref<'asc' | 'desc'>('desc')
const scrollContainer = ref<HTMLElement | null>(null)
const tableEl = ref<HTMLElement | null>(null)

const deleteDialog = ref<{ open: boolean; source: SourceListItem | null }>({ open: false, source: null })

// Добавление источника без привязки (виджет «+ Источник»).
const addOpen = ref(false)
function onAddClosed(open: boolean) {
  // После закрытия диалога обновляем список (источник создаётся асинхронно).
  if (!open) fetchSources(true)
}

async function fetchSources(reset = false) {
  if (!reset && (loadingMore.value || !hasMore.value)) return

  if (reset) {
    loading.value = true
    offset.value = 0
    sources.value = []
    hasMore.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const data = await listAllSources({
      limit: PAGE_SIZE,
      offset: offset.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
    })
    if (reset) {
      sources.value = data
    } else {
      sources.value = [...sources.value, ...data]
    }
    hasMore.value = data.length === PAGE_SIZE
    offset.value += data.length
  } catch {
    // ошибка уже в консоли axios
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function toggleSort(field: 'created' | 'updated') {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'desc'
  }
  fetchSources(true)
}

// dateLocale удалён — используем нативный Intl

function getSourceIcon(source: SourceListItem) {
  if (source.asset?.url) return LinkIcon
  if (source.asset?.file_path) return Upload
  return AlignLeft
}

function getSourceType(source: SourceListItem): string {
  if (source.asset?.url) return t('sources.typeLink')
  if (source.asset?.file_path) return t('sources.typeFile')
  return t('sources.typeText')
}

function handleRowClick(index: number, sourceId: string) {
  selectedIndex.value = index
  router.push(`/sources/${sourceId}`)
}

function openDeleteDialog(source: SourceListItem) {
  deleteDialog.value = { open: true, source }
}

async function confirmDelete() {
  if (!deleteDialog.value.source) return
  try {
    await deleteSource(deleteDialog.value.source.id)
    sources.value = sources.value.filter(s => s.id !== deleteDialog.value.source?.id)
  } catch {
    // axios уже логирует
  } finally {
    deleteDialog.value = { open: false, source: null }
  }
}

function scrollToRow(index: number) {
  const container = scrollContainer.value
  if (!container) return
  const rows = container.querySelectorAll('tbody tr')
  const row = rows[index] as HTMLElement
  if (!row) return
  const cr = container.getBoundingClientRect()
  const rr = row.getBoundingClientRect()
  if (rr.top < cr.top) row.scrollIntoView({ behavior: 'smooth', block: 'start' })
  else if (rr.bottom > cr.bottom) row.scrollIntoView({ behavior: 'smooth', block: 'end' })
}

function handleKeyDown(e: KeyboardEvent) {
  if (!sources.value.length) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, sources.value.length - 1)
    scrollToRow(selectedIndex.value)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
    scrollToRow(selectedIndex.value)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const src = sources.value[selectedIndex.value]
    if (src) router.push(`/sources/${src.id}`)
  } else if (e.key === 'Home') {
    e.preventDefault()
    selectedIndex.value = 0
    scrollToRow(0)
  } else if (e.key === 'End') {
    e.preventDefault()
    selectedIndex.value = sources.value.length - 1
    scrollToRow(selectedIndex.value)
  }
}

function handleScroll() {
  const el = scrollContainer.value
  if (!el) return
  const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
  if (distFromBottom < 200 && !loadingMore.value && hasMore.value) {
    fetchSources(false)
  }
}

onMounted(() => {
  spaces.load()
  fetchSources(true)
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="flex h-full flex-col px-6 py-6">
    <!-- Шапка -->
    <div class="mb-6 flex shrink-0 items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">{{ t('sources.allSources') }}</h1>
        <p class="mt-2 text-muted-foreground">{{ t('sources.allSourcesDesc') }}</p>
      </div>
      <Button class="shrink-0 gap-2" @click="addOpen = true">
        <Plus class="size-4" />
        {{ t('sources.add') }}
      </Button>
    </div>

    <!-- Загрузка -->
    <div v-if="loading" class="flex flex-1 items-center justify-center">
      <span class="text-sm text-muted-foreground">{{ t('common.loading') }}</span>
    </div>

    <!-- Пустое состояние -->
    <div v-else-if="!sources.length" class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <FileText class="size-12 text-muted-foreground/40" />
      <p class="text-lg font-medium">{{ t('sources.noSourcesYet') }}</p>
      <p class="text-sm text-muted-foreground">{{ t('sources.noSourcesYetDesc') }}</p>
      <Button class="mt-2 gap-2" @click="addOpen = true">
        <Plus class="size-4" />
        {{ t('sources.add') }}
      </Button>
    </div>

    <!-- Таблица -->
    <div v-else ref="scrollContainer" class="flex-1 overflow-auto rounded-md border" @scroll="handleScroll">
      <table ref="tableEl" tabindex="0" class="w-full min-w-[700px] table-fixed outline-none">
        <colgroup>
          <col class="w-[130px]" />
          <col class="w-auto" />
          <col class="w-[160px]" />
          <col class="w-[90px]" />
          <col class="w-[100px]" />
          <col class="w-[80px]" />
        </colgroup>
        <thead class="sticky top-0 z-10 bg-background">
          <tr class="border-b bg-muted/50">
            <th class="h-12 px-4 text-left text-sm font-medium text-muted-foreground">{{ t('common.type') }}</th>
            <th class="h-12 px-4 text-left text-sm font-medium text-muted-foreground">{{ t('common.title') }}</th>
            <th class="h-12 px-4 text-left text-sm font-medium text-muted-foreground">
              <Button variant="ghost" size="sm" class="h-8 px-2" @click="toggleSort('created')">
                {{ t('sources.createdAt') }}
                <ArrowUpDown class="ml-1 size-3" :class="sortBy === 'created' ? 'opacity-100' : 'opacity-30'" />
                <span v-if="sortBy === 'created'" class="ml-1 text-xs">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </Button>
            </th>
            <th class="h-12 px-4 text-center text-sm font-medium text-muted-foreground">{{ t('sources.insights') }}</th>
            <th class="h-12 px-4 text-center text-sm font-medium text-muted-foreground">{{ t('sources.embedded') }}</th>
            <th class="h-12 px-4 text-right text-sm font-medium text-muted-foreground">{{ t('sources.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(source, index) in sources"
            :key="source.id"
            class="cursor-pointer border-b transition-colors"
            :class="selectedIndex === index ? 'bg-accent' : 'hover:bg-muted/50'"
            @click="handleRowClick(index, source.id)"
            @mouseenter="selectedIndex = index"
          >
            <td class="h-12 px-4">
              <div class="flex items-center gap-2">
                <component :is="getSourceIcon(source)" class="size-4 shrink-0 text-muted-foreground" />
                <Badge variant="secondary" class="text-xs">{{ getSourceType(source) }}</Badge>
              </div>
            </td>
            <td class="h-12 px-4">
              <div class="flex flex-col gap-0.5 overflow-hidden">
                <span class="truncate font-medium">{{ source.title || t('sources.untitled') }}</span>
                <span v-if="source.asset?.url" class="truncate text-xs text-muted-foreground">{{ source.asset.url }}</span>
                <!-- Стикер родителя: имя пространства-проекта, клик — сменить/убрать. Глобальный → стикера нет. -->
                <div v-if="projectOf(source)" class="flex items-center gap-1.5" @click.stop>
                  <DropdownMenu>
                    <template #trigger>
                      <Badge variant="secondary" class="max-w-[12rem] cursor-pointer gap-1 hover:opacity-80">
                        <Folder class="size-3 shrink-0" /><span class="truncate">{{ projectOf(source)!.name }}</span>
                      </Badge>
                    </template>
                    <DropdownItem v-for="p in moveTargetsFor(source)" :key="p.id" @select="assignProject(source, p.id)">
                      <Folder class="size-4" />{{ t('sources.assignTo', { name: p.name }) }}
                    </DropdownItem>
                    <DropdownItem @select="assignProject(source, null)">
                      <FolderMinus class="size-4" />{{ t('sources.makeDefault') }}
                    </DropdownItem>
                  </DropdownMenu>
                </div>
              </div>
            </td>
            <td class="h-12 px-4 text-sm text-muted-foreground">
              {{ formatRelative(source.created) }}
            </td>
            <td class="h-12 px-4 text-center">
              <span class="text-sm font-medium">{{ source.insights_count || 0 }}</span>
            </td>
            <td class="h-12 px-4 text-center">
              <Badge :variant="source.embedded ? 'default' : 'secondary'" class="text-xs">
                {{ source.embedded ? t('sources.yes') : t('sources.no') }}
              </Badge>
            </td>
            <td class="h-12 px-4 text-right" @click.stop>
              <DropdownMenu>
                <template #trigger>
                  <Button variant="ghost" size="icon"><MoreVertical class="size-4" /></Button>
                </template>
                <!-- Назначить проект из меню — только для глобального (без стикера) источника. -->
                <template v-if="!source.space_id">
                  <DropdownItem v-for="p in moveTargetsFor(source)" :key="p.id" @select="assignProject(source, p.id)">
                    <Folder class="size-4" />{{ t('sources.assignTo', { name: p.name }) }}
                  </DropdownItem>
                </template>
                <DropdownItem class="text-destructive" @select="openDeleteDialog(source)">
                  <Trash2 class="size-4" />{{ t('common.delete') }}
                </DropdownItem>
              </DropdownMenu>
            </td>
          </tr>
          <tr v-if="loadingMore">
            <td colspan="6" class="h-12 text-center text-sm text-muted-foreground">
              {{ t('sources.loadingMore') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Диалог подтверждения удаления -->
    <!-- Добавление источника без привязки -->
    <AddSourceDialog v-model:open="addOpen" @update:open="onAddClosed" />

    <Dialog v-model:open="deleteDialog.open" :title="t('sources.deleteConfirm')">
      <p class="text-sm text-muted-foreground">
        {{ t('sources.deleteConfirmDesc', { title: deleteDialog.source?.title || t('sources.untitled') }) }}
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <Button variant="outline" @click="deleteDialog.open = false">{{ t('common.cancel') }}</Button>
        <Button variant="destructive" @click="confirmDelete">{{ t('common.delete') }}</Button>
      </div>
    </Dialog>
  </div>
</template>
