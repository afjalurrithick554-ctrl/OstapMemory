import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AppShell from '@/layout/AppShell.vue'
import PagePlaceholder from '@/views/PagePlaceholder.vue'
import { useAuthStore } from '@/stores/auth'

// Заглушки на все роуты из плана. Реальные страницы — в следующих фазах.
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: AppShell,
    children: [
      { path: '', redirect: '/notebooks' },
      { path: 'notebooks', name: 'notebooks', component: () => import('@/views/NotebooksView.vue') },
      { path: 'notebooks/:id', name: 'notebook-detail', component: () => import('@/views/NotebookDetailView.vue') },
      { path: 'space/:id', name: 'space', component: () => import('@/views/SpaceView.vue') },
      { path: 'sources', name: 'sources', component: () => import('@/views/SourcesView.vue') },
      { path: 'notes', name: 'notes', component: () => import('@/views/NotesView.vue') },
      { path: 'sources/:id', name: 'source-detail', component: () => import('@/views/SourceDetailView.vue') },
      { path: 'search', name: 'search', component: () => import('@/views/SearchView.vue') },
      { path: 'progress', name: 'progress', component: () => import('@/views/ProgressView.vue') },
      { path: 'admin', name: 'admin', component: () => import('@/views/AdminView.vue') },
      { path: 'podcasts', name: 'podcasts', component: () => import('@/views/PodcastsView.vue') },
      { path: 'settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
      { path: 'settings/api-keys', name: 'api-keys', component: () => import('@/views/ApiKeysView.vue') },
      { path: 'transformations', name: 'transformations', component: () => import('@/views/TransformationsView.vue') },
      { path: 'reports', name: 'reports', component: PagePlaceholder, props: { titleKey: 'navigation.reports' } },
      { path: 'plans', name: 'plans', component: PagePlaceholder, props: { titleKey: 'navigation.plans' } },
      { path: 'advanced', name: 'advanced', component: PagePlaceholder, props: { titleKey: 'navigation.advanced' } },
    ],
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { public: true },
  },
  { path: '/:pathMatch(.*)*', redirect: '/notebooks' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Guard: если бэкенд требует пароль и пользователь не аутентифицирован — на /login.
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (auth.authRequired === null) {
    try {
      await auth.checkAuthRequired()
    } catch {
      // Бэкенд недоступен. На публичные роуты пускаем (там покажем ошибку связи).
      if (to.meta.public) return true
      return { name: 'login' }
    }
  }

  // Пароль не требуется — пускаем везде, /login уводим внутрь.
  if (!auth.authRequired) {
    if (to.name === 'login') return { name: 'notebooks' }
    return true
  }

  // Пароль требуется.
  if (to.meta.public) {
    if (auth.isAuthenticated && to.name === 'login') return { name: 'notebooks' }
    return true
  }
  if (!auth.isAuthenticated) return { name: 'login' }
  return true
})
