import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, unref, type MaybeRef } from 'vue'
import {
  listNotebooks,
  getNotebook,
  createNotebook,
  updateNotebook,
  getNotebookChildren,
  deleteNotebook,
} from '@/api/notebooks'
import type { CreateNotebookRequest, UpdateNotebookRequest } from '@/types/notebook'

export const notebookKeys = {
  all: ['notebooks'] as const,
  list: () => [...notebookKeys.all, 'list'] as const,
  detail: (id: string) => [...notebookKeys.all, 'detail', id] as const,
  children: (id: string) => [...notebookKeys.all, 'children', id] as const,
}

export function useNotebooks() {
  return useQuery({
    queryKey: notebookKeys.list(),
    queryFn: () => listNotebooks({ order_by: 'updated desc' }),
  })
}

export function useNotebook(id: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => notebookKeys.detail(unref(id))),
    queryFn: () => getNotebook(unref(id)),
    enabled: computed(() => !!unref(id)),
  })
}

export function useNotebookChildren(id: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => notebookKeys.children(unref(id))),
    queryFn: () => getNotebookChildren(unref(id)),
    enabled: computed(() => !!unref(id)),
  })
}

export function useCreateNotebook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateNotebookRequest) => createNotebook(body),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: notebookKeys.all })
      if (created.parent_id) {
        qc.invalidateQueries({ queryKey: notebookKeys.children(created.parent_id) })
      }
    },
  })
}

export function useUpdateNotebook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateNotebookRequest }) => updateNotebook(id, body),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: notebookKeys.detail(updated.id) })
      qc.invalidateQueries({ queryKey: notebookKeys.list() })
      if (updated.parent_id) {
        qc.invalidateQueries({ queryKey: notebookKeys.children(updated.parent_id) })
      }
    },
  })
}

export function useDeleteNotebook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, deleteSources }: { id: string; deleteSources?: boolean }) =>
      deleteNotebook(id, deleteSources),
    onSuccess: () => qc.invalidateQueries({ queryKey: notebookKeys.all }),
  })
}
