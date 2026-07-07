import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, unref, type MaybeRef } from 'vue'
import { listNotes, createNote, updateNote, deleteNote } from '@/api/notes'
import type { CreateNoteRequest, UpdateNoteRequest } from '@/types/note'

export const noteKeys = {
  all: ['notes'] as const,
  list: (notebookId: string) => [...noteKeys.all, 'list', notebookId] as const,
}

export function useNotes(notebookId: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => noteKeys.list(unref(notebookId))),
    queryFn: () => listNotes(unref(notebookId)),
    enabled: computed(() => !!unref(notebookId)),
  })
}

export function useCreateNote(notebookId: MaybeRef<string>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateNoteRequest) => createNote(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: noteKeys.list(unref(notebookId)) }),
  })
}

export function useUpdateNote(notebookId: MaybeRef<string>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateNoteRequest }) => updateNote(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: noteKeys.list(unref(notebookId)) }),
  })
}

export function useDeleteNote(notebookId: MaybeRef<string>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: noteKeys.list(unref(notebookId)) }),
  })
}
