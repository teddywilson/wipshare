import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'

// Query keys factory
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: any) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  currentUser: () => [...userKeys.all, 'current'] as const,
  search: (query: string, limit?: number) => [...userKeys.all, 'search', { query, limit }] as const,
  followers: (userId: string, page: number, limit: number) => [...userKeys.all, 'followers', userId, { page, limit }] as const,
  following: (userId: string, page: number, limit: number) => [...userKeys.all, 'following', userId, { page, limit }] as const,
  followRequests: (page: number, limit: number) => [...userKeys.all, 'follow-requests', { page, limit }] as const,
  usageStats: () => [...userKeys.all, 'usage-stats'] as const,
}

// Get current user
export const useCurrentUser = () => {
  return useQuery({
    queryKey: userKeys.currentUser(),
    queryFn: () => apiClient.getCurrentUser(),
    staleTime: 5 * 60 * 1000, // Current user data is fresh for 5 minutes
  })
}

// Get user profile by ID
export const useUserProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: userKeys.detail(userId!),
    queryFn: () => apiClient.getUserProfile(userId!),
    enabled: !!userId,
  })
}

// Search users
export const useSearchUsers = (query: string, limit: number = 10) => {
  return useQuery({
    queryKey: userKeys.search(query, limit),
    queryFn: () => apiClient.searchUsers(query, limit),
    enabled: query.length > 0,
    staleTime: 30 * 1000, // Search results are fresh for 30 seconds
  })
}

// Get user followers
export const useUserFollowers = (userId: string | undefined, page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: userKeys.followers(userId!, page, limit),
    queryFn: () => apiClient.getUserFollowers(userId!, page, limit),
    enabled: !!userId,
  })
}

// Get user following
export const useUserFollowing = (userId: string | undefined, page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: userKeys.following(userId!, page, limit),
    queryFn: () => apiClient.getUserFollowing(userId!, page, limit),
    enabled: !!userId,
  })
}

// Get pending follow requests
export const usePendingFollowRequests = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: userKeys.followRequests(page, limit),
    queryFn: () => apiClient.getPendingFollowRequests(page, limit),
  })
}

// Get usage stats
export const useUsageStats = () => {
  return useQuery({
    queryKey: userKeys.usageStats(),
    queryFn: () => apiClient.getUsageStats(),
    staleTime: 60 * 1000, // Usage stats are fresh for 1 minute
  })
}

// Create user profile mutation
export const useCreateUserProfile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { username: string; displayName?: string }) => 
      apiClient.createUserProfile(data),
    onSuccess: () => {
      // Invalidate current user data
      queryClient.invalidateQueries({ queryKey: userKeys.currentUser() })
    },
  })
}

// Send follow request mutation
export const useSendFollowRequest = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (userId: string) => apiClient.sendFollowRequest(userId),
    onSuccess: (data, userId) => {
      // Invalidate user details and follow-related queries
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) })
      queryClient.invalidateQueries({ queryKey: userKeys.followRequests(1, 20) })
    },
  })
}

// Unfollow user mutation
export const useUnfollowUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (userId: string) => apiClient.unfollowUser(userId),
    onSuccess: (data, userId) => {
      // Invalidate user details and follow-related queries
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) })
      queryClient.invalidateQueries({ queryKey: userKeys.following(userId, 1, 20) })
    },
  })
}

// Respond to follow request mutation
export const useRespondToFollowRequest = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: 'approve' | 'reject' }) => 
      apiClient.respondToFollowRequest(requestId, action),
    onSuccess: () => {
      // Invalidate follow requests
      queryClient.invalidateQueries({ queryKey: userKeys.followRequests(1, 20) })
    },
  })
}