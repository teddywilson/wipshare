import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/stytch-auth-context'
import { usePlayer } from '../contexts/PlayerContext'
import { 
  useTrack, 
  useTrackVersions, 
  useTrackComments,
  useUpdateTrack,
  useDeleteTrack,
  usePinTrackVersion,
  useUploadTrackVersion,
  useUpdateTrackImage,
  useAddTrackComment,
  useDeleteTrackComment,
  useUserTracks,
  trackKeys
} from '../hooks/useTrackQueries'
import { useUserProjects, useAddTrackToProject } from '../hooks/useProjectQueries'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { Play, Pause, ArrowLeft, Edit, Trash2, Lock, Music, X, Image, MessageCircle, Upload as UploadIcon, Send, Folder, Plus, Heart, Calendar, Clock, BarChart3, Pin } from 'lucide-react'
import Waveform from '../components/Waveform'
import Modal from '../components/Modal'
import { sidebarEvents, SIDEBAR_EVENTS } from '../lib/events'

export default function Track() {
  const { id } = useParams<{ id: string }>()
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { 
    playTrack, 
    pauseTrack,
    currentTrack, 
    isPlaying: globalIsPlaying, 
    currentTime: globalCurrentTime, 
    duration: globalDuration,
    seek: globalSeek,
    togglePlayPause,
    audioRef
  } = usePlayer()
  
  // React Query hooks
  const queryClient = useQueryClient()
  const { data: trackData, isLoading: trackLoading, error: trackError } = useTrack(id)
  const { data: versionsData, isLoading: versionsLoading } = useTrackVersions(id)
  const { data: commentsData, isLoading: commentsLoading } = useTrackComments(id)
  const { data: tracks = [] } = useUserTracks()
  
  // Mutations
  const updateTrackMutation = useUpdateTrack()
  const deleteTrackMutation = useDeleteTrack()
  const pinVersionMutation = usePinTrackVersion()
  const uploadVersionMutation = useUploadTrackVersion()
  const updateImageMutation = useUpdateTrackImage()
  const addCommentMutation = useAddTrackComment()
  const deleteCommentMutation = useDeleteTrackComment()
  const addTrackToProjectMutation = useAddTrackToProject()
  
  // Projects data
  const { data: projectsData } = useUserProjects(1, 100)
  // Playlists data - fetch separately
  const [playlistsData, setPlaylistsData] = useState<any[]>([])
  const [playlistsLoading, setPlaylistsLoading] = useState(false)
  
  // Extract data
  const track = trackData
  const trackVersions = versionsData || []
  const comments = commentsData || []
  
  // Local state
  const [contentReady, setContentReady] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [mouseX, setMouseX] = useState<number | null>(null)
  const [localSeekPosition, setLocalSeekPosition] = useState<number>(0)
  const waveformRef = useRef<HTMLDivElement | null>(null)
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [showAddToProjectModal, setShowAddToProjectModal] = useState(false)
  const [showPinConfirmModal, setShowPinConfirmModal] = useState(false)
  const [versionToPin, setVersionToPin] = useState<any>(null)
  
  // Edit form states
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editTagInput, setEditTagInput] = useState('')
  const [editVisibility, setEditVisibility] = useState('private')
  const [editVersion, setEditVersion] = useState('001')
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  
  // Comment state
  const [commentText, setCommentText] = useState('')
  const [commentTimestamp, setCommentTimestamp] = useState<number | null>(null)
  const [isSelectingTimestamp, setIsSelectingTimestamp] = useState(false)
  const [attachToCurrentVersion, setAttachToCurrentVersion] = useState(true)
  
  // Image upload state
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  
  // Version upload state
  const [versionFile, setVersionFile] = useState<File | null>(null)
  const [versionDescription, setVersionDescription] = useState('')
  const [versionNumber, setVersionNumber] = useState('')
  const [makeDefaultVersion, setMakeDefaultVersion] = useState(false)
  const [versionUploaded, setVersionUploaded] = useState(false)
  const [versionUploadProgress, setVersionUploadProgress] = useState(0)
  const [uploadedVersion, setUploadedVersion] = useState<any>(null)
  const versionInputRef = useRef<HTMLInputElement | null>(null)
  const versionProgressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Current version state
  const [currentVersion, setCurrentVersion] = useState<any>(null)
  const [currentPlayingVersionId, setCurrentPlayingVersionId] = useState<string | null>(null)
  
  // Project management state
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<string>>(new Set())
  const [addingToProject, setAddingToProject] = useState(false)
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('')

  // Initialize edit form when track loads
  useEffect(() => {
    if (track) {
      setEditTitle(track.title)
      setEditDescription(track.description || '')
      setEditTags(track.tags || [])
      setEditVisibility(track.visibility || 'private')
      setEditVersion(track.version || '001')
      
      // Small delay to ensure smooth transition
      setTimeout(() => setContentReady(true), 50)
    }
  }, [track])

  // Check if we should open the version upload modal
  useEffect(() => {
    if (location.state?.openVersionUpload && track) {
      setShowVersionModal(true)
      // Clear the state so it doesn't reopen on navigation
      navigate(location.pathname, { replace: true })
    }
    // Also check sessionStorage for version upload intent
    const shouldOpenVersionUpload = sessionStorage.getItem('openVersionUpload')
    if (shouldOpenVersionUpload === id && track) {
      setShowVersionModal(true)
      sessionStorage.removeItem('openVersionUpload')
    }
  }, [location.state, track, navigate, location.pathname, id])

  // Fetch playlists when modal opens
  useEffect(() => {
    if (showAddToProjectModal) {
      fetchPlaylists()
    }
  }, [showAddToProjectModal])

  const fetchPlaylists = async () => {
    setPlaylistsLoading(true)
    try {
      const response = await apiClient.get('/playlists/my')
      setPlaylistsData(response.playlists || [])
    } catch (error) {
      console.error('Failed to fetch playlists:', error)
      setPlaylistsData([])
    } finally {
      setPlaylistsLoading(false)
    }
  }

  // Set current version based on pinned version
  useEffect(() => {
    if (trackVersions.length > 0) {
      const pinnedVersion = trackVersions.find((v: any) => v.isPinned)
      if (pinnedVersion) {
        setCurrentVersion(pinnedVersion)
        setCurrentPlayingVersionId(pinnedVersion.id)
      } else if (track) {
        // Fall back to version number from track
        const currentVer = trackVersions.find((v: any) => 
          v.versionNumber === parseInt(track.version)
        )
        if (currentVer) {
          setCurrentVersion(currentVer)
        }
      }
    }
  }, [trackVersions, track])

  // Sync local seek position with global playing position when playing
  useEffect(() => {
    if (currentTrack?.id === track?.id && globalIsPlaying && globalDuration > 0) {
      setLocalSeekPosition(globalCurrentTime / globalDuration)
    }
  }, [globalCurrentTime, globalDuration, currentTrack?.id, track?.id, globalIsPlaying])

  // Get all unique tags from user's tracks for suggestions
  const allUserTags = React.useMemo(() => {
    const tagsSet = new Set<string>()
    tracks.forEach(t => {
      t.tags?.forEach(tag => tagsSet.add(tag))
    })
    return Array.from(tagsSet).sort()
  }, [tracks])

  // Filter tag suggestions based on input
  React.useEffect(() => {
    if (editTagInput.trim()) {
      const input = editTagInput.toLowerCase().trim()
      const suggestions = allUserTags
        .filter(tag => 
          tag.toLowerCase().includes(input) && 
          !editTags.includes(tag)
        )
        .slice(0, 5)
      setTagSuggestions(suggestions)
      setShowTagSuggestions(suggestions.length > 0)
    } else {
      setTagSuggestions([])
      setShowTagSuggestions(false)
    }
  }, [editTagInput, editTags, allUserTags])

  const handleEditTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      const trimmedTag = editTagInput.trim().toLowerCase()
      if (trimmedTag && !editTags.includes(trimmedTag)) {
        setEditTags([...editTags, trimmedTag])
        setEditTagInput('')
        setShowTagSuggestions(false)
      }
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false)
    }
  }

  const handleSelectTagSuggestion = (tag: string) => {
    if (!editTags.includes(tag)) {
      setEditTags([...editTags, tag])
      setEditTagInput('')
      setShowTagSuggestions(false)
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(tag => tag !== tagToRemove))
  }

  const handleSaveEdit = async () => {
    if (!track) return
    
    await updateTrackMutation.mutateAsync({
      id: track.id,
      data: {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        tags: editTags,
        visibility: editVisibility,
        version: editVersion
      }
    })
    
    // Invalidate tracks queries to update sidebar immediately
    queryClient.invalidateQueries({ queryKey: trackKeys.userTracks() })
    // Emit event to refresh sidebar tags
    sidebarEvents.emit(SIDEBAR_EVENTS.REFRESH_TAGS)
    
    setShowEditModal(false)
  }

  const handleDelete = async () => {
    if (!track) return
    
    await deleteTrackMutation.mutateAsync(track.id)
    // Navigate to dashboard (React Query mutation already handles cache invalidation)
    navigate('/dashboard')
  }
  
  // Projects are loaded via React Query hook
  
  // Handle adding track to project
  const handleAddToProject = async () => {
    if (selectedCollectionIds.size === 0 || !track) return
    
    setAddingToProject(true)
    try {
      // Add track to all selected collections/playlists
      await Promise.all(
        Array.from(selectedCollectionIds).map(projectId =>
          addTrackToProjectMutation.mutateAsync({
            projectId,
            trackId: track.id
          })
        )
      )
      
      // Close modal and reset
      setShowAddToProjectModal(false)
      setSelectedCollectionIds(new Set())
      setCollectionSearchQuery('')
    } catch (error) {
      console.error('Failed to add track to collections:', error)
    } finally {
      setAddingToProject(false)
    }
  }
  
  // Projects loaded automatically via React Query

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleImageUpload = async (file: File) => {
    if (!track) return
    
    if (!file.type.startsWith('image/')) {
      console.error('Please select an image file')
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      console.error('Image must be less than 5MB')
      return
    }

    const formData = new FormData()
    formData.append('image', file)
    
    await updateImageMutation.mutateAsync({ id: track.id, formData })
    
    // React Query mutation already handles cache invalidation
  }

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitComment()
    }
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !id) return
    
    const commentData = {
      content: commentText.trim(),
      timestamp: commentTimestamp ?? undefined,
      version: currentVersion 
        ? currentVersion.versionNumber.toString().padStart(3, '0')
        : (track?.version || '001')
    }
    
    await addCommentMutation.mutateAsync({ trackId: id, data: commentData })
    
    // Reset form
    setCommentText('')
    setCommentTimestamp(null)
    setAttachToCurrentVersion(true)
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?') || !id) return
    
    await deleteCommentMutation.mutateAsync({ trackId: id, commentId })
  }

  const handleVersionFileSelect = async (file: File) => {
    if (!track) return
    
    if (!file.type.startsWith('audio/')) {
      console.error('Please select an audio file')
      return
    }

    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      console.error('File size must be less than 100MB')
      return
    }

    setVersionFile(file)
    setVersionUploadProgress(0)
    
    // Auto-generate version number
    const nextVersion = track.version ? String(parseInt(track.version) + 1).padStart(3, '0') : '002'
    setVersionNumber(nextVersion)
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('trackId', track.id)
    formData.append('version', nextVersion)
    formData.append('makeDefault', makeDefaultVersion.toString())
    if (versionDescription) {
      formData.append('description', versionDescription)
    }
    
    // Simulate progress for better UX
    versionProgressIntervalRef.current = setInterval(() => {
      setVersionUploadProgress(prev => {
        if (prev >= 90) {
          if (versionProgressIntervalRef.current) {
            clearInterval(versionProgressIntervalRef.current)
            versionProgressIntervalRef.current = null
          }
          return 90
        }
        return prev + 10
      })
    }, 200)

    const response = await uploadVersionMutation.mutateAsync({ trackId: track.id, formData })
    
    if (versionProgressIntervalRef.current) {
      clearInterval(versionProgressIntervalRef.current)
      versionProgressIntervalRef.current = null
    }
    setVersionUploadProgress(100)
    setVersionUploaded(true)
    setUploadedVersion(response.version)
  }

  const handleSaveVersion = async () => {
    if (!uploadedVersion) return
    
    // Close modal and reset
    setShowVersionModal(false)
    setVersionFile(null)
    setVersionDescription('')
    setVersionNumber('')
    setMakeDefaultVersion(false)
    setVersionUploaded(false)
    setUploadedVersion(null)
    setVersionUploadProgress(0)
  }

  const handlePinVersion = async () => {
    if (!versionToPin || !track) return
    
    await pinVersionMutation.mutateAsync({ 
      trackId: track.id, 
      versionId: versionToPin.id 
    })
    
    setShowPinConfirmModal(false)
    setVersionToPin(null)
  }

  // Handle errors
  useEffect(() => {
    if (trackError) {
      const error = trackError as any
      if (error.response?.status === 404) {
        navigate('/dashboard')
      }
    }
  }, [trackError, navigate])

  if (trackLoading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-6xl mx-auto">
            {/* Header skeleton */}
            <div className="mb-8">
              <div className="skeleton-shimmer h-4 w-32 rounded mb-6" />
              <div className="flex items-start gap-6">
                <div className="skeleton-shimmer w-32 h-32 rounded-md" />
                <div className="flex-1">
                  <div className="skeleton-shimmer h-6 w-3/4 rounded mb-3" />
                  <div className="skeleton-shimmer h-4 w-full rounded mb-2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!track) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-6 lg:p-8">
          <div className="text-sm text-gray-500 font-mono">Track not found</div>
        </div>
      </div>
    )
  }

  const isOwner = user?.uid === track.user?.clerkUserId

  // Filter comments for current version
  const filteredComments = comments.filter((comment: any) => {
    if (currentVersion) {
      return comment.version === currentVersion.versionNumber.toString().padStart(3, '0')
    } else {
      return !comment.version || comment.version === (track.version || '001')
    }
  })

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className={`p-6 lg:p-8 max-w-7xl mx-auto transition-opacity duration-300 ${contentReady ? 'opacity-100' : 'opacity-0'}`}>
          <div className="lg:grid lg:grid-cols-[1fr,320px] lg:gap-8">
            {/* Main Content */}
            <div>
              {/* Header */}
              <div className="mb-8 animate-fade-in">
                <Link 
                  to="/dashboard" 
                  className="inline-flex items-center space-x-2 text-sm text-gray-600 hover:text-black transition-colors mb-6"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to tracks</span>
                </Link>

                <div className="flex items-start gap-6">
                  {/* Track artwork - clickable for owner */}
                  <div className="flex-shrink-0">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(file)
                      }}
                      className="hidden"
                    />
                    <div 
                      className={`w-32 h-32 bg-gray-100 rounded-md overflow-hidden shadow-sm relative group ${
                        isOwner ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => isOwner && imageInputRef.current?.click()}
                    >
                      {track.imageUrl ? (
                        <img 
                          src={track.imageUrl} 
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <Music className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      {isOwner && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Image className="w-8 h-8 text-white" />
                            <span className="text-xs text-white mt-1 block">Change</span>
                          </div>
                        </div>
                      )}
                      {updateImageMutation.isPending && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                          <span className="text-xs">Uploading...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Track info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-3 mb-3">
                          <h1 className="text-2xl font-mono font-semibold">{track.title}</h1>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            <span className="capitalize">{track.visibility || 'private'}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3.5 h-3.5" />
                            {track.playCount || 0} plays
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {comments.length}
                          </span>
                          {(currentVersion?.duration || track.duration) && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDuration(currentVersion?.duration || track.duration)}
                            </span>
                          )}
                        </div>

                        {track.description && (
                          <p className="mt-3 text-sm text-gray-600">{track.description}</p>
                        )}
                        
                        {/* Tags */}
                        {track.tags && track.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {track.tags.map((tag: string) => (
                              <span
                                key={tag}
                                className="inline-block px-2 py-0.5 bg-gray-100 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Owner actions */}
                      {isOwner && (
                        <div className="flex items-center gap-2 ml-6">
                          <button
                            onClick={() => setShowEditModal(true)}
                            className="p-2 hover:bg-gray-100 rounded transition-colors"
                            title="Edit track"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => setShowDeleteModal(true)}
                            className="p-2 hover:bg-red-50 rounded transition-colors"
                            title="Delete track"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Versions Bar */}
              {trackVersions.length > 0 && (
                <div className="mb-4 flex items-center gap-2 animate-fade-in-delay">
                  <span className="text-xs text-gray-500 font-mono">Version:</span>
                  <div className="flex items-center gap-1">
                    {currentVersion && (
                      <button
                        onClick={() => {
                          setCurrentVersion(null)
                          setLocalSeekPosition(0)
                          if (currentTrack?.id === track.id && globalIsPlaying) {
                            pauseTrack()
                            if (audioRef.current) {
                              audioRef.current.currentTime = 0
                            }
                          }
                        }}
                        className={`px-2 py-1 text-xs font-mono rounded transition-colors flex items-center gap-1 ${
                          !currentVersion 
                            ? 'bg-black text-white' 
                            : 'border border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Pin className="w-3 h-3" />
                        v{track.version || '001'}
                      </button>
                    )}
                    {trackVersions.map((version: any) => {
                      const isCurrent = currentVersion?.id === version.id
                      return (
                        <button
                          key={version.id}
                          onClick={() => {
                            if (!isCurrent && version.fileUrl && track) {
                              setCurrentVersion(version)
                              setLocalSeekPosition(0)
                              if (currentTrack?.id === track.id && globalIsPlaying) {
                                pauseTrack()
                                if (audioRef.current) {
                                  audioRef.current.currentTime = 0
                                }
                              }
                            }
                          }}
                          className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                            isCurrent 
                              ? 'bg-black text-white' 
                              : 'border border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          v{version.versionNumber.toString().padStart(3, '0')}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Player Section */}
              <div className="mb-8 p-6 bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-lg animate-fade-in-delay">
                <div className="flex items-center gap-4">
                  <button
                    disabled={!track}
                    onClick={() => {
                      const currentFileUrl = currentVersion?.fileUrl || track.fileUrl
                      
                      if (currentTrack?.id === track.id) {
                        if (audioRef.current?.src.includes(currentFileUrl)) {
                          togglePlayPause()
                        } else {
                          playTrack({
                            id: track.id,
                            title: track.title,
                            description: track.description || '',
                            fileUrl: currentFileUrl,
                            imageUrl: track.imageUrl || null,
                            duration: currentVersion?.duration || track.duration || 0,
                            userId: track.userId,
                            user: track.user || null
                          })
                        }
                      } else {
                        playTrack({
                          id: track.id,
                          title: track.title,
                          description: track.description || '',
                          fileUrl: currentFileUrl,
                          imageUrl: track.imageUrl || null,
                          duration: currentVersion?.duration || track.duration || 0,
                          userId: track.userId,
                          user: track.user || null
                        })
                      }
                    }}
                    className="w-12 h-12 bg-black text-white rounded-full hover:bg-gray-800 transition-all hover:scale-105 flex items-center justify-center shadow-lg flex-shrink-0"
                  >
                    {currentTrack?.id === track.id && globalIsPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-end mb-2 text-xs font-mono">
                      <span className="text-black">
                        {currentTrack?.id === track.id ? formatTimestamp(globalCurrentTime) : '0:00'}
                      </span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span className="text-gray-500">
                        {formatDuration(currentVersion?.duration || track.duration || 0)}
                      </span>
                    </div>
                    
                    <div 
                      ref={waveformRef}
                      className="relative"
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = e.clientX - rect.left
                        const progress = x / rect.width
                        const duration = currentVersion?.duration || track.duration || 0
                        setHoverTime(progress * duration)
                        setMouseX(x)
                      }}
                      onMouseLeave={() => {
                        setHoverTime(null)
                        setMouseX(null)
                      }}
                    >
                      <Waveform
                        peaks={currentVersion?.waveformData?.full || track?.waveformData?.full || []}
                        height={100}
                        barWidth={4}
                        barGap={1}
                        progress={
                          currentTrack?.id === track.id && globalIsPlaying && globalDuration > 0 
                            ? globalCurrentTime / globalDuration 
                            : localSeekPosition
                        }
                        interactive={true}
                        baseColor="#d1d5db"
                        progressColor="#000000"
                        hoverColor="#6b7280"
                        duration={currentVersion?.duration || track?.duration || 0}
                        comments={filteredComments
                          .filter((c: any) => c.timestamp !== null && c.timestamp !== undefined)
                          .map((c: any) => ({
                            id: c.id,
                            timestamp: c.timestamp,
                            content: c.content,
                            username: c.user.username,
                            avatarUrl: c.user.avatarUrl
                          }))}
                        onCommentClick={(comment) => {
                          const duration = currentVersion?.duration || track?.duration || 0
                          if (duration > 0) {
                            const seekProgress = comment.timestamp / duration
                            setLocalSeekPosition(seekProgress)
                            
                            if (currentTrack?.id === track.id && globalDuration > 0) {
                              globalSeek(comment.timestamp)
                            }
                          }
                        }}
                        onSeek={(progress) => {
                          const duration = currentVersion?.duration || track?.duration || 0
                          
                          if (isSelectingTimestamp && duration) {
                            const seekTime = progress * duration
                            setCommentTimestamp(seekTime)
                            setIsSelectingTimestamp(false)
                            return
                          }
                          
                          setLocalSeekPosition(progress)
                          
                          if (currentTrack?.id === track.id) {
                            if (globalIsPlaying && globalDuration > 0) {
                              globalSeek(progress * globalDuration)
                            } else {
                              if (globalDuration > 0) {
                                globalSeek(progress * globalDuration)
                              }
                            }
                          } else {
                            playTrack({
                              id: track.id,
                              title: track.title,
                              description: track.description || '',
                              fileUrl: currentVersion?.fileUrl || track.fileUrl,
                              imageUrl: track.imageUrl || null,
                              duration: currentVersion?.duration || track.duration || 0,
                              userId: track.userId,
                              user: track.user || null
                            })
                            setTimeout(() => {
                              if (audioRef.current && audioRef.current.duration > 0) {
                                audioRef.current.currentTime = progress * audioRef.current.duration
                              }
                            }, 100)
                          }
                        }}
                        className="w-full"
                      />
                      
                      {hoverTime !== null && mouseX !== null && (
                        <div 
                          className="absolute pointer-events-none z-10"
                          style={{ 
                            left: `${mouseX}px`,
                            top: '-28px',
                            transform: 'translateX(-50%)'
                          }}
                        >
                          <div className="bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap font-mono">
                            {formatTimestamp(hoverTime)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="space-y-6 animate-fade-in-delay-2">
                {/* Comment Input */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {userProfile?.avatarUrl ? (
                      <img src={userProfile.avatarUrl} alt={userProfile.displayName || userProfile.username} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="text-xs font-mono text-gray-600">
                        {(userProfile?.displayName || userProfile?.username || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 relative">
                    {commentTimestamp !== null && (
                      <div className="absolute -top-6 left-0 flex items-center gap-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                          @{formatTimestamp(commentTimestamp)}
                        </span>
                        <button 
                          onClick={() => setCommentTimestamp(null)}
                          className="text-xs text-gray-500 hover:text-black"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={handleCommentKeyDown}
                      placeholder="Add a comment..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black font-mono text-sm"
                    />
                  </div>
                  
                  <button 
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim() || addCommentMutation.isPending}
                    className="flex items-center justify-center w-9 h-9 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    title="Send comment"
                  >
                    {addCommentMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                {/* Comments Display */}
                {filteredComments.length > 0 && (
                  <div className="space-y-4">
                    {filteredComments.map((comment: any) => (
                      <div key={comment.id} className="flex gap-3 group relative">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {comment.user.avatarUrl ? (
                            <img src={comment.user.avatarUrl} alt={comment.user.displayName || comment.user.username} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <span className="text-xs font-mono text-gray-600">
                              {(comment.user.displayName || comment.user.username || 'U').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium font-mono">
                                @{comment.user.username}
                              </span>
                              {comment.timestamp !== null && (
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                  @{formatTimestamp(comment.timestamp)}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {userProfile?.id === comment.user.id && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                disabled={deleteCommentMutation.isPending}
                                className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-all"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 font-mono leading-relaxed whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-6 space-y-3">
                {/* Collections - moved to top for better visibility */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-mono font-semibold text-gray-900 uppercase tracking-wider">In Collections</h3>
                    {isOwner && (
                      <button
                        onClick={() => setShowAddToProjectModal(true)}
                        className="px-2 py-1 text-xs font-mono border border-gray-300 hover:border-gray-400 rounded transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    )}
                  </div>
                  {track.projectTracks && track.projectTracks.length > 0 ? (
                    <div className="space-y-1">
                      {track.projectTracks.map((projectTrack: any) => (
                        <Link
                          key={projectTrack.project.id}
                          to={`/projects/${projectTrack.project.id}`}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-md transition-colors group"
                        >
                          {projectTrack.project.type === 'playlist' ? (
                            <Music className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <Folder className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-mono truncate group-hover:text-black">
                              {projectTrack.project.title}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Folder className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 mb-3">
                        {isOwner ? "Not in any collections" : "No collections"}
                      </p>
                      {isOwner && (
                        <button
                          onClick={() => setShowAddToProjectModal(true)}
                          className="px-3 py-1.5 bg-black text-white text-xs font-mono hover:bg-gray-800 transition-colors rounded"
                        >
                          Add to collection
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Versions - simplified since we have the version bar above */}
                <div className="bg-white border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-mono font-semibold text-gray-600 uppercase tracking-wider">Version History</h3>
                    {isOwner && (
                      <button
                        onClick={() => setShowVersionModal(true)}
                        className="px-2 py-1 text-xs font-mono text-gray-600 hover:text-black transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        New
                      </button>
                    )}
                  </div>
                  
                  {versionsLoading ? (
                    <div className="space-y-2">
                      <div className="skeleton-shimmer h-12 rounded" />
                      <div className="skeleton-shimmer h-12 rounded" />
                    </div>
                  ) : (
                    <>
                      {/* Pinned Version */}
                      <div className="mb-2">
                        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Pinned</div>
                        <div
                          onClick={() => {
                            if (currentVersion && track) {
                              setCurrentVersion(null)
                              setLocalSeekPosition(0)
                              if (currentTrack?.id === track.id && globalIsPlaying) {
                                pauseTrack()
                                if (audioRef.current) {
                                  audioRef.current.currentTime = 0
                                }
                              }
                            }
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-md transition-colors group cursor-pointer ${
                            !currentVersion ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <Pin className="w-3 h-3 text-gray-400" />
                                <span className="text-xs font-mono font-medium">v{track.version || '001'}</span>
                              </div>
                              <div className="text-[10px] opacity-60 mt-0.5">
                                Original • {formatDate(track.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Version History */}
                      {trackVersions.length > 0 && (
                        <>
                          <div className="border-t border-gray-100 my-2" />
                          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">History</div>
                          
                          {trackVersions.map((version: any, index: number) => {
                            const isCurrent = currentVersion?.id === version.id
                            return (
                              <React.Fragment key={version.id}>
                                <div
                                  onClick={() => {
                                    if (!isCurrent && version.fileUrl && track) {
                                      setCurrentVersion(version)
                                      setLocalSeekPosition(0)
                                      if (currentTrack?.id === track.id && globalIsPlaying) {
                                        pauseTrack()
                                        if (audioRef.current) {
                                          audioRef.current.currentTime = 0
                                        }
                                      }
                                    }
                                  }}
                                  className={`w-full text-left px-2.5 py-2 rounded-md transition-colors group cursor-pointer ${
                                    isCurrent ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="text-xs font-mono font-medium">
                                        v{version.versionNumber.toString().padStart(3, '0')}
                                      </div>
                                      <div className="text-[10px] opacity-60 mt-0.5">
                                        {version.description || 'Version'} • {new Date(version.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </div>
                                    </div>
                                    {isOwner && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setVersionToPin(version)
                                          setShowPinConfirmModal(true)
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
                                        title="Pin this version"
                                        disabled={pinVersionMutation.isPending}
                                      >
                                        <Pin className="w-3 h-3 text-gray-400 hover:text-black" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {index < trackVersions.length - 1 && (
                                  <div className="border-t border-gray-50 my-1" />
                                )}
                              </React.Fragment>
                            )
                          })}
                        </>
                      )}
                    </>
                  )}
                </div>
                
                {/* Track Details */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-xs font-mono font-semibold text-gray-700 uppercase tracking-wider mb-3">Details</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duration</span>
                      <span className="font-mono">{formatDuration(currentVersion?.duration || track.duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Uploaded</span>
                      <span className="font-mono">{formatDate(track.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Visibility</span>
                      <span className="font-mono capitalize">{track.visibility || 'private'}</span>
                    </div>
                    {track.tags && track.tags.length > 0 && (
                      <div>
                        <span className="text-gray-500 block mb-1">Tags</span>
                        <div className="flex flex-wrap gap-1">
                          {track.tags.map((tag: string) => (
                            <span key={tag} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals - keeping them minimal for now */}
      {/* Edit Modal */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        title="Edit Track"
      >
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              placeholder="Track title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              placeholder="Add a description..."
              rows={3}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="space-y-2">
              {/* Tag display */}
              {editTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {editTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Tag input */}
              <div className="relative">
                <input
                  type="text"
                  value={editTagInput}
                  onChange={(e) => {
                    const value = e.target.value
                    setEditTagInput(value)
                    if (value.trim()) {
                      const suggestions = tracks
                        .flatMap(t => t.tags || [])
                        .filter((tag, index, self) => self.indexOf(tag) === index)
                        .filter(tag => tag.toLowerCase().includes(value.toLowerCase()) && !editTags.includes(tag))
                        .slice(0, 5)
                      setTagSuggestions(suggestions)
                      setShowTagSuggestions(suggestions.length > 0)
                    } else {
                      setShowTagSuggestions(false)
                    }
                  }}
                  onKeyDown={handleEditTagKeyDown}
                  onFocus={() => {
                    if (editTagInput.trim() && tagSuggestions.length > 0) {
                      setShowTagSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowTagSuggestions(false), 200)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="Add tags (press Enter)"
                />
                
                {/* Tag suggestions dropdown */}
                {showTagSuggestions && tagSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                    {tagSuggestions.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleSelectTagSuggestion(tag)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
            <select
              value={editVisibility}
              onChange={(e) => setEditVisibility(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="private">Private</option>
              <option value="workspace">Workspace</option>
              <option value="public">Public</option>
            </select>
          </div>

          {/* Version */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
            <input
              type="text"
              value={editVersion}
              onChange={(e) => setEditVersion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              placeholder="001"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={updateTrackMutation.isPending || !editTitle.trim()}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {updateTrackMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)}
        hideCloseButton
      >
        <div className="p-6">
          <h2 className="text-lg font-mono font-medium mb-4">Delete Track</h2>
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to delete "{track?.title}"? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={deleteTrackMutation.isPending}
              className="px-6 py-2.5 bg-red-600 text-white font-mono text-sm hover:bg-red-700 disabled:bg-gray-400 transition-colors"
            >
              {deleteTrackMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-6 py-2.5 border border-gray-300 font-mono text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Add to Collection Modal */}
      <Modal 
        isOpen={showAddToProjectModal} 
        onClose={() => {
          setShowAddToProjectModal(false)
          setSelectedCollectionIds(new Set())
          setCollectionSearchQuery('')
        }}
        title="Add to Collection"
      >
        <div className="">
          {/* Search Bar */}
          <div className="p-6 pb-0">
            <div className="relative">
              <input
                type="text"
                value={collectionSearchQuery}
                onChange={(e) => setCollectionSearchQuery(e.target.value)}
                placeholder="Search collections..."
                className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="p-6">
            {(loadingProjects || playlistsLoading) ? (
              <div className="space-y-3">
                <div className="skeleton-shimmer h-14 rounded" />
                <div className="skeleton-shimmer h-14 rounded" />
                <div className="skeleton-shimmer h-14 rounded" />
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {(() => {
                  // Combine projects and playlists into one list
                  const allItems = [
                    ...(projectsData?.projects || []).map((p: any) => ({ ...p, collectionType: 'project' })),
                    ...(playlistsData || []).map((p: any) => ({ ...p, collectionType: 'playlist' }))
                  ]
                  
                  // Filter based on search query
                  const filteredItems = allItems.filter((item: any) => 
                    !collectionSearchQuery || 
                    item.title.toLowerCase().includes(collectionSearchQuery.toLowerCase()) ||
                    item.description?.toLowerCase().includes(collectionSearchQuery.toLowerCase())
                  )
                  
                  return filteredItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Folder className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      {collectionSearchQuery ? 'No collections found' : 'No collections yet'}
                    </p>
                  </div>
                ) : (
                  filteredItems.map((item: any) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCollectionIds.has(item.id)}
                        onChange={(e) => {
                          const newSelection = new Set(selectedCollectionIds)
                          if (e.target.checked) {
                            newSelection.add(item.id)
                          } else {
                            newSelection.delete(item.id)
                          }
                          setSelectedCollectionIds(newSelection)
                        }}
                        className="w-4 h-4 text-black"
                      />
                      
                      {/* Image */}
                      <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {item.collectionType === 'playlist' || item.type === 'playlist' ? (
                              <Music className="w-5 h-5 text-gray-400" />
                            ) : (
                              <Folder className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">
                            {item.title}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            item.collectionType === 'playlist' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.collectionType === 'playlist' ? 'playlist' : item.type || 'project'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          {item.trackCount !== undefined && (
                            <span>{item.trackCount} tracks</span>
                          )}
                          {item.createdAt && (
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))
                )
                })()}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {(() => {
                  const count = selectedCollectionIds.size
                  if (count === 0) return '0 collections selected'
                  
                  // Get selected items to count types
                  const allItems = [
                    ...(projectsData?.projects || []).map((p: any) => ({ ...p, collectionType: 'project' })),
                    ...(playlistsData || []).map((p: any) => ({ ...p, collectionType: 'playlist' }))
                  ]
                  
                  const selectedItems = allItems.filter(item => selectedCollectionIds.has(item.id))
                  const projectCount = selectedItems.filter(item => item.collectionType === 'project').length
                  const playlistCount = selectedItems.filter(item => item.collectionType === 'playlist').length
                  
                  const parts = []
                  if (projectCount > 0) {
                    parts.push(`${projectCount} project${projectCount > 1 ? 's' : ''}`)
                  }
                  if (playlistCount > 0) {
                    parts.push(`${playlistCount} playlist${playlistCount > 1 ? 's' : ''}`)
                  }
                  
                  return `${parts.join(', ')} selected`
                })()}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddToProjectModal(false)
                    setSelectedCollectionIds(new Set())
                    setCollectionSearchQuery('')
                  }}
                  className="px-6 py-2 text-sm text-gray-600 hover:text-black transition-colors"
                >
                  cancel
                </button>
                <button
                  onClick={handleAddToProject}
                  disabled={selectedCollectionIds.size === 0 || addingToProject}
                  className="px-6 py-2 bg-gray-700 text-white text-sm rounded hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  add
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Pin Version Confirmation Modal */}
      <Modal 
        isOpen={showPinConfirmModal} 
        onClose={() => {
          setShowPinConfirmModal(false)
          setVersionToPin(null)
        }}
        hideCloseButton
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-3">Pin Version</h2>
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to pin v{versionToPin?.versionNumber.toString().padStart(3, '0')}? 
            This will replace v{track?.version || '001'} as the default version that plays.
          </p>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowPinConfirmModal(false)
                setVersionToPin(null)
              }}
              className="px-4 py-2 text-sm font-mono border border-gray-200 hover:border-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePinVersion}
              disabled={pinVersionMutation.isPending}
              className="px-4 py-2 text-sm font-mono bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
            >
              {pinVersionMutation.isPending ? 'Pinning...' : 'Pin Version'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}