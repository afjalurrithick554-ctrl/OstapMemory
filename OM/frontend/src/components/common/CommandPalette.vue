<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, VisuallyHidden } from 'reka-ui'
import {
  Search, MessageCircleQuestion, FileText, Book, Activity, Mic, Bot, Shuffle,
  Settings, Wrench, Plus, Sun, Moon, MonitorSmartphone, type LucideIcon,
} from 'lucide-vue-next'
import { useThemeStore, type ThemeMode } from '@/stores/theme'
import { useNotebooks } from '@/composables/useNotebooks'
import CreateCellDialog from '@/components/notebooks/CreateCellDialog.vue'

const router = useRouter()
const { t } = useI18n()
const theme = useThemeStore()
const { data: notebooks } = useNotebooks()

const open = ref(false)
const query = ref('')
const activeIndex = ref(0)
const createCellOpen = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)

interface Cmd {
  id: string
  label: string
  icon: LucideIcon
  keywords?: string
  run: () => void
}

// Навигация
const navItems = computed<Cmd[]>(() => [
  { id: 'nav-sources', label: t('navigation.sources'), icon: FileText, keywords: 'files documents источники', run: () => go('/sources') },
  { id: 'nav-notebooks', label: t('navigation.notebooks'), icon: Book, keywords: 'cells ячейки notes', run: () => go('/notebooks') },
  { id: 'nav-search', label: t('navigation.askAndSearch'), icon: Search, keywords: 'find query поиск запрос', run: () => go('/search') },
  { id: 'nav-progress', label: t('navigation.progress'), icon: Activity, keywords: 'процесс состояния', run: () => go('/progress') },
  { id: 'nav-podcasts', label: t('navigation.podcasts'), icon: Mic, keywords: 'audio подкасты', run: () => go('/podcasts') },
  { id: 'nav-models', label: t('navigation.models'), icon: Bot, keywords: 'ai llm api keys модели ключи', run: () => go('/settings/api-keys') },
  { id: 'nav-transformations', label: t('navigation.transformations'), icon: Shuffle, keywords: 'prompts трансформации', run: () => go('/transformations') },
  { id: 'nav-settings', label: t('navigation.settings'), icon: Settings, keywords: 'preferences настройки', run: () => go('/settings') },
  { id: 'nav-advanced', label: t('navigation.advanced'), icon: Wrench, keywords: 'debug дополнительно', run: () => go('/advanced') },
])

// Ячейки (notebooks)
const cellItems = computed<Cmd[]>(() =>
  (notebooks.value ?? []).map((nb) => ({
    id: `cell-${nb.id}`,
    label: nb.name,
    icon: Book,
    keywords: `ячейка ${nb.description ?? ''}`,
    run: () => go(`/notebooks/${nb.id}`),
  })),
)

// Создание
const createItems = computed<Cmd[]>(() => [
  { id: 'create-cell', label: t('command.newCell'), icon: Plus, keywords: 'создать новая ячейка', run: () => { close(); createCellOpen.value = true } },
])

// Тема
const themeItems = computed<Cmd[]>(() => [
  { id: 'theme-light', label: t('common.light'), icon: Sun, keywords: 'светлая bright', run: () => setTheme('light') },
  { id: 'theme-dark', label: t('common.dark'), icon: Moon, keywords: 'тёмная night', run: () => setTheme('dark') },
  { id: 'theme-system', label: t('common.system'), icon: MonitorSmartphone, keywords: 'системная auto', run: () => setTheme('system') },
])

// Поиск/Спросить — действия по введённому тексту
const queryActions = computed<Cmd[]>(() => {
  const q = query.value.trim()
  if (!q) return []
  return [
    { id: 'do-search', label: t('command.searchFor', { query: q }), icon: Search, keywords: q, run: () => go(`/search?q=${encodeURIComponent(q)}&mode=search`) },
    { id: 'do-ask', label: t('command.askAbout', { query: q }), icon: MessageCircleQuestion, keywords: q, run: () => go(`/search?q=${encodeURIComponent(q)}&mode=ask`) },
  ]
})

function matches(c: Cmd, q: string): boolean {
  if (!q) return true
  const hay = `${c.label} ${c.keywords ?? ''}`.toLowerCase()
  return hay.includes(q)
}

interface Group { key: string; heading: string; items: Cmd[] }

// Группы в порядке отображения. queryActions показываем первыми, если есть текст.
const groups = computed<Group[]>(() => {
  const q = query.value.toLowerCase().trim()
  const result: Group[] = []
  if (queryActions.value.length) {
    result.push({ key: 'query', heading: t('command.searchAndAsk'), items: queryActions.value })
  }
  const nav = navItems.value.filter((c) => matches(c, q))
  if (nav.length) result.push({ key: 'nav', heading: t('navigation.nav'), items: nav })
  const cells = cellItems.value.filter((c) => matches(c, q))
  if (cells.length) result.push({ key: 'cells', heading: t('notebooks.title'), items: cells })
  const create = createItems.value.filter((c) => matches(c, q))
  if (create.length) result.push({ key: 'create', heading: t('navigation.create'), items: create })
  const themes = themeItems.value.filter((c) => matches(c, q))
  if (themes.length) result.push({ key: 'theme', heading: t('command.theme'), items: themes })
  return result
})

// Плоский список видимых команд — для навигации стрелками.
const flat = computed<Cmd[]>(() => groups.value.flatMap((g) => g.items))

function go(path: string) {
  close()
  router.push(path)
}
function setTheme(mode: ThemeMode) {
  close()
  theme.setMode(mode)
}
function close() {
  open.value = false
}

watch(open, (v) => {
  if (v) {
    query.value = ''
    activeIndex.value = 0
    nextTick(() => inputEl.value?.focus())
  }
})
// При смене запроса сбрасываем выделение на первый пункт.
watch(query, () => { activeIndex.value = 0 })

function onListKeydown(e: KeyboardEvent) {
  const n = flat.value.length
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = n ? (activeIndex.value + 1) % n : 0
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = n ? (activeIndex.value - 1 + n) % n : 0
  } else if (e.key === 'Enter') {
    e.preventDefault()
    flat.value[activeIndex.value]?.run()
  }
}

// Глобальный хоткей Cmd/Ctrl+K. Игнорируем, если фокус в поле ввода.
function onGlobalKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
    if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) && !open.value) {
      // внутри палитры (наш input) — разрешаем тогл; в других полях — пропускаем
      if (!target.closest('.command-palette')) return
    }
    e.preventDefault()
    e.stopPropagation()
    open.value = !open.value
  }
}

onMounted(() => document.addEventListener('keydown', onGlobalKeydown, true))
onUnmounted(() => document.removeEventListener('keydown', onGlobalKeydown, true))

// Глобальный индекс пункта (для подсветки) по группе и позиции.
function indexOf(cmd: Cmd): number {
  return flat.value.findIndex((c) => c.id === cmd.id)
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-[100] bg-black/50" />
      <DialogContent
        class="command-palette fixed left-1/2 top-[20%] z-[100] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border bg-background shadow-lg focus:outline-none"
        @keydown="onListKeydown"
      >
        <VisuallyHidden>
          <DialogTitle>{{ t('command.title') }}</DialogTitle>
          <DialogDescription>{{ t('command.description') }}</DialogDescription>
        </VisuallyHidden>

        <div class="flex items-center gap-2 border-b px-3">
          <Search class="size-4 shrink-0 text-muted-foreground" />
          <input
            ref="inputEl"
            v-model="query"
            :placeholder="t('command.placeholder')"
            autocomplete="off"
            class="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div class="max-h-[60vh] overflow-y-auto p-1">
          <p v-if="!flat.length" class="py-6 text-center text-sm text-muted-foreground">
            {{ t('command.noResults') }}
          </p>
          <div v-for="group in groups" :key="group.key" class="mb-1">
            <p class="px-2 py-1.5 text-xs font-medium text-muted-foreground">{{ group.heading }}</p>
            <button
              v-for="item in group.items"
              :key="item.id"
              class="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm"
              :class="indexOf(item) === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'"
              @click="item.run()"
              @mousemove="activeIndex = indexOf(item)"
            >
              <component :is="item.icon" class="size-4 shrink-0 text-muted-foreground" />
              <span class="truncate">{{ item.label }}</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>

  <!-- Диалог создания ячейки, открывается командой «Новая ячейка» -->
  <CreateCellDialog v-model:open="createCellOpen" />
</template>
