import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Space, UpdateSpaceRequest } from '@/types/space'
import * as spacesApi from '@/api/spaces'

export const useSpacesStore = defineStore('spaces', () => {
  const spaces = ref<Space[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  // Видимые в сайдбаре (скрытые, например Архив, исключаем), по порядку.
  const visible = computed(() =>
    [...spaces.value].filter((s) => !s.hidden).sort((a, b) => a.order - b.order),
  )
  const defaults = computed(() => visible.value.filter((s) => s.kind === 'default'))
  const projects = computed(() => visible.value.filter((s) => s.kind === 'project'))
  const archive = computed(() => spaces.value.find((s) => s.slug === 'archive') ?? null)

  async function load(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    error.value = null
    try {
      spaces.value = await spacesApi.listSpaces()
      loaded.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function create(name: string, icon?: string | null): Promise<Space> {
    const space = await spacesApi.createSpace({ name, icon })
    spaces.value.push(space)
    return space
  }

  async function remove(id: string): Promise<void> {
    await spacesApi.deleteSpace(id)
    spaces.value = spaces.value.filter((s) => s.id !== id)
  }

  async function update(id: string, body: UpdateSpaceRequest): Promise<Space> {
    const updated = await spacesApi.updateSpace(id, body)
    const i = spaces.value.findIndex((s) => s.id === id)
    if (i !== -1) spaces.value[i] = updated
    return updated
  }

  return { spaces, loading, loaded, error, visible, defaults, projects, archive, load, create, update, remove }
})
