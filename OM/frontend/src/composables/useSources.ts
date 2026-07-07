import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, unref, type MaybeRef } from 'vue'
import {
  listSources,
  getSource,
  createSource,
  updateSource,
  deleteSource,
  getSourceInsights,
} from '@/api/sources'
import { isSourcePending } from '@/types/source'
import type { CreateSourceForm, UpdateSourceRequest, SourceListItem } from '@/types/source'

export const sourceKeys = {
  all: ['sources'] as const,
  list: (notebookId: string) => [...sourceKeys.all, 'list', notebookId] as const,
  detail: (id: string) => [...sourceKeys.all, 'detail', id] as const,
  insights: (id: string) => [...sourceKeys.all, 'insights', id] as const,
}

// Список источников ячейки. Пока есть хоть один источник в обработке — опрашиваем каждые 3 с.
export function useSources(notebookId: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => sourceKeys.list(unref(notebookId))),
    queryFn: () => listSources(unref(notebookId)),
    enabled: computed(() => !!unref(notebookId)),
    refetchInterval: (query) => {
      const data = query.state.data as SourceListItem[] | undefined
      return data?.some((s) => isSourcePending(s.status)) ? 3000 : false
    },
  })
}

export function useSource(id: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => sourceKeys.detail(unref(id))),
    queryFn: () => getSource(unref(id)),
    enabled: computed(() => !!unref(id)),
  })
}

export function useSourceInsights(id: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => sourceKeys.insights(unref(id))),
    queryFn: () => getSourceInsights(unref(id)),
    enabled: computed(() => !!unref(id)),
  })
}

export function useCreateSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: CreateSourceForm) => createSource(form),
    onSuccess: (_data, form) => {
      qc.invalidateQueries({ queryKey: sourceKeys.list(form.notebook_id) })
    },
  })
}

export function useUpdateSource(notebookId: MaybeRef<string>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSourceRequest }) => updateSource(id, body),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: sourceKeys.list(unref(notebookId)) })
      qc.invalidateQueries({ queryKey: sourceKeys.detail(updated.id) })
    },
  })
}

export function useDeleteSource(notebookId: MaybeRef<string>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSource(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: sourceKeys.list(unref(notebookId)) }),
  })
}
