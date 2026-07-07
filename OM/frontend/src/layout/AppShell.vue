<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Menu, BrainCircuit } from 'lucide-vue-next'
import AppSidebar from './AppSidebar.vue'
import TaskColumn from '@/components/notebooks/TaskColumn.vue'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import ConnectionGuard from '@/components/common/ConnectionGuard.vue'
import DevModeOverlay from '@/components/dev/DevModeOverlay.vue'
import CommandPalette from '@/components/common/CommandPalette.vue'
import { useSidebarStore } from '@/stores/sidebar'

const { t } = useI18n()
const sidebar = useSidebarStore()
const route = useRoute()

// Правая колонка задач присутствует на страницах-пространствах (не в управлении).
const SPACE_ROUTES = new Set(['notebooks', 'progress', 'space', 'search', 'sources', 'notes'])
const showTaskColumn = computed(() => SPACE_ROUTES.has(String(route.name)))
</script>

<template>
  <ErrorBoundary>
    <ConnectionGuard>
      <div class="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <!-- Сайдбар: статичный на десктопе (md+) -->
        <AppSidebar class="hidden md:flex" />

        <!-- Мобильный drawer -->
        <div v-if="sidebar.mobileOpen" class="fixed inset-0 z-40 md:hidden">
          <div class="absolute inset-0 bg-black/50" @click="sidebar.closeMobile()" />
          <AppSidebar mobile class="relative z-50" />
        </div>

        <div class="flex flex-1 flex-col overflow-hidden">
          <!-- Мобильная верхняя панель с гамбургером -->
          <header class="flex h-14 shrink-0 items-center gap-2 border-b px-3 md:hidden">
            <button
              class="rounded-md p-1.5 hover:bg-accent"
              :aria-label="t('navigation.expand')"
              @click="sidebar.openMobile()"
            >
              <Menu class="size-5" />
            </button>
            <BrainCircuit class="size-6 text-primary" />
            <span class="text-base font-semibold tracking-tight">{{ t('common.appName') }}</span>
          </header>

          <main class="flex-1 overflow-y-auto">
            <!-- key по пути: при переходе между ячейками (одинаковый компонент, разный :id)
                 представление полностью пересоздаётся — иначе остаётся устаревшее состояние
                 (например, чек-лист родителя при заходе в подзадачу, пропадавший после F5). -->
            <RouterView v-slot="{ Component, route: r }">
              <component :is="Component" :key="r.path" />
            </RouterView>
          </main>
        </div>

        <!-- Правая колонка задач: только на страницах-пространствах, на десктопе -->
        <TaskColumn v-if="showTaskColumn" class="hidden md:flex" />
      </div>

      <!-- Глобальные слои -->
      <DevModeOverlay />
      <CommandPalette />
    </ConnectionGuard>
  </ErrorBoundary>
</template>
