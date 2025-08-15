import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { usageKeys } from './useUsageQueries'

// Query keys factory
export const trackKeys = {
  all: ['tracks'] as const,
  lists: () => [...trackKeys.all, 'list'] as const,
  list: (filters: any) => [...trackKeys.lists(), { filters }] as const,
  userTracks: () => [...trackKeys.all, 'user'] as const,
  details: () => [...trackKeys.all, 'detail'] as const,
  detail: (id: string) => [...trackKeys.details(), id] as const,
  versions: (id: string) => [...trackKeys.all, 'versions', id] as const,
  comments: (id: string) => [...trackKeys.all, 'comments', id] as const,
}

// Get user's tracks
export const useUserTracks = () => {
  return useQuery({
    queryKey: trackKeys.userTracks(),
    queryFn: () => apiClient.getTracks(),
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  })
}

// Fetch track details
export const useTrack = (trackId: string | undefined) => {
  return useQuery({
    queryKey: trackKeys.detail(trackId!),
    queryFn: () => apiClient.getTrack(trackId!),
    enabled: !!trackId,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  })
}

// Fetch track versions
export const useTrackVersions = (trackId: string | undefined) => {
  return useQuery({
    queryKey: trackKeys.versions(trackId!),
    queryFn: () => apiClient.getTrackVersions(trackId!),
    enabled: !!trackId,
  })
}

// Fetch track comments
export const useTrackComments = (trackId: string | undefined) => {
  return useQuery({
    queryKey: trackKeys.comments(trackId!),
    queryFn: () => apiClient.getTrackComments(trackId!),
    enabled: !!trackId,
  })
}

// Update track mutation
export const useUpdateTrack = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.updateTrack(id, data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch track details
      queryClient.invalidateQueries({ queryKey: trackKeys.detail(variables.id) })
      // Also invalidate the track lists
      queryClient.invalidateQueries({ queryKey: trackKeys.userTracks() })
      queryClient.invalidateQueries({ queryKey: trackKeys.lists() })
    },
  })
}

// Delete track mutation
export const useDeleteTrack = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteTrack(id),
    onSuccess: () => {
      // Invalidate all track queries
      queryClient.invalidateQueries({ queryKey: trackKeys.all })
    },
  })
}

// Pin track version mutation
export const usePinTrackVersion = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ trackId, versionId }: { trackId: string; versionId: string }) =>
      apiClient.pinTrackVersion(trackId, versionId),
    onSuccess: (data, variables) => {
      // Invalidate both track details and versions
      queryClient.invalidateQueries({ queryKey: trackKeys.detail(variables.trackId) })
      queryClient.invalidateQueries({ queryKey: trackKeys.versions(variables.trackId) })
    },
  })
}

// Upload track version mutation
export const useUploadTrackVersion = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ trackId, formData }: { trackId: string; formData: FormData }) =>
      apiClient.uploadTrackVersion(trackId, formData),
    onSuccess: (data, variables) => {
      // Invalidate track details and versions
      queryClient.invalidateQueries({ queryKey: trackKeys.detail(variables.trackId) })
      queryClient.invalidateQueries({ queryKey: trackKeys.versions(variables.trackId) })
    },
  })
}

// Update track image mutation
export const useUpdateTrackImage = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      apiClient.updateTrackImage(id, formData),
    onSuccess: (data, variables) => {
      // Invalidate track details
      queryClient.invalidateQueries({ queryKey: trackKeys.detail(variables.id) })
      // Also invalidate lists to update thumbnails
      queryClient.invalidateQueries({ queryKey: trackKeys.userTracks() })
      queryClient.invalidateQueries({ queryKey: trackKeys.lists() })
    },
  })
}

// Add comment mutation
export const useAddTrackComment = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ trackId, data }: { trackId: string; data: any }) =>
      apiClient.addTrackComment(trackId, data),
    onSuccess: (data, variables) => {
      // Invalidate comments list
      queryClient.invalidateQueries({ queryKey: trackKeys.comments(variables.trackId) })
    },
  })
}

// Delete comment mutation
export const useDeleteTrackComment = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ trackId, commentId }: { trackId: string; commentId: string }) =>
      apiClient.deleteTrackComment(trackId, commentId),
    onSuccess: (data, variables) => {
      // Invalidate comments list
      queryClient.invalidateQueries({ queryKey: trackKeys.comments(variables.trackId) })
    },
  })
}

// Create track mutation
export const useCreateTrack = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (formData: FormData) => apiClient.uploadTrack(formData),
    onSuccess: () => {
      // Invalidate tracks list and usage stats
      queryClient.invalidateQueries({ queryKey: trackKeys.userTracks() })
      queryClient.invalidateQueries({ queryKey: usageKeys.stats() })
    },
  })
}