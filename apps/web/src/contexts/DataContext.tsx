import { createContext, useContext, useCallback, type ReactNode } from 'react'

// Legacy interface for Track - keeping for backward compatibility
interface Track {
  id: string
  title: string
  description?: string
  tags?: string[]
  isPublic: boolean
  fileUrl: string
  imageUrl?: string
  waveformData?: any
  duration?: number
  createdAt: string
  updatedAt: string
  userId: string
}

// Simplified DataContext interface - most functionality moved to React Query
interface DataContextType {
  tracks: Track[]
  usageStats: any
  loading: {
    tracks: boolean
    usageStats: boolean
  }
  error: string | null
  refreshTracks: (force?: boolean) => Promise<void>
  refreshUsageStats: (force?: boolean) => Promise<void>
  addTrack: (track: Track) => void
  updateTrack: (id: string, updates: Partial<Track>) => void
  deleteTrack: (id: string) => void
  clearCache: () => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  // Provide empty/no-op implementations since React Query now handles data fetching
  const refreshTracks = useCallback(async (force = false) => {
    // No-op - React Query handles this now
  }, [])

  const refreshUsageStats = useCallback(async (force = false) => {
    // No-op - React Query handles this now
  }, [])

  const addTrack = useCallback((track: Track) => {
    // No-op - React Query mutations handle this
  }, [])

  const updateTrack = useCallback((id: string, updates: Partial<Track>) => {
    // No-op - React Query mutations handle this
  }, [])

  const deleteTrack = useCallback((id: string) => {
    // No-op - React Query mutations handle this
  }, [])

  const clearCache = useCallback(() => {
    // Clean up any remaining localStorage entries
    localStorage.removeItem('cachedTracks')
    localStorage.removeItem('tagCounts')
  }, [])

  return (
    <DataContext.Provider
      value={{
        tracks: [], // Empty array - components should use React Query hooks instead
        usageStats: null, // Null - components should use React Query hooks instead
        loading: { tracks: false, usageStats: false }, // No loading - React Query provides this
        error: null, // No error - React Query provides this
        refreshTracks,
        refreshUsageStats,
        addTrack,
        updateTrack,
        deleteTrack,
        clearCache,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}