import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'

export const usageKeys = {
  all: ['usage'] as const,
  stats: () => [...usageKeys.all, 'stats'] as const,
}

export interface UsageStats {
  storageUsed: number
  storageLimit: number
  tracksCount: number
  tracksLimit: number
}

export const useUsageStats = () => {
  return useQuery({
    queryKey: usageKeys.stats(),
    queryFn: () => apiClient.getUsageStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}