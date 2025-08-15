import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'

// Query keys factory
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: any) => [...projectKeys.lists(), { filters }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  userProjects: (page: number, limit: number) => [...projectKeys.all, 'user', { page, limit }] as const,
  members: (id: string) => [...projectKeys.detail(id), 'members'] as const,
  invitations: (id: string) => [...projectKeys.detail(id), 'invitations'] as const,
}

// Get user's projects
export const useUserProjects = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: projectKeys.userProjects(page, limit),
    queryFn: () => apiClient.getUserProjects(page, limit),
  })
}

// Get single project
export const useProject = (projectId: string | undefined) => {
  return useQuery({
    queryKey: projectKeys.detail(projectId!),
    queryFn: () => apiClient.getProject(projectId!),
    enabled: !!projectId,
  })
}

// Create project mutation
export const useCreateProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { title: string; description?: string; type?: string; isPublic?: boolean }) => 
      apiClient.createProject(data),
    onSuccess: () => {
      // Invalidate all project queries
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

// Update project mutation
export const useUpdateProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, data }: { 
      projectId: string; 
      data: { title?: string; description?: string; type?: string; isPublic?: boolean } 
    }) => apiClient.updateProject(projectId, data),
    onSuccess: (data, variables) => {
      // Invalidate specific project and lists
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

// Delete project mutation
export const useDeleteProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (projectId: string) => apiClient.deleteProject(projectId),
    onSuccess: () => {
      // Invalidate all project queries
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

// Update project image mutation
export const useUpdateProjectImage = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, formData }: { projectId: string; formData: FormData }) =>
      apiClient.updateProjectImage(projectId, formData),
    onSuccess: (data, variables) => {
      // Invalidate project details and lists
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

// Add track to project mutation
export const useAddTrackToProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, trackId }: { projectId: string; trackId: string }) =>
      apiClient.addTrackToProject(projectId, trackId),
    onSuccess: (data, variables) => {
      // Invalidate project details and track details
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: ['tracks', 'detail', variables.trackId] })
    },
  })
}

// Remove track from project mutation
export const useRemoveTrackFromProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, trackId }: { projectId: string; trackId: string }) =>
      apiClient.removeTrackFromProject(projectId, trackId),
    onSuccess: (data, variables) => {
      // Invalidate project details and track details
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: ['tracks', 'detail', variables.trackId] })
    },
  })
}

// Reorder project tracks mutation
export const useReorderProjectTracks = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, trackOrder }: { projectId: string; trackOrder: string[] }) =>
      apiClient.reorderProjectTracks(projectId, trackOrder),
    onSuccess: (data, variables) => {
      // Invalidate project details
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) })
    },
  })
}

// Project member management hooks

// Get project members
export const useProjectMembers = (projectId: string | undefined) => {
  return useQuery({
    queryKey: projectKeys.members(projectId!),
    queryFn: () => apiClient.getProjectMembers(projectId!),
    enabled: !!projectId,
  })
}

// Get project invitations
export const useProjectInvitations = (projectId: string | undefined) => {
  return useQuery({
    queryKey: projectKeys.invitations(projectId!),
    queryFn: () => apiClient.getProjectInvitations(projectId!),
    enabled: !!projectId,
  })
}

// Invite project member mutation
export const useInviteProjectMember = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, data }: { 
      projectId: string; 
      data: { email: string; role?: string } 
    }) => apiClient.inviteProjectMember(projectId, data),
    onSuccess: (data, variables) => {
      // Invalidate invitations and members
      queryClient.invalidateQueries({ queryKey: projectKeys.invitations(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.members(variables.projectId) })
    },
  })
}

// Remove project member mutation
export const useRemoveProjectMember = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, memberId }: { projectId: string; memberId: string }) =>
      apiClient.removeProjectMember(projectId, memberId),
    onSuccess: (data, variables) => {
      // Invalidate members list
      queryClient.invalidateQueries({ queryKey: projectKeys.members(variables.projectId) })
    },
  })
}

// Update project member role mutation
export const useUpdateProjectMemberRole = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, memberId, role }: { 
      projectId: string; 
      memberId: string; 
      role: string 
    }) => apiClient.updateProjectMemberRole(projectId, memberId, role),
    onSuccess: (data, variables) => {
      // Invalidate members list
      queryClient.invalidateQueries({ queryKey: projectKeys.members(variables.projectId) })
    },
  })
}

// Cancel project invitation mutation
export const useCancelProjectInvitation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, invitationId }: { projectId: string; invitationId: string }) =>
      apiClient.cancelProjectInvitation(projectId, invitationId),
    onSuccess: (data, variables) => {
      // Invalidate invitations list
      queryClient.invalidateQueries({ queryKey: projectKeys.invitations(variables.projectId) })
    },
  })
}

// Resend project invitation mutation
export const useResendProjectInvitation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ projectId, invitationId }: { projectId: string; invitationId: string }) =>
      apiClient.resendProjectInvitation(projectId, invitationId),
    onSuccess: (data, variables) => {
      // Invalidate invitations list
      queryClient.invalidateQueries({ queryKey: projectKeys.invitations(variables.projectId) })
    },
  })
}