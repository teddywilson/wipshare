import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { type User } from 'firebase/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export class ApiClient {
  private client: AxiosInstance
  private currentUser: User | null = null
  private lastTokenTime: number = 0
  private tokenCache: string | null = null
  private connectionListeners: Set<(isConnected: boolean, message?: string) => void> = new Set()

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add request interceptor to include Firebase auth token
    this.client.interceptors.request.use(
      async (config) => {
        if (this.currentUser) {
          try {
            // Check if we need to refresh the token (older than 50 minutes)
            const now = Date.now()
            const shouldRefresh = now - this.lastTokenTime > 50 * 60 * 1000 // 50 minutes
            
            let token: string
            if (shouldRefresh || !this.tokenCache) {
              // Force refresh if token is old or we don't have one cached
              token = await this.currentUser.getIdToken(true)
              this.tokenCache = token
              this.lastTokenTime = now
            } else {
              // Use cached token if it's still fresh
              token = this.tokenCache
            }
            
            config.headers.Authorization = `Bearer ${token}`
          } catch (error) {
            console.error('Failed to get auth token:', error)
            // Clear cached token on error
            this.tokenCache = null
            this.lastTokenTime = 0
          }
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        // Notify listeners that connection is good
        this.notifyConnectionListeners(true)
        return response
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          console.warn('401 Unauthorized:', error.config?.url)
          
          // Check if this is a database connectivity issue
          const errorMessage = (error.response?.data as any)?.error || ''
          if (errorMessage.includes('database') || errorMessage.includes('connection')) {
            console.error('Server connection issue. Please try again in a moment.')
            this.notifyConnectionListeners(false, 'Server connection issue')
          } else {
            // Try to refresh the token once
            if (this.currentUser && !error.config?.headers?.['X-Token-Retry']) {
              console.log('Attempting to refresh token and retry...')
              try {
                const token = await this.currentUser.getIdToken(true)
                this.tokenCache = token
                this.lastTokenTime = Date.now()
                
                // Retry the request with the new token
                if (error.config) {
                  // Create a proper headers object
                  const headers = error.config.headers as any || {}
                  headers['Authorization'] = `Bearer ${token}`
                  headers['X-Token-Retry'] = 'true'
                  error.config.headers = headers
                  return this.client.request(error.config)
                }
              } catch (refreshError) {
                console.error('Token refresh failed:', refreshError)
                this.notifyConnectionListeners(false, 'Authentication expired')
                // Optionally redirect to login
                window.location.href = '/login'
              }
            } else {
              console.error('Authentication failed. Please sign in again.')
              this.notifyConnectionListeners(false, 'Authentication failed')
            }
          }
        } else if (error.response?.status === 500) {
          console.error('Server error. Please try again later.')
          this.notifyConnectionListeners(false, 'Server error')
        } else if (!error.response && error.code === 'ERR_NETWORK') {
          console.error('Network error. Please check your connection.')
          this.notifyConnectionListeners(false, 'Network error')
        }
        
        return Promise.reject(error)
      }
    )
  }

  // Connection status management
  private notifyConnectionListeners(isConnected: boolean, message?: string) {
    this.connectionListeners.forEach(listener => listener(isConnected, message))
  }

  onConnectionChange(listener: (isConnected: boolean, message?: string) => void) {
    this.connectionListeners.add(listener)
    return () => {
      this.connectionListeners.delete(listener)
    }
  }

  // Set the current user for auth
  setUser(user: User | null) {
    this.currentUser = user
    // Clear token cache when user changes
    this.tokenCache = null
    this.lastTokenTime = 0
    
    // If we have a user, immediately get a fresh token
    if (user) {
      user.getIdToken(true).then(token => {
        this.tokenCache = token
        this.lastTokenTime = Date.now()
      }).catch(error => {
        console.error('Failed to get initial token:', error)
      })
    }
  }

  // User endpoints
  async createUserProfile(data: { username: string; displayName?: string }) {
    const response = await this.client.post('/auth/profile', data)
    return response.data
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me')
    return response.data
  }

  async searchUsers(query: string, limit = 10) {
    const response = await this.client.get('/auth/search', {
      params: { q: query, limit }
    })
    return response.data.users || []
  }

  async getUserProfile(userId: string) {
    const response = await this.client.get(`/users/${userId}`)
    return response.data
  }

  async sendFollowRequest(userId: string) {
    const response = await this.client.post(`/users/${userId}/follow`)
    return response.data
  }

  async unfollowUser(userId: string) {
    const response = await this.client.delete(`/users/${userId}/follow`)
    return response.data
  }

  async getPendingFollowRequests(page = 1, limit = 20) {
    const response = await this.client.get('/users/me/follow-requests', {
      params: { page, limit }
    })
    return response.data
  }

  async respondToFollowRequest(requestId: string, action: 'approve' | 'reject') {
    const response = await this.client.post(`/users/me/follow-requests/${requestId}/respond`, {
      action
    })
    return response.data
  }

  async getUserFollowers(userId: string, page = 1, limit = 20) {
    const response = await this.client.get(`/users/${userId}/followers`, {
      params: { page, limit }
    })
    return response.data
  }

  async getUserFollowing(userId: string, page = 1, limit = 20) {
    const response = await this.client.get(`/users/${userId}/following`, {
      params: { page, limit }
    })
    return response.data
  }

  // Tracks endpoints
  async getTracks() {
    const response = await this.client.get('/tracks/my')
    return response.data.tracks || []
  }

  async getTrack(id: string) {
    const response = await this.client.get(`/tracks/${id}`)
    return response.data.track
  }

  async createTrack(data: { title: string; description?: string; isPublic?: boolean }) {
    const response = await this.client.post('/tracks', data)
    return response.data
  }

  async updateTrack(id: string, data: any) {
    const response = await this.client.put(`/tracks/${id}`, data)
    return response.data
  }

  async updateTrackImage(id: string, formData: FormData) {
    const response = await this.client.put(`/tracks/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async deleteTrack(id: string) {
    const response = await this.client.delete(`/tracks/${id}`)
    return response.data
  }

  // File upload
  async uploadTrack(formData: FormData) {
    const response = await this.client.post('/tracks/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  // Track versions endpoints
  async getTrackVersions(trackId: string) {
    const response = await this.client.get(`/tracks/${trackId}/versions`)
    return response.data.versions
  }

  async uploadTrackVersion(trackId: string, formData: FormData) {
    const response = await this.client.post(`/tracks/${trackId}/versions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async updateTrackVersion(trackId: string, versionId: string, data: any) {
    const response = await this.client.put(`/tracks/${trackId}/versions/${versionId}`, data)
    return response.data
  }

  async pinTrackVersion(trackId: string, versionId: string) {
    const response = await this.client.post(`/tracks/${trackId}/versions/${versionId}/pin`)
    return response.data
  }

  // Usage stats
  async getUsageStats() {
    const response = await this.client.get('/usage/stats')
    return response.data
  }

  // Notifications endpoints
  async getNotifications(page = 1, limit = 20, unreadOnly = false) {
    const response = await this.client.get('/notifications', {
      params: { page, limit, unread: unreadOnly }
    })
    return response.data
  }

  async getUnreadNotificationCount() {
    const response = await this.client.get('/notifications/unread-count')
    return response.data
  }

  async markNotificationAsRead(notificationId: string) {
    const response = await this.client.post(`/notifications/${notificationId}/read`)
    return response.data
  }

  async markAllNotificationsAsRead() {
    const response = await this.client.post('/notifications/mark-all-read')
    return response.data
  }

  // Projects endpoints
  async getUserProjects(page = 1, limit = 20) {
    const response = await this.client.get('/projects/my', {
      params: { page, limit }
    })
    return response.data
  }

  async getProject(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}`)
    return response.data.project
  }

  async createProject(data: { title: string; description?: string; type?: string; isPublic?: boolean }) {
    const response = await this.client.post('/projects', data)
    return response.data
  }

  async updateProject(projectId: string, data: { title?: string; description?: string; type?: string; isPublic?: boolean }) {
    const response = await this.client.put(`/projects/${projectId}`, data)
    return response.data
  }

  async updateProjectImage(projectId: string, formData: FormData) {
    const response = await this.client.put(`/projects/${projectId}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async deleteProject(projectId: string) {
    const response = await this.client.delete(`/projects/${projectId}`)
    return response.data
  }

  async addTrackToProject(projectId: string, trackId: string) {
    const response = await this.client.post(`/projects/${projectId}/tracks`, { trackId })
    return response.data
  }

  async removeTrackFromProject(projectId: string, trackId: string) {
    const response = await this.client.delete(`/projects/${projectId}/tracks/${trackId}`)
    return response.data
  }

  async reorderProjectTracks(projectId: string, trackOrder: string[]) {
    const response = await this.client.put(`/projects/${projectId}/tracks/reorder`, { trackOrder })
    return response.data
  }

  // Project member management endpoints
  async getProjectMembers(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/members`)
    return response.data
  }

  async inviteProjectMember(projectId: string, data: { email: string; role?: string }) {
    const response = await this.client.post(`/projects/${projectId}/invite`, data)
    return response.data
  }

  async removeProjectMember(projectId: string, memberId: string) {
    const response = await this.client.delete(`/projects/${projectId}/members/${memberId}`)
    return response.data
  }

  async updateProjectMemberRole(projectId: string, memberId: string, role: string) {
    const response = await this.client.put(`/projects/${projectId}/members/${memberId}/role`, { role })
    return response.data
  }

  async getProjectInvitations(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/invitations`)
    return response.data
  }

  async cancelProjectInvitation(projectId: string, invitationId: string) {
    const response = await this.client.delete(`/projects/${projectId}/invitations/${invitationId}`)
    return response.data
  }

  async resendProjectInvitation(projectId: string, invitationId: string) {
    const response = await this.client.post(`/projects/${projectId}/invitations/${invitationId}/resend`)
    return response.data
  }

  // Comments endpoints
  async getTrackComments(trackId: string) {
    const response = await this.client.get(`/tracks/${trackId}/comments`)
    return response.data
  }

  async addTrackComment(trackId: string, data: { content: string; timestamp?: number; version?: string }) {
    const response = await this.client.post(`/tracks/${trackId}/comments`, data)
    return response.data
  }

  async deleteTrackComment(trackId: string, commentId: string) {
    const response = await this.client.delete(`/tracks/${trackId}/comments/${commentId}`)
    return response.data
  }

  // Workspace endpoints
  async getWorkspaces() {
    const response = await this.client.get('/workspaces')
    return response.data
  }

  async getWorkspace(idOrSlug: string) {
    const response = await this.client.get(`/workspaces/${idOrSlug}`)
    return response.data
  }

  async createWorkspace(data: { name: string; slug: string }) {
    const response = await this.client.post('/workspaces', data)
    return response.data
  }

  async updateWorkspace(id: string, data: { name?: string; slug?: string; description?: string; imageUrl?: string; settings?: any }) {
    const response = await this.client.put(`/workspaces/${id}`, data)
    return response.data
  }

  async switchWorkspace(id: string) {
    const response = await this.client.post(`/workspaces/${id}/switch`)
    return response.data
  }

  async inviteWorkspaceMember(workspaceId: string, data: { email: string; role?: string }) {
    const response = await this.client.post(`/workspaces/${workspaceId}/invite`, data)
    return response.data
  }

  async acceptWorkspaceInvitation(token: string) {
    const response = await this.client.post(`/invitations/${token}/accept`)
    return response.data
  }

  async removeWorkspaceMember(workspaceId: string, memberId: string) {
    const response = await this.client.delete(`/workspaces/${workspaceId}/members/${memberId}`)
    return response.data
  }

  async updateWorkspaceMemberRole(workspaceId: string, memberId: string, role: string) {
    const response = await this.client.put(`/workspaces/${workspaceId}/members/${memberId}/role`, { role })
    return response.data
  }

  async getWorkspaceActivity(workspaceId: string, page: number = 1, limit: number = 50) {
    const response = await this.client.get(`/workspaces/${workspaceId}/activity`, {
      params: { page, limit }
    })
    return response.data
  }

  // Pass workspace ID in headers for workspace-scoped requests
  setCurrentWorkspace(workspaceId: string | null) {
    if (workspaceId) {
      this.client.defaults.headers.common['X-Workspace-ID'] = workspaceId
    } else {
      delete this.client.defaults.headers.common['X-Workspace-ID']
    }
  }

  // Generic HTTP methods for direct API calls
  async get(url: string, config?: any) {
    const response = await this.client.get(url, config)
    return response.data
  }

  async post(url: string, data?: any, config?: any) {
    const response = await this.client.post(url, data, config)
    return response.data
  }

  async put(url: string, data?: any, config?: any) {
    const response = await this.client.put(url, data, config)
    return response.data
  }

  async delete(url: string, config?: any) {
    const response = await this.client.delete(url, config)
    return response.data
  }

  async patch(url: string, data?: any, config?: any) {
    const response = await this.client.patch(url, data, config)
    return response.data
  }
}

// Create a singleton instance
export const apiClient = new ApiClient()
export default apiClient