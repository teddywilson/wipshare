import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'

// Get project members and invitations
export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')
      const data = await apiClient.get(`/projects/${projectId}/members`)
      console.log('API Response for members:', data)
      return data
    },
    enabled: !!projectId,
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  })
}

// Invite member to project
export function useInviteProjectMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, email, role }: { projectId: string; email: string; role: string }) => {
      const data = await apiClient.post(`/projects/${projectId}/members/invite`, {
        email,
        role
      })
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] })
      toast.success('Invitation sent successfully')
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to send invitation'
      toast.error(message)
    }
  })
}

// Update member role
export function useUpdateProjectMemberRole() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, memberId, role }: { projectId: string; memberId: string; role: string }) => {
      const response = await apiClient.patch(`/projects/${projectId}/members/${memberId}/role`, {
        role
      })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] })
      toast.success('Member role updated')
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to update member role'
      toast.error(message)
    }
  })
}

// Remove member from project
export function useRemoveProjectMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, memberId }: { projectId: string; memberId: string }) => {
      const response = await apiClient.delete(`/projects/${projectId}/members/${memberId}`)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] })
      toast.success('Member removed from project')
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to remove member'
      toast.error(message)
    }
  })
}

// Cancel invitation
export function useCancelProjectInvitation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, invitationId }: { projectId: string; invitationId: string }) => {
      const response = await apiClient.delete(`/projects/${projectId}/invitations/${invitationId}`)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] })
      toast.success('Invitation cancelled')
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to cancel invitation'
      toast.error(message)
    }
  })
}

// Accept invitation
export function useAcceptProjectInvitation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (token: string) => {
      const response = await apiClient.post(`/projects/invitations/${token}/accept`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}

// Resend invitation
export function useResendProjectInvitation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, invitationId }: { projectId: string; invitationId: string }) => {
      const response = await apiClient.post(`/projects/${projectId}/invitations/${invitationId}/resend`)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] })
      toast.success('Invitation resent')
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to resend invitation'
      toast.error(message)
    }
  })
}

// Get invitation details
export function useProjectInvitationDetails(token: string | undefined) {
  return useQuery({
    queryKey: ['project-invitation', token],
    queryFn: async () => {
      if (!token) throw new Error('Invitation token is required')
      const data = await apiClient.get(`/projects/invitations/${token}`)
      console.log('Invitation details response:', data)
      return data
    },
    enabled: !!token,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always'
  })
}