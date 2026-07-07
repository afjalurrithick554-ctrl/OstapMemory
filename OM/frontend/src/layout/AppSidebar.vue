<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  FileText, Book, Search, Activity, Mic, Bot, Shuffle, Settings, Wrench,
  BrainCircuit, Sun, Moon, MonitorSmartphone, Languages, PanelLeftClose, PanelLeftOpen,
  Bookmark, StickyNote, Archive, Folder, Plus, Trash2, Check, X,
  FileBarChart, ClipboardList, LayoutDashboard,
  type LucideIcon,
} from 'lucide-vue-next'
import Tooltip from '@/components/ui/Tooltip.vue'
import DevModeToggle from '@/components/dev/DevModeToggle.vue'
import { useSidebarStore } from '@/stores/sidebar'
import { useThemeStore } from '@/stores/theme'
import { useLocaleStore } from '@/stores/locale'
import { useSpacesStore } from '@/stores/spaces'
import type { Space } from '@/types/space'

// mobile=true — режим drawer: сайдбар всегда развёрнут, кнопки свёртки нет,
// клик по навигации закрывает drawer.
const props = defineProps<{ mobile?: boolean; class?: string }>()

const { t } = useI18n()
const sidebar = useSidebarStore()
const theme = useThemeStore()
const locale = useLocaleStore()
const spaces = useSpacesStore()
const route = useRoute()
const router = useRouter()

onMounted(() => spaces.load())

// В drawer-режиме игнорируем свёрнутое состояние.
const collapsed = computed(() => !props.mobile && sidebar.isCollapsed)

function onNavClick() {
  if (props.mobile) sidebar.closeMobile()
}

interface NavItem { labelKey: string; to: string; icon: LucideIcon }
interface NavGroup { titleKey: string; items: NavItem[] }

// Статичные группы (не пространства): создание и управление.
const groups = computed<NavGroup[]>(() => [
  { titleKey: 'navigation.create', items: [
    { labelKey: 'navigation.podcasts', to: '/podcasts', icon: Mic },
    { labelKey: 'navigation.reports', to: '/reports', icon: FileBarChart },
    { labelKey: 'navigation.plans', to: '/plans', icon: ClipboardList },
  ]},
  { titleKey: 'navigation.manage', items: [
    { labelKey: 'navigation.models', to: '/settings/api-keys', icon: Bot },
    { labelKey: 'navigation.transformations', to: '/transformations', icon: Shuffle },
    { labelKey: 'navigation.settings', to: '/settings', icon: Settings },
    { labelKey: 'navigation.advanced', to: '/advanced', icon: Wrench },
  ]},
])

// Иконка пространства хранится строкой (имя Lucide). Резолвим в компонент.
const ICONS: Record<string, LucideIcon> = {
  Bookmark, Search, Activity, FileText, StickyNote, Archive, Folder, Book,
  LayoutDashboard,
}
function spaceIcon(space: Space): LucideIcon {
  return (space.icon && ICONS[space.icon]) || Folder
}

// Дефолтные пространства ведут на существующие вьюхи по slug; проекты и остальные —
// на обобщённую страницу пространства /space/:id.
const SLUG_ROUTES: Record<string, string> = {
  shortcuts: '/notebooks',
  search: '/search',
  progress: '/progress',
  sources: '/sources',
  notes: '/notes',
  admin: '/admin',
}
function spaceTo(space: Space): string {
  if (space.slug && SLUG_ROUTES[space.slug]) return SLUG_ROUTES[space.slug]
  return `/space/${space.id}`
}

// --- Создание пространства (инлайн-инпут, без нативного prompt) ---
const creating = ref(false)
const newName = ref('')
const createInput = ref<HTMLInputElement | null>(null)

async function startCreate() {
  creating.value = true
  await nextTick()
  createInput.value?.focus()
}
function cancelCreate() {
  creating.value = false
  newName.value = ''
}
async function submitCreate() {
  const name = newName.value.trim()
  if (!name) return cancelCreate()
  await spaces.create(name)
  cancelCreate()
}

// --- Удаление (двухшаговое подтверждение, без нативного confirm) ---
const confirmingId = ref<string | null>(null)
function askDelete(id: string) {
  confirmingId.value = id
}
function cancelDelete() {
  confirmingId.value = null
}
async function confirmDelete(id: string) {
  await spaces.remove(id)
  confirmingId.value = null
  // Если просматривали удалённое пространство — уводим на «Ячейки».
  if (route.name === 'space' && String(route.params.id) === id) {
    router.push('/notebooks')
  }
}

const themeIcon = computed(() =>
  theme.mode === 'dark' ? Moon : theme.mode === 'light' ? Sun : MonitorSmartphone,
)
</script>

<template>
  <aside
    :class="[
      'flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200',
      collapsed ? 'w-16' : 'w-64',
      props.class,
    ]"
  >
    <!-- Логотип / переключатель свёртки -->
    <div class="flex h-16 items-center gap-2 px-3">
      <BrainCircuit class="size-7 shrink-0 text-primary" />
      <span v-if="!collapsed" class="text-lg font-semibold tracking-tight">
        {{ t('common.appName') }}
      </span>
      <button
        v-if="!mobile"
        class="ml-auto rounded-md p-1.5 hover:bg-sidebar-accent"
        :aria-label="collapsed ? t('navigation.expand') : t('navigation.collapse')"
        @click="sidebar.toggle()"
      >
        <PanelLeftOpen v-if="collapsed" class="size-4" />
        <PanelLeftClose v-else class="size-4" />
      </button>
    </div>

    <!-- Навигация -->
    <nav class="flex-1 overflow-y-auto px-2 py-2">
      <!-- Пространства (data-driven): дефолтные + проекты + создание.
           Отдельного хаба «Ячейки» нет — «Ячейки» это дефолтное пространство
           (slug=shortcuts → /notebooks), чтобы не дублировать одну и ту же страницу. -->
      <div class="mb-4">
        <p
          v-if="!collapsed"
          class="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          {{ t('spaces.title') }}
        </p>
        <ul class="space-y-1">
          <li v-for="space in spaces.visible" :key="space.id" class="group relative">
            <Tooltip :label="space.name" :disabled="!collapsed">
              <RouterLink
                :to="spaceTo(space)"
                class="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent"
                active-class="bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                :class="collapsed ? 'justify-center' : ''"
                @click="onNavClick"
              >
                <component :is="spaceIcon(space)" class="size-4 shrink-0" />
                <span v-if="!collapsed" class="truncate">{{ space.name }}</span>
              </RouterLink>
            </Tooltip>

            <!-- Удаление (только для removable, в развёрнутом виде) -->
            <template v-if="!collapsed && space.removable">
              <div
                v-if="confirmingId === space.id"
                class="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1"
              >
                <button
                  class="rounded p-1 text-destructive hover:bg-destructive/10"
                  :aria-label="t('common.delete')"
                  @click.prevent="confirmDelete(space.id)"
                >
                  <Check class="size-3.5" />
                </button>
                <button
                  class="rounded p-1 text-muted-foreground hover:bg-sidebar-accent"
                  :aria-label="t('common.cancel')"
                  @click.prevent="cancelDelete()"
                >
                  <X class="size-3.5" />
                </button>
              </div>
              <button
                v-else
                class="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-sidebar-accent group-hover:opacity-100"
                :aria-label="t('spaces.delete')"
                @click.prevent="askDelete(space.id)"
              >
                <Trash2 class="size-3.5" />
              </button>
            </template>
          </li>

          <!-- Создание пространства -->
          <li>
            <div v-if="creating && !collapsed" class="px-1 py-1">
              <input
                ref="createInput"
                v-model="newName"
                :placeholder="t('spaces.newSpacePrompt')"
                class="w-full rounded-md border bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                @keyup.enter="submitCreate"
                @keyup.esc="cancelCreate"
                @blur="submitCreate"
              />
            </div>
            <Tooltip v-else :label="t('spaces.create')" :disabled="!collapsed">
              <button
                class="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                :class="collapsed ? 'justify-center' : ''"
                @click="startCreate"
              >
                <Plus class="size-4 shrink-0" />
                <span v-if="!collapsed">{{ t('spaces.create') }}</span>
              </button>
            </Tooltip>
          </li>
        </ul>
      </div>

      <!-- Статичные группы -->
      <div v-for="group in groups" :key="group.titleKey" class="mb-4">
        <p
          v-if="!collapsed"
          class="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          {{ t(group.titleKey) }}
        </p>
        <ul class="space-y-1">
          <li v-for="item in group.items" :key="item.to">
            <Tooltip :label="t(item.labelKey)" :disabled="!collapsed">
              <RouterLink
                :to="item.to"
                class="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent"
                active-class="bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                :class="collapsed ? 'justify-center' : ''"
                @click="onNavClick"
              >
                <component :is="item.icon" class="size-4 shrink-0" />
                <span v-if="!collapsed">{{ t(item.labelKey) }}</span>
              </RouterLink>
            </Tooltip>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Низ: тема, язык и Dev Mode -->
    <div class="border-t p-2" :class="collapsed ? 'space-y-1' : ''">
      <div :class="collapsed ? 'space-y-1' : 'flex gap-1'">
        <Tooltip :label="t('navigation.theme')" :disabled="!collapsed">
          <button
            class="flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent"
            @click="theme.toggle()"
          >
            <component :is="themeIcon" class="size-4" />
            <span v-if="!collapsed">{{ t(`common.${theme.mode}`) }}</span>
          </button>
        </Tooltip>
        <Tooltip :label="t('navigation.language')" :disabled="!collapsed">
          <button
            class="flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent"
            @click="locale.toggle()"
          >
            <Languages class="size-4" />
            <span v-if="!collapsed">{{ locale.current === 'ru-RU' ? 'RU' : 'EN' }}</span>
          </button>
        </Tooltip>
      </div>
      <div class="mt-1">
        <DevModeToggle :icon-only="collapsed" />
      </div>
    </div>
  </aside>
</template>
