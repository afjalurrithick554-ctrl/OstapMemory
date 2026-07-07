import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  listTransformations,
  createTransformation,
  updateTransformation,
  deleteTransformation,
  executeTransformation,
  getDefaultPrompt,
  updateDefaultPrompt,
} from '@/api/transformations'
import type { TransformationCreate, TransformationUpdate, DefaultPrompt } from '@/types/transformation'

const keys = {
  all: ['transformations'] as const,
  defaultPrompt: ['transformations', 'default-prompt'] as const,
}

export function useTransformations() {
  return useQuery({ queryKey: keys.all, queryFn: () => listTransformations() })
}

export function useCreateTransformation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: TransformationCreate) => createTransformation(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

export function useUpdateTransformation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TransformationUpdate }) => updateTransformation(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

export function useDeleteTransformation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTransformation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  })
}

export function useExecuteTransformation() {
  return useMutation({ mutationFn: executeTransformation })
}

export function useDefaultPrompt() {
  return useQuery({ queryKey: keys.defaultPrompt, queryFn: () => getDefaultPrompt() })
}

export function useUpdateDefaultPrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: DefaultPrompt) => updateDefaultPrompt(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.defaultPrompt }),
  })
}
