<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  LayoutDashboard, Users, FolderKanban, ShieldCheck, SlidersHorizontal, ScrollText,
  Folder, ShieldOff, type LucideIcon,
} from 'lucide-vue-next'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import NotebookRow from '@/components/notebooks/NotebookRow.vue'
import { useNotebooks, useUpdateNotebook } from '@/composables/useNotebooks'
import { useSpacesStore } from '@/stores/spaces'
import { isArchived } from '@/lib/notebook'

// Админ-панель — дефолтное системное пространство. Собственная структура задаётся
// секциями ниже (каркас: сами разделы наполним в следующих фазах). Раздел
// «Системные настройки» уже наполнен: сюда попадают админские ячейки/задачи.
const { t } = useI18n()
const { data } = useNotebooks()
const update = useUpdateNotebook()
const spaces = useSpacesStore()
onMounted(() => spaces.load())

// Снять админку: ячейка/задача возвращается в общие места (Ячейки, доска проекта)
// с сохранением привязки к пространству (space_id не трогаем).
function unmakeAdmin(id: string) {
  update.mutate({ id, body: { is_admin: false } })
}

interface AdminSection {
  key: string
  icon: LucideIcon
}

const sections = computed<AdminSection[]>(() => [
  { key: 'users', icon: Users },
  { key: 'spaces', icon: FolderKanban },
  { key: 'access', icon: ShieldCheck },
  { key: 'logs', icon: ScrollText },
])

// Админские ячейки: активные (не архивные), сгруппированы по проекту (space = проект),
// связь с пространством сохраняется при переводе в админ. Проект берём по space_id.
const adminCells = computed(() => (data.value ?? []).filter((n) => n.is_admin && !isArchived(n)))

interface AdminGroup {
  key: string
  name: string
  items: typeof adminCells.value
}

const adminGroups = computed<AdminGroup[]>(() => {
  const bySpace = new Map<string, AdminGroup>()
  for (const n of adminCells.value) {
    const key = n.space_id ?? '__none__'
    if (!bySpace.has(key)) {
      const space = n.space_id ? spaces.spaces.find((s) => s.id === n.space_id) ?? null : null
      bySpace.set(key, {
        key,
        name: space?.name ?? t('admin.sections.settings.noProject'),
        items: [],
      })
    }
    bySpace.get(key)!.items.push(n)
  }
  return [...bySpace.values()].sort((a, b) => a.name.localeCompare(b.name))
})
</script>

<template>
  <div class="mx-auto max-w-6xl p-6">
    <div class="mb-2 flex items-center gap-3">
      <LayoutDashboard class="size-6 shrink-0 text-primary" />
      <h1 class="text-2xl font-semibold tracking-tight">{{ t('admin.title') }}</h1>
    </div>
    <p class="mb-6 text-sm text-muted-foreground">{{ t('admin.subtitle') }}</p>

    <!-- Системные настройки: сюда попадают админские ячейки/задачи, сгруппированные
         по проекту (пространству). Переход сохраняет привязку к пространству. -->
    <Card class="mb-6 flex flex-col gap-4 p-4">
      <div class="flex items-center gap-3">
        <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <SlidersHorizontal class="size-4 text-foreground" />
        </div>
        <div>
          <h2 class="font-medium">{{ t('admin.sections.settings.title') }}</h2>
          <p class="text-sm text-muted-foreground">{{ t('admin.sections.settings.desc') }}</p>
        </div>
        <Badge variant="secondary" class="ml-auto">{{ adminCells.length }}</Badge>
      </div>

      <p v-if="adminCells.length === 0" class="text-sm text-muted-foreground">
        {{ t('admin.sections.settings.empty') }}
      </p>

      <div v-else class="space-y-4">
        <div v-for="g in adminGroups" :key="g.key" class="space-y-2">
          <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Folder class="size-3.5" />{{ g.name }}
          </div>
          <div class="space-y-2">
            <div v-for="n in g.items" :key="n.id" class="flex items-center gap-2">
              <div class="min-w-0 flex-1">
                <NotebookRow :notebook="n" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                class="shrink-0 gap-1"
                :title="t('notebooks.unmakeAdmin')"
                @click="unmakeAdmin(n.id)"
              >
                <ShieldOff class="size-4" />{{ t('notebooks.unmakeAdmin') }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="s in sections" :key="s.key" class="flex flex-col gap-2 p-4">
        <div class="flex items-center gap-3">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <component :is="s.icon" class="size-4 text-foreground" />
          </div>
          <h2 class="font-medium">{{ t(`admin.sections.${s.key}.title`) }}</h2>
          <Badge variant="secondary" class="ml-auto">{{ t('admin.soon') }}</Badge>
        </div>
        <p class="text-sm text-muted-foreground">{{ t(`admin.sections.${s.key}.desc`) }}</p>
      </Card>
    </div>
  </div>
</template>
