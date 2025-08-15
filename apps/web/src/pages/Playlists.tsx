import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, ListMusic, Globe, Lock, Users, Link as LinkIcon, Eye, Calendar, Music } from 'lucide-react'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'
import CreatePlaylistModal from '../components/CreatePlaylistModal'
import { CacheManager } from '../lib/cache'
import { playlistEvents, PLAYLIST_EVENTS } from '../lib/playlist-events'

interface Playlist {
  id: string
  title: string
  description?: string
  coverUrl?: string
  visibility: 'PRIVATE' | 'FOLLOWERS_ONLY' | 'WORKSPACE' | 'PUBLIC' | 'SECRET_LINK'
  tracksCount: number
  followersCount: number
  user?: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
  }
  isFollowing?: boolean
  followedAt?: string
  createdAt: string
  updatedAt: string
}

export default function Playlists() {
  const navigate = useNavigate()
  const location = useLocation()
  const isDiscoverTab = location.pathname === '/playlists/discover'
  
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    // Load cached playlists using CacheManager
    const cacheKey = isDiscoverTab ? 'cachedDiscoverPlaylists' : 'cachedMyPlaylistsFull'
    return CacheManager.get<Playlist[]>(cacheKey) || []
  })
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    // Load cached data immediately
    const cacheKey = isDiscoverTab ? 'cachedDiscoverPlaylists' : 'cachedMyPlaylistsFull'
    const cached = CacheManager.get<Playlist[]>(cacheKey)
    if (cached) {
      setPlaylists(cached)
    }
    // Then fetch fresh data
    fetchPlaylists()
  }, [isDiscoverTab])

  // Listen for playlist events to invalidate cache
  useEffect(() => {
    const handleRefresh = () => {
      CacheManager.invalidatePlaylists()
      fetchPlaylists()
    }

    const unsubscribeCreated = playlistEvents.on(PLAYLIST_EVENTS.PLAYLIST_CREATED, handleRefresh)
    const unsubscribeUpdated = playlistEvents.on(PLAYLIST_EVENTS.PLAYLIST_UPDATED, handleRefresh)
    const unsubscribeDeleted = playlistEvents.on(PLAYLIST_EVENTS.PLAYLIST_DELETED, handleRefresh)
    const unsubscribeRefresh = playlistEvents.on(PLAYLIST_EVENTS.REFRESH_PLAYLISTS, handleRefresh)

    return () => {
      unsubscribeCreated()
      unsubscribeUpdated()
      unsubscribeDeleted()
      unsubscribeRefresh()
    }
  }, [])

  const fetchPlaylists = async () => {
    // Don't show loading if we have cached data
    if (playlists.length === 0) {
      setLoading(true)
    }
    try {
      const endpoint = isDiscoverTab ? '/playlists/discover' : '/playlists/my'
      const response = await apiClient.get(endpoint)
      const newPlaylists = response.playlists || []
      setPlaylists(newPlaylists)
      
      // Cache the playlists using CacheManager
      const cacheKey = isDiscoverTab ? 'cachedDiscoverPlaylists' : 'cachedMyPlaylistsFull'
      CacheManager.set(cacheKey, newPlaylists)
    } catch (error) {
      console.error('Failed to fetch playlists:', error)
      // Only show error if we don't have cached data
      if (playlists.length === 0) {
        toast.error('Failed to load playlists')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFollowToggle = async (playlistId: string) => {
    try {
      const response = await apiClient.post(`/playlists/${playlistId}/follow`)
      
      // Update local state
      setPlaylists(prev => prev.map(p => 
        p.id === playlistId 
          ? { 
              ...p, 
              isFollowing: response.following,
              followersCount: response.following 
                ? p.followersCount + 1 
                : p.followersCount - 1
            }
          : p
      ))
      
      toast.success(response.following ? 'Following playlist' : 'Unfollowed playlist')
    } catch (error) {
      console.error('Failed to toggle follow:', error)
      toast.error('Failed to update follow status')
    }
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'PRIVATE':
      case 'SECRET_LINK': // SECRET_LINK is still fundamentally private
        return <Lock className="w-3.5 h-3.5" />
      case 'FOLLOWERS_ONLY':
        return <Users className="w-3.5 h-3.5" />
      case 'PUBLIC':
        return <Globe className="w-3.5 h-3.5" />
      case 'WORKSPACE':
        return <Eye className="w-3.5 h-3.5" />
      default:
        return <Eye className="w-3.5 h-3.5" />
    }
  }

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'PRIVATE':
        return 'Private'
      case 'FOLLOWERS_ONLY':
        return 'Followers only'
      case 'PUBLIC':
        return 'Public'
      case 'SECRET_LINK':
        return 'Secret link'
      case 'WORKSPACE':
        return 'Workspace'
      default:
        return visibility
    }
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - d.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-sm font-mono text-gray-600">
                {isDiscoverTab ? 'shared with me' : 'my playlists'}
              </h1>
              {!isDiscoverTab && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-sm font-mono text-gray-600 hover:text-black transition-colors"
                >
                  + new playlist
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="w-full h-32 bg-gray-200 rounded-md mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-12">
              <ListMusic className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                {isDiscoverTab 
                  ? "no playlists shared with you yet"
                  : "you haven't created any playlists yet"
                }
              </p>
              {!isDiscoverTab && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 hover:border-gray-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-mono">create your first playlist</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="border border-gray-200 hover:border-gray-300 transition-all cursor-pointer group"
                  onClick={() => navigate(`/playlist/${playlist.id}`)}
                >
                  <div className="p-3 flex items-center gap-3">
                    {/* Cover Image */}
                    <div className="w-12 h-12 bg-gray-100 flex-shrink-0">
                      {playlist.coverUrl ? (
                        <img
                          src={playlist.coverUrl}
                          alt={playlist.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <ListMusic className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-mono text-sm truncate group-hover:text-blue-600 transition-colors">
                        {playlist.title}
                      </h3>
                    
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        {playlist.user && isDiscoverTab && (
                          <span>by {playlist.user.displayName || playlist.user.username}</span>
                        )}
                        <span>{playlist.tracksCount} tracks</span>
                        {playlist.followersCount > 0 && (
                          <span>{playlist.followersCount} followers</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {getVisibilityIcon(playlist.visibility)}
                        <span className="text-xs text-gray-500">
                          {getVisibilityLabel(playlist.visibility)}
                        </span>
                      </div>
                      
                      {isDiscoverTab && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleFollowToggle(playlist.id)
                          }}
                          className={`px-2 py-0.5 text-xs font-mono transition-colors ${
                            playlist.isFollowing
                              ? 'text-gray-600 hover:text-red-600'
                              : 'text-gray-600 hover:text-black'
                          }`}
                        >
                          {playlist.isFollowing ? 'unfollow' : 'follow'}
                        </button>
                      )}

                      {!isDiscoverTab && (
                        <span className="text-xs text-gray-500">
                          {formatDate(playlist.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <CreatePlaylistModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            // Emit event to refresh playlists everywhere
            playlistEvents.emit(PLAYLIST_EVENTS.PLAYLIST_CREATED)
          }}
        />
      )}
    </div>
  )
}