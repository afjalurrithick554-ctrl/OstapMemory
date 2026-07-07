import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  listCredentials,
  createCredential,
  updateCredential,
  deleteCredential,
  testCredential,
  discoverModels,
  registerModels,
  type CreateCredentialRequest,
  type UpdateCredentialRequest,
  type RegisterModelData,
} from '@/api/credentials'

const key = ['credentials'] as const

export function useCredentials() {
  return useQuery({ queryKey: key, queryFn: () => listCredentials() })
}

export function useCreateCredential() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateCredentialRequest) => createCredential(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useUpdateCredential() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCredentialRequest }) => updateCredential(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useDeleteCredential() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCredential(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useTestCredential() {
  return useMutation({ mutationFn: (id: string) => testCredential(id) })
}

export function useDiscoverModels() {
  return useMutation({ mutationFn: (id: string) => discoverModels(id) })
}

export function useRegisterModels() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, models }: { id: string; models: RegisterModelData[] }) => registerModels(id, models),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key })
      qc.invalidateQueries({ queryKey: ['models'] })
    },
  })
}
