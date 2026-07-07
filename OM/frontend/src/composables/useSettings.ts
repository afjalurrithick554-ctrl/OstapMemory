import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { getSettings, updateSettings, type AppSettings } from '@/api/settings'

const key = ['settings'] as const

export function useSettings() {
  return useQuery({ queryKey: key, queryFn: () => getSettings() })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AppSettings) => updateSettings(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
}
