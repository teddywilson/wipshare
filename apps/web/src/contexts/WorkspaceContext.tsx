import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiClient } from '../lib/api-client'
import { useAuth } from '../lib/auth-context'

interface WorkspaceMember {
  id: string
  userId: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  user: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
    email: string
  }
  joinedAt: string
  lastActive: string
}

interface Workspace {
  id: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
  ownerId: string
  isPersonal: boolean
  billingTier: string
  owner: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
  }
  members?: WorkspaceMember[]
  usage?: any
  memberCount: number
  trackCount: number
  projectCount: number
  currentUserRole?: string
  isDefault?: boolean
}

interface WorkspaceContextType {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  loading: boolean
  switching: boolean
  switchWorkspace: (workspaceId: string) => Promise<void>
  createWorkspace: (data: { name: string; slug: string }) => Promise<Workspace>
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<void>
  inviteMember: (email: string, role?: string) => Promise<void>
  removeMember: (memberId: string) => Promise<void>
  updateMemberRole: (memberId: string, role: string) => Promise<void>
  refreshWorkspaces: () => Promise<void>
  getWorkspaceById: (id: string) => Workspace | undefined
  getWorkspaceBySlug: (slug: string) => Workspace | undefined
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, needsUsernameSetup } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)

  // Load workspaces when authenticated and profile complete
  useEffect(() => {
    if (user && !needsUsernameSetup) {
      loadWorkspaces()
    } else {
      setWorkspaces([])
      setCurrentWorkspace(null)
      apiClient.setCurrentWorkspace(null)
      setLoading(false)
    }
  }, [user, needsUsernameSetup])

  const loadWorkspaces = async () => {
    try {
      setLoading(true)
      if (!user || needsUsernameSetup) {
        // Skip fetching until onboarding complete
        return
      }
      const response = await apiClient.getWorkspaces()
      const { workspaces: fetchedWorkspaces, defaultWorkspaceId } = response
      
      setWorkspaces(fetchedWorkspaces)
      
      // Set current workspace to default or first workspace
      if (defaultWorkspaceId) {
        const defaultWorkspace = fetchedWorkspaces.find((w: Workspace) => w.id === defaultWorkspaceId)
        setCurrentWorkspace(defaultWorkspace || fetchedWorkspaces[0] || null)
      } else if (fetchedWorkspaces.length > 0) {
        setCurrentWorkspace(fetchedWorkspaces[0])
      }
      
      // Store in localStorage for persistence
      if (fetchedWorkspaces.length > 0) {
        const currentWs = fetchedWorkspaces.find((w: Workspace) => w.id === defaultWorkspaceId) || fetchedWorkspaces[0]
        localStorage.setItem('currentWorkspaceId', currentWs.id)
        
        // Set workspace ID in API client headers
        apiClient.setCurrentWorkspace(currentWs.id)
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error)
    } finally {
      setLoading(false)
    }
  }

  const switchWorkspace = async (workspaceId: string) => {
    try {
      setSwitching(true)
      
      const workspace = workspaces.find(w => w.id === workspaceId)
      if (!workspace) {
        throw new Error('Workspace not found')
      }

      // Optimistically update UI first for immediate feedback
      setCurrentWorkspace(workspace)
      localStorage.setItem('currentWorkspaceId', workspaceId)
      apiClient.setCurrentWorkspace(workspaceId)

      // Update backend
      await apiClient.switchWorkspace(workspaceId)
      
      // Emit an event to refresh data across the app
      window.dispatchEvent(new CustomEvent('workspace-changed', { detail: { workspaceId } }))
    } catch (error) {
      console.error('Failed to switch workspace:', error)
      // On error, revert optimistic update if possible
      // We could implement error recovery here
    } finally {
      setSwitching(false)
    }
  }

  const createWorkspace = async (data: { name: string; slug: string }) => {
    try {
      const response = await apiClient.createWorkspace(data)
      const newWorkspace = response.workspace
      
      // Add to list
      setWorkspaces(prev => [...prev, newWorkspace])
      
      // Switch to the new workspace immediately
      setCurrentWorkspace(newWorkspace)
      localStorage.setItem('currentWorkspaceId', newWorkspace.id)
      
      // Set workspace ID in API client headers
      apiClient.setCurrentWorkspace(newWorkspace.id)
      
      // Update backend to set as default
      await apiClient.switchWorkspace(newWorkspace.id)
      
      // Emit event to refresh data
      window.dispatchEvent(new CustomEvent('workspace-changed', { detail: { workspaceId: newWorkspace.id } }))
      
      return newWorkspace
    } catch (error: any) {
      console.error('Failed to create workspace:', error)
      throw error
    }
  }

  const updateWorkspace = async (id: string, data: Partial<Workspace>) => {
    try {
      const response = await apiClient.updateWorkspace(id, data)
      const updatedWorkspace = response.workspace
      
      // Update in list
      setWorkspaces(prev => prev.map(w => w.id === id ? updatedWorkspace : w))
      
      // Update current if it's the one being updated
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(updatedWorkspace)
      }
    } catch (error: any) {
      console.error('Failed to update workspace:', error)
      throw error
    }
  }

  const inviteMember = async (email: string, role: string = 'MEMBER') => {
    if (!currentWorkspace) {
      console.error('No workspace selected')
      return
    }

    try {
      await apiClient.inviteWorkspaceMember(currentWorkspace.id, { email, role })
      
      // Refresh current workspace to get updated member list
      await refreshCurrentWorkspace()
    } catch (error: any) {
      console.error('Failed to send invitation:', error)
      throw error
    }
  }

  const removeMember = async (memberId: string) => {
    if (!currentWorkspace) {
      console.error('No workspace selected')
      return
    }

    try {
      await apiClient.removeWorkspaceMember(currentWorkspace.id, memberId)
      
      // Refresh current workspace
      await refreshCurrentWorkspace()
    } catch (error: any) {
      console.error('Failed to remove member:', error)
      throw error
    }
  }

  const updateMemberRole = async (memberId: string, role: string) => {
    if (!currentWorkspace) {
      console.error('No workspace selected')
      return
    }

    try {
      await apiClient.updateWorkspaceMemberRole(currentWorkspace.id, memberId, role)
      
      // Refresh current workspace
      await refreshCurrentWorkspace()
    } catch (error: any) {
      console.error('Failed to update member role:', error)
      throw error
    }
  }

  const refreshCurrentWorkspace = async () => {
    if (!currentWorkspace) return

    try {
      const response = await apiClient.getWorkspace(currentWorkspace.id)
      const updatedWorkspace = response.workspace
      
      // Update in list
      setWorkspaces(prev => prev.map(w => w.id === currentWorkspace.id ? updatedWorkspace : w))
      setCurrentWorkspace(updatedWorkspace)
    } catch (error) {
      console.error('Failed to refresh workspace:', error)
    }
  }

  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces()
  }, [])

  const getWorkspaceById = useCallback((id: string) => {
    return workspaces.find(w => w.id === id)
  }, [workspaces])

  const getWorkspaceBySlug = useCallback((slug: string) => {
    return workspaces.find(w => w.slug === slug)
  }, [workspaces])

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        loading,
        switching,
        switchWorkspace,
        createWorkspace,
        updateWorkspace,
        inviteMember,
        removeMember,
        updateMemberRole,
        refreshWorkspaces,
        getWorkspaceById,
        getWorkspaceBySlug
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}