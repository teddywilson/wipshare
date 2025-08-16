import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  MoreHorizontal, 
  Lock, 
  Globe, 
  Users, 
  Link as LinkIcon,
  Copy,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Music,
  Camera,
  Check,
  X,
  Building2
} from 'lucide-react'
import { apiClient } from '../lib/api-client'
import { usePlayer } from '../contexts/PlayerContext'
import { useAuth } from '../lib/stytch-auth-context'
import toast from 'react-hot-toast'
import TrackList from '../components/TrackList'
import AddTracksModal from '../components/AddTracksModal'
import EditPlaylistModal from '../components/EditPlaylistModal'
import { playlistEvents, PLAYLIST_EVENTS } from '../lib/playlist-events'

interface PlaylistTrack {
  id: string
  position: number
  addedAt: string
  track: {
    id: string
    title: string
    description?: string
    fileUrl: string
    imageUrl?: string
    duration?: number
    tags: string[]
    user: {
      username: string
      displayName?: string
    }
  }
}

interface PlaylistData {
  id: string
  title: string
  description?: string
  coverUrl?: string
  visibility: string
  secretToken?: string
  followersCount: number
  isOwner: boolean
  isFollowing: boolean
  canEdit: boolean
  canAddTracks: boolean
  canRemoveTracks: boolean
  tracks: PlaylistTrack[]
  user: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
  }
  createdAt: string
  updatedAt: string
}

export default function Playlist() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const { getToken, user } = useAuth()
  const { playTrack, currentTrack, isPlaying } = usePlayer()
  
  const [playlist, setPlaylist] = useState<PlaylistData | null>(() => {
    // Try to load from sessionStorage cache
    const cached = sessionStorage.getItem(`playlist_${id}`)
    return cached ? JSON.parse(cached) : null
  })
  const [loading, setLoading] = useState(!playlist) // Only show loading if no cached data
  const [showAddTracks, setShowAddTracks] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showSecretLinkModal, setShowSecretLinkModal] = useState(false)
  const [secretLinkCopied, setSecretLinkCopied] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (id) {
      fetchPlaylist()
    }
  }, [id, token])

  // Listen for playlist events to clear cache when updated elsewhere
  useEffect(() => {
    const handlePlaylistUpdate = () => {
      // Clear this playlist's cache
      sessionStorage.removeItem(`playlist_${id}`)
      // Refetch if this is the current playlist
      if (playlist?.id === id) {
        fetchPlaylist()
      }
    }

    const unsubscribeUpdated = playlistEvents.on(PLAYLIST_EVENTS.PLAYLIST_UPDATED, handlePlaylistUpdate)
    const unsubscribeDeleted = playlistEvents.on(PLAYLIST_EVENTS.PLAYLIST_DELETED, () => {
      sessionStorage.removeItem(`playlist_${id}`)
    })

    return () => {
      unsubscribeUpdated()
      unsubscribeDeleted()
    }
  }, [id, playlist?.id])

  const fetchPlaylist = async () => {
    // Only show loading if we don't have cached data
    if (!playlist) {
      setLoading(true)
    }
    try {
      const url = token 
        ? `/playlists/${id}?token=${token}`
        : `/playlists/${id}`
      
      const response = await apiClient.get(url)
      const playlistData = response.playlist
      setPlaylist(playlistData)
      // Cache in sessionStorage for instant loading next time
      sessionStorage.setItem(`playlist_${id}`, JSON.stringify(playlistData))
    } catch (error: any) {
      console.error('Failed to fetch playlist:', error)
      if (error.response?.status === 403) {
        toast.error('You do not have access to this playlist')
      } else if (error.response?.status === 404) {
        toast.error('Playlist not found')
      } else {
        toast.error('Failed to load playlist')
      }
      navigate('/playlists')
    } finally {
      setLoading(false)
    }
  }

  const handlePlayAll = () => {
    if (!playlist || playlist.tracks.length === 0) return
    
    const firstTrack = playlist.tracks[0].track
    playTrack(firstTrack as any)
  }

  const handleFollowToggle = async () => {
    if (!playlist) return
    
    try {
      const response = await apiClient.post(`/playlists/${playlist.id}/follow`)
      setPlaylist({
        ...playlist,
        isFollowing: response.following,
        followersCount: response.following 
          ? playlist.followersCount + 1 
          : playlist.followersCount - 1
      })
      toast.success(response.following ? 'Following playlist' : 'Unfollowed playlist')
    } catch (error) {
      console.error('Failed to toggle follow:', error)
      toast.error('Failed to update follow status')
    }
  }

  const handleGenerateSecretLink = async () => {
    if (!playlist) return
    
    try {
      const response = await apiClient.post(`/playlists/${playlist.id}/secret-link`)
      setPlaylist({
        ...playlist,
        secretToken: response.secretToken,
        visibility: 'SECRET_LINK'
      })
      
      setShowSecretLinkModal(true)
      setSecretLinkCopied(false)
      toast.success('Secret link created!')
    } catch (error) {
      console.error('Failed to generate secret link:', error)
      toast.error('Failed to generate secret link')
    }
  }

  const handleCopySecretLink = async () => {
    if (!playlist?.secretToken) return
    
    const url = `${window.location.origin}/playlist/${playlist.id}?token=${playlist.secretToken}`
    await navigator.clipboard.writeText(url)
    setSecretLinkCopied(true)
    toast.success('Link copied to clipboard!')
    
    // Reset copied state after 3 seconds
    setTimeout(() => setSecretLinkCopied(false), 3000)
  }

  const getSecretLinkUrl = () => {
    if (!playlist?.secretToken) return ''
    return `${window.location.origin}/playlist/${playlist.id}?token=${playlist.secretToken}`
  }

  const handleRemoveTrack = async (trackId: string) => {
    if (!playlist) return
    
    try {
      await apiClient.delete(`/playlists/${playlist.id}/tracks/${trackId}`)
      setPlaylist({
        ...playlist,
        tracks: playlist.tracks.filter(t => t.track.id !== trackId)
      })
      toast.success('Track removed from playlist')
    } catch (error) {
      console.error('Failed to remove track:', error)
      toast.error('Failed to remove track')
    }
  }

  const handleDeletePlaylist = async () => {
    if (!playlist) return
    
    try {
      await apiClient.delete(`/playlists/${playlist.id}`)
      // Emit event to refresh playlists everywhere
      playlistEvents.emit(PLAYLIST_EVENTS.PLAYLIST_DELETED)
      toast.success('Playlist deleted')
      navigate('/playlists')
    } catch (error) {
      console.error('Failed to delete playlist:', error)
      toast.error('Failed to delete playlist')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !playlist) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      
      // Get fresh token from Clerk auth
      const authToken = await getToken()
      if (!authToken) {
        console.error('No authenticated user found')
        throw new Error('User not authenticated')
      }
      console.log('Got auth token for user:', user?.email)
      
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//localhost:8080`
      const apiUrl = `${apiBaseUrl}/api/playlists/${playlist.id}/image`
      console.log('Uploading image to:', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      })

      console.log('Upload response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload failed with response:', errorText)
        throw new Error(`Failed to upload image: ${response.status}`)
      }

      toast.success('Playlist image updated')
      // Emit event to refresh playlists everywhere
      playlistEvents.emit(PLAYLIST_EVENTS.PLAYLIST_UPDATED)
      // Clear cache and refresh to get new image URL
      sessionStorage.removeItem(`playlist_${id}`)
      fetchPlaylist()
    } catch (error) {
      console.error('Failed to upload image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'PRIVATE':
      case 'SECRET_LINK': // SECRET_LINK is still fundamentally private
        return <Lock className="w-4 h-4" />
      case 'FOLLOWERS_ONLY':
        return <Users className="w-4 h-4" />
      case 'PUBLIC':
        return <Globe className="w-4 h-4" />
      case 'WORKSPACE':
        return <Building2 className="w-4 h-4" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
            <div className="h-64 bg-gray-200 rounded mb-6" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!playlist) {
    return null
  }

  // Convert playlist tracks to the format expected by TrackList
  const formattedTracks = playlist.tracks
    .sort((a, b) => a.position - b.position)
    .map(pt => ({
      ...pt.track,
      userId: (pt.track as any).userId || '',
      isPublic: true,
      visibility: 'public',
      createdAt: pt.addedAt,
      updatedAt: pt.addedAt
    }))

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-6 lg:p-8">
          <div className="animate-pulse">
            {/* Back button skeleton */}
            <div className="h-4 bg-gray-200 rounded w-16 mb-6" />
            
            {/* Header skeleton */}
            <div className="flex items-start gap-4 mb-8">
              <div className="w-24 h-24 bg-gray-200 rounded" />
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-200 rounded w-20" />
                  <div className="h-8 bg-gray-200 rounded w-20" />
                </div>
              </div>
            </div>
            
            {/* Track list skeleton */}
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/playlists')}
              className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-black transition-colors mb-4"
            >
              <ArrowLeft className="w-3 h-3" />
              back to playlists
            </button>

            <div className="flex items-start gap-6">
              {/* Cover */}
              <div className="relative w-48 h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex-shrink-0 group">
                {playlist.coverUrl ? (
                  <img
                    src={playlist.coverUrl}
                    alt={playlist.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                {playlist.isOwner && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                      disabled={uploadingImage}
                    >
                      <Camera className="w-8 h-8 text-white" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h1 className="text-sm font-mono text-gray-900 mb-1">{playlist.title}</h1>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="font-mono">by @{playlist.user.username}</span>
                      {getVisibilityIcon(playlist.visibility)}
                      <span>{playlist.tracks.length} tracks</span>
                      {playlist.followersCount > 0 && (
                        <span>{playlist.followersCount} followers</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {showMoreMenu && (
                      <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 shadow-sm z-10">
                        {playlist.isOwner && (
                          <>
                            <button
                              onClick={() => {
                                setShowEditModal(true)
                                setShowMoreMenu(false)
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-gray-50 flex items-center gap-2 transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              edit
                            </button>
                            {playlist.visibility === 'SECRET_LINK' && playlist.secretToken ? (
                              <button
                                onClick={() => {
                                  setShowSecretLinkModal(true)
                                  setSecretLinkCopied(false)
                                  setShowMoreMenu(false)
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-gray-50 flex items-center gap-2 transition-colors"
                              >
                                <Copy className="w-3 h-3" />
                                manage secret link
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  handleGenerateSecretLink()
                                  setShowMoreMenu(false)
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-gray-50 flex items-center gap-2 transition-colors"
                              >
                                <LinkIcon className="w-3 h-3" />
                                create secret link
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setShowDeleteModal(true)
                                setShowMoreMenu(false)
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-gray-50 text-red-600 flex items-center gap-2 transition-colors border-t border-gray-200"
                            >
                              <Trash2 className="w-3 h-3" />
                              delete
                            </button>
                          </>
                        )}
                        {!playlist.isOwner && (
                          <button
                            onClick={() => {
                              handleFollowToggle()
                              setShowMoreMenu(false)
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-gray-50 transition-colors"
                          >
                            {playlist.isFollowing ? 'unfollow' : 'follow'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {playlist.description && (
                  <p className="text-sm text-gray-600 mb-4">{playlist.description}</p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {playlist.tracks.length > 0 && (
                    <button
                      onClick={handlePlayAll}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-black text-white text-xs font-mono hover:bg-gray-800 transition-colors"
                    >
                      {currentTrack && playlist.tracks.some(t => t.track.id === currentTrack.id) && isPlaying ? (
                        <>
                          <Pause className="w-3 h-3" />
                          <span>pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          <span>play all</span>
                        </>
                      )}
                    </button>
                  )}

                  {playlist.canAddTracks && (
                    <button
                      onClick={() => setShowAddTracks(true)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 text-xs font-mono hover:border-gray-300 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>add tracks</span>
                    </button>
                  )}

                  {!playlist.isOwner && !playlist.isFollowing && (
                    <button
                      onClick={handleFollowToggle}
                      className="px-3 py-1.5 border border-gray-200 text-xs font-mono hover:border-gray-300 transition-colors"
                    >
                      follow
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tracks */}
          {playlist.tracks.length === 0 ? (
            <div className="text-center py-12 border border-gray-200 rounded-lg">
              <Music className="w-6 h-6 text-gray-300 mx-auto mb-3" />
              <p className="text-xs text-gray-500 mb-4">No tracks in this playlist yet</p>
              {playlist.canAddTracks && (
                <button
                  onClick={() => setShowAddTracks(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-black text-white text-xs font-mono hover:bg-gray-800 transition-colors rounded"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add first track</span>
                </button>
              )}
            </div>
          ) : (
            <TrackList
              tracks={formattedTracks}
              playingTrackId={currentTrack?.id && isPlaying ? currentTrack.id : null}
              currentTrackId={currentTrack?.id}
              onPlayPause={playTrack}
              onDelete={playlist.canRemoveTracks ? handleRemoveTrack : undefined}
              showDelete={playlist.canRemoveTracks}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddTracks && (
        <AddTracksModal
          playlistId={playlist.id}
          onClose={() => setShowAddTracks(false)}
          onSuccess={() => {
            setShowAddTracks(false)
            // Emit event to refresh playlists everywhere
            playlistEvents.emit(PLAYLIST_EVENTS.PLAYLIST_UPDATED)
            // Clear cache and refresh to get updated track list
            sessionStorage.removeItem(`playlist_${id}`)
            fetchPlaylist()
          }}
        />
      )}

      {showEditModal && (
        <EditPlaylistModal
          playlist={playlist}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            // Emit event to refresh playlists everywhere
            playlistEvents.emit(PLAYLIST_EVENTS.PLAYLIST_UPDATED)
            // Clear cache and refresh to get updated data
            sessionStorage.removeItem(`playlist_${id}`)
            fetchPlaylist()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white border border-gray-200 max-w-md w-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-mono">delete playlist</h2>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete "{playlist?.title}"? This action cannot be undone.
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-3 py-1.5 text-sm font-mono border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  cancel
                </button>
                <button
                  onClick={() => {
                    handleDeletePlaylist()
                    setShowDeleteModal(false)
                  }}
                  className="flex-1 px-3 py-1.5 text-sm font-mono bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secret Link Modal */}
      {showSecretLinkModal && playlist?.secretToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white border border-gray-200 max-w-lg w-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-mono">secret link</h2>
              <button
                onClick={() => setShowSecretLinkModal(false)}
                className="p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-xs text-gray-600 mb-4">
                Share this secret link to give anyone access to "{playlist.title}". Anyone with this link can view and listen to your playlist.
              </p>
              
              {/* URL Display */}
              <div className="mb-4">
                <label className="block text-xs font-mono text-gray-600 mb-1">
                  secret url
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={getSecretLinkUrl()}
                    readOnly
                    className="flex-1 px-2 py-1.5 text-xs font-mono border border-gray-200 bg-gray-50 focus:outline-none"
                  />
                  <button
                    onClick={handleCopySecretLink}
                    className={`px-3 py-1.5 text-xs font-mono border border-l-0 transition-colors ${
                      secretLinkCopied 
                        ? 'bg-green-50 border-green-200 text-green-700' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {secretLinkCopied ? (
                      <>
                        <Check className="w-3 h-3 inline mr-1" />
                        copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 inline mr-1" />
                        copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSecretLinkModal(false)}
                  className="flex-1 px-3 py-1.5 text-sm font-mono border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}