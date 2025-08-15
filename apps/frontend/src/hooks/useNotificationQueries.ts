import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'

// Query keys factory
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: any) => [...notificationKeys.lists(), { filters }] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
}

// Get notifications
export const useNotifications = (
  page: number = 1, 
  limit: number = 20, 
  unreadOnly: boolean = false
) => {
  return useQuery({
    queryKey: notificationKeys.list({ page, limit, unreadOnly }),
    queryFn: () => apiClient.getNotifications(page, limit, unreadOnly),
    staleTime: 30 * 1000, // Notifications are fresh for 30 seconds
  })
}

// Get unread notification count
export const useUnreadNotificationCount = () => {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => apiClient.getUnreadNotificationCount(),
    staleTime: 15 * 1000, // Unread count is fresh for 15 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  })
}

// Mark notification as read mutation
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (notificationId: string) => apiClient.markNotificationAsRead(notificationId),
    onSuccess: () => {
      // Invalidate notifications and unread count
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

// Mark all notifications as read mutation
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => apiClient.markAllNotificationsAsRead(),
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}