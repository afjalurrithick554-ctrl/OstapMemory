import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  listModels,
  getDefaultModels,
  updateDefaultModels,
  createModel,
  deleteModel,
  testModel,
  getProviders,
  type DefaultModels,
  type CreateModelRequest,
} from '@/api/models'

export function useLanguageModels() {
  return useQuery({
    queryKey: ['models', 'language'],
    queryFn: () => listModels('language'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useDefaultModels() {
  return useQuery({
    queryKey: ['models', 'defaults'],
    queryFn: () => getDefaultModels(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useModelsByType(type: string) {
  return useQuery({
    queryKey: ['models', type],
    queryFn: () => listModels(type),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAllModels() {
  return useQuery({ queryKey: ['models', 'all'], queryFn: () => listModels() })
}

export function useProviders() {
  return useQuery({ queryKey: ['models', 'providers'], queryFn: () => getProviders(), staleTime: 5 * 60 * 1000 })
}

export function useUpdateDefaultModels() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: DefaultModels) => updateDefaultModels(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['models'] }),
  })
}

export function useCreateModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateModelRequest) => createModel(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['models'] }),
  })
}

export function useDeleteModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteModel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['models'] }),
  })
}

export function useTestModel() {
  return useMutation({ mutationFn: (id: string) => testModel(id) })
}
