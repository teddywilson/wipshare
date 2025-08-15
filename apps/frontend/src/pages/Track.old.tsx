import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiClient } from '../lib/api-client'
import { useAuth } from '../lib/auth-context'
import { useData } from '../contexts/DataContext'
import { usePlayer } from '../contexts/PlayerContext'
import { Play, Pause, ArrowLeft, Edit, Trash2, Lock, Music, X, Image, MessageCircle, Upload as UploadIcon, Send, Folder, Plus, Heart, Calendar, Clock, BarChart3, Pin } from 'lucide-react'
import Waveform from '../components/Waveform'
import Modal from '../components/Modal'
import { sidebarEvents, SIDEBAR_EVENTS } from '../lib/events'

export default function Track() {
  const { id } = useParams<{ id: string }>()
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()
  const { tracks, refreshTracks } = useData()
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
  
  const [track, setTrack] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [versionsLoading, setVersionsLoading] = useState(true)
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [contentReady, setContentReady] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [mouseX, setMouseX] = useState<number | null>(null)
  const [localSeekPosition, setLocalSeekPosition] = useState<number>(0) // Track local seek position
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
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  
  // Comment state
  const [commentText, setCommentText] = useState('')
  const [commentTimestamp, setCommentTimestamp] = useState<number | null>(null)
  const [isSelectingTimestamp, setIsSelectingTimestamp] = useState(false)
  const [attachToCurrentVersion, setAttachToCurrentVersion] = useState(true)
  const [comments, setComments] = useState<any[]>([])
  const [filteredComments, setFilteredComments] = useState<any[]>([])
  const [trackComments, setTrackComments] = useState<any[]>([])
  const [submittingComment, setSubmittingComment] = useState(false)
  
  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  
  // Version upload state
  const [versionFile, setVersionFile] = useState<File | null>(null)
  const [versionDescription, setVersionDescription] = useState('')
  const [versionNumber, setVersionNumber] = useState('')
  const [makeDefaultVersion, setMakeDefaultVersion] = useState(false) // Unchecked by default
  const [uploadingVersion, setUploadingVersion] = useState(false)
  const [versionUploaded, setVersionUploaded] = useState(false)
  const [versionUploadProgress, setVersionUploadProgress] = useState(0)
  const [uploadedVersion, setUploadedVersion] = useState<any>(null)
  const [trackVersions, setTrackVersions] = useState<any[]>([])
  const versionInputRef = useRef<HTMLInputElement | null>(null)
  const versionProgressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [currentVersion, setCurrentVersion] = useState<any>(null)
  const [currentPlayingVersionId, setCurrentPlayingVersionId] = useState<string | null>(null)
  
  // Project management state
  const [userProjects, setUserProjects] = useState<any[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [addingToProject, setAddingToProject] = useState(false)
  const [activeTab, setActiveTab] = useState<'project' | 'playlist'>('project')

  // Sync local seek position with global playing position when playing
  useEffect(() => {
    if (currentTrack?.id === track?.id && globalIsPlaying && globalDuration > 0) {
      setLocalSeekPosition(globalCurrentTime / globalDuration)
    }
  }, [globalCurrentTime, globalDuration, currentTrack?.id, track?.id, globalIsPlaying])

  const fetchTrack = async (forceRefresh = false) => {
    if (!id) return
    
    try {
      // Clear cache if force refresh is requested
      if (forceRefresh) {
        const cacheKey = `track_${id}`
        sessionStorage.removeItem(cacheKey)
      }
      
      // Fetch track details first (required)
      const data = await apiClient.getTrack(id)
      const trackData = data.track
      
      // Immediately cache for smoother navigation
      const cacheKey = `track_${id}`
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          value: data,
          timestamp: Date.now()
        }))
      } catch (e) {
        // Ignore cache errors
      }
      
      setTrack(trackData)
      
      // Update edit form with current values
      setEditTitle(trackData.title)
      setEditDescription(trackData.description || '')
      setEditTags(trackData.tags || [])
      setEditVisibility(trackData.visibility || 'private')
      setEditVersion(trackData.version || '001')
      
      // Set the currently playing version ID based on pinned version
      if (trackData.versions && trackData.versions.length > 0) {
        const pinnedVersion = trackData.versions.find((v: any) => v.isPinned)
        if (pinnedVersion) {
          setCurrentPlayingVersionId(pinnedVersion.id)
          setCurrentVersion(pinnedVersion)
        }
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        navigate('/tracks')
      } else {
        console.error('Failed to fetch track:', error)
      }
    }
  }

  const fetchTrackVersions = async () => {
    if (!id) return
    try {
      const versionsData = await apiClient.getTrackVersions(id)
      const versions = versionsData.versions || []
      console.log('Fetched versions:', versions)
      setTrackVersions(versions)
      
      // Update current version based on pinned version
      const pinnedVersion = versions.find((v: any) => v.isPinned)
      console.log('Pinned version found:', pinnedVersion)
      if (pinnedVersion) {
        setCurrentVersion(pinnedVersion)
        setCurrentPlayingVersionId(pinnedVersion.id)
      } else if (track) {
        // Fall back to version number from track
        const currentVer = versions.find((v: any) => 
          v.versionNumber === parseInt(track.version)
        )
        if (currentVer) {
          setCurrentVersion(currentVer)
        }
      }
      
      setVersionsLoading(false)
    } catch (error) {
      console.error('Failed to fetch track versions:', error)
      setVersionsLoading(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      if (!id) return
      
      try {
        // Fetch track details first (required)
        const data = await apiClient.getTrack(id)
        const trackData = data.track
        setTrack(trackData)
        
        // Initialize edit form with current values
        setEditTitle(trackData.title)
        setEditDescription(trackData.description || '')
        setEditTags(trackData.tags || [])
        setEditVisibility(trackData.visibility || 'private')
        setEditVersion(trackData.version || '001')
        
        // Set loading to false early so user can see the track
        setLoading(false)
        
        // Small delay to ensure smooth transition
        setTimeout(() => setContentReady(true), 50)
        
        // Fetch versions and comments in parallel (non-blocking)
        const fetchAdditionalData = async () => {
          const [versionsResult, commentsResult] = await Promise.allSettled([
            apiClient.getTrackVersions(id),
            apiClient.getTrackComments(id)
          ])
          
          // Handle versions
          if (versionsResult.status === 'fulfilled') {
            const versions = versionsResult.value.versions || []
            setTrackVersions(versions)
            
            // Set current version based on pinned version or track version number
            const pinnedVersion = versions.find((v: any) => v.isPinned)
            if (pinnedVersion) {
              setCurrentVersion(pinnedVersion)
              setCurrentPlayingVersionId(pinnedVersion.id)
            } else {
              const currentVer = versions.find((v: any) => 
                v.versionNumber === parseInt(trackData.version)
              )
              if (currentVer) {
                setCurrentVersion(currentVer)
              }
            }
          } else {
            console.log('No versions found')
          }
          setVersionsLoading(false)
          
          // Handle comments
          if (commentsResult.status === 'fulfilled') {
            setComments(commentsResult.value || [])
            // Filter comments for current version
            const trackComments = (commentsResult.value || []).filter((c: any) => 
              !c.version || c.version === trackData.version || c.version === ''
            )
            setFilteredComments(trackComments)
            setTrackComments(commentsResult.value || [])
          } else {
            console.log('No comments found')
          }
          setCommentsLoading(false)
        }
        
        // Fetch additional data without blocking the main render
        fetchAdditionalData()
        
      } catch (error: any) {
        console.error('Error fetching track:', error)
        setLoading(false)
        if (error.response?.status === 404) {
          navigate('/dashboard')
        } else if (error.response?.status === 403) {
          navigate('/dashboard')
        } else {
          console.error('Failed to load track:', error)
        }
      }
    }

    loadData()
  }, [id, navigate])

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
    setEditError(null)
    setSaving(true)
    
    try {
      await apiClient.updateTrack(track.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        tags: editTags,
        visibility: editVisibility,
        version: editVersion
      })
      
      // Update local state
      setTrack({
        ...track,
        title: editTitle.trim(),
        description: editDescription.trim(),
        tags: editTags,
        visibility: editVisibility,
        version: editVersion
      })
      
      // Force refresh tracks to update sidebar immediately
      await refreshTracks(true)
      // Emit event to refresh sidebar tags
      sidebarEvents.emit(SIDEBAR_EVENTS.REFRESH_TAGS)
      
      setShowEditModal(false)
    } catch (error: any) {
      console.error('Failed to update track:', error)
      setEditError(error.response?.data?.message || 'Failed to update track')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!track) return
    
    try {
      await apiClient.deleteTrack(track.id)
      // Refresh tracks and navigate
      await refreshTracks(true)
      navigate('/dashboard')
    } catch (error) {
      console.error('Failed to delete track:', error)
    }
  }
  
  // Fetch user's projects when modal opens
  const fetchUserProjects = async () => {
    setLoadingProjects(true)
    try {
      const response = await apiClient.getUserProjects(1, 100) // Get up to 100 projects
      setUserProjects(response.projects || [])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }
  
  // Handle adding track to project
  const handleAddToProject = async () => {
    if (!selectedProjectId || !track) return
    
    setAddingToProject(true)
    try {
      await apiClient.addTrackToProject(selectedProjectId, track.id)
      
      // Refresh track data to show updated projects
      const response = await apiClient.getTrack(track.id)
      setTrack(response.track)
      
      // Close modal and reset
      setShowAddToProjectModal(false)
      setSelectedProjectId(null)
    } catch (error) {
      console.error('Failed to add track to project:', error)
    } finally {
      setAddingToProject(false)
    }
  }
  
  // Load projects when modal opens
  useEffect(() => {
    if (showAddToProjectModal && userProjects.length === 0) {
      fetchUserProjects()
    }
  }, [showAddToProjectModal])

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
    if (!file.type.startsWith('image/')) {
      console.error('Please select an image file')
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      console.error('Image must be less than 5MB')
      return
    }

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      
      const response = await apiClient.updateTrackImage(track.id, formData)
      
      // Update track with new image URL
      setTrack({
        ...track,
        imageUrl: response.track.imageUrl
      })
      
      // Refresh tracks in background
      refreshTracks(true)
    } catch (error) {
      console.error('Failed to upload image:', error)
    } finally {
      setUploadingImage(false)
    }
  }


  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitComment()
    }
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submittingComment) return
    
    setSubmittingComment(true)
    
    try {
      const commentData = {
        content: commentText.trim(),
        timestamp: commentTimestamp ?? undefined,
        version: currentVersion 
          ? currentVersion.versionNumber.toString().padStart(3, '0')
          : (track.version || '001')
      }
      
      const newComment = await apiClient.addTrackComment(id!, commentData)
      
      // Add the new comment to the comments list
      setComments(prev => [...prev, newComment])
      
      // Reset form
      setCommentText('')
      setCommentTimestamp(null)
      setAttachToCurrentVersion(true)
    } catch (error) {
      console.error('Error submitting comment:', error)
      // Failed to post comment
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return
    
    try {
      await apiClient.deleteTrackComment(id!, commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
      // Comment deleted successfully
    } catch (error) {
      console.error('Error deleting comment:', error)
      // Failed to delete comment
    }
  }

  const handleVersionFileSelect = async (file: File) => {
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
    setUploadingVersion(true)
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
    
    try {
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

      const response = await apiClient.uploadTrackVersion(track.id, formData)
      console.log('Version upload response:', response)
      console.log('makeDefaultVersion flag:', makeDefaultVersion)
      
      if (versionProgressIntervalRef.current) {
        clearInterval(versionProgressIntervalRef.current)
        versionProgressIntervalRef.current = null
      }
      setVersionUploadProgress(100)
      setUploadingVersion(false)
      setVersionUploaded(true)
      setUploadedVersion(response.version)
    } catch (err: any) {
      console.error('Version upload error:', err)
      setVersionUploadProgress(0)
      setUploadingVersion(false)
      setVersionFile(null)
      if (versionProgressIntervalRef.current) {
        clearInterval(versionProgressIntervalRef.current)
        versionProgressIntervalRef.current = null
      }
    }
  }

  const handleSaveVersion = async () => {
    if (!uploadedVersion) return
    
    try {
      // The version has already been uploaded with the makeDefault flag
      // We just need to refresh the data to show the updated state
      
      // Force refresh both track and versions (bypass cache)
      await fetchTrack(true)
      await fetchTrackVersions()
      
      // Close modal and reset
      setShowVersionModal(false)
      setVersionFile(null)
      setVersionDescription('')
      setVersionNumber('')
      setMakeDefaultVersion(false)
      setVersionUploaded(false)
      setUploadedVersion(null)
      setVersionUploadProgress(0)
    } catch (error) {
      console.error('Failed to save version:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-6xl mx-auto">
            {/* Header skeleton */}
            <div className="mb-8">
              <div className="skeleton-shimmer h-4 w-32 rounded mb-6" />
              <div className="flex items-start gap-6">
                {/* Image skeleton */}
                <div className="skeleton-shimmer w-32 h-32 rounded-md" />
                
                {/* Info skeleton */}
                <div className="flex-1">
                  <div className="skeleton-shimmer h-6 w-3/4 rounded mb-3" />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="skeleton-shimmer h-3 w-3 rounded" />
                    <div className="skeleton-shimmer h-3 w-20 rounded" />
                    <div className="skeleton-shimmer h-3 w-16 rounded" />
                  </div>
                  <div className="skeleton-shimmer h-4 w-full rounded mb-2" />
                  <div className="skeleton-shimmer h-4 w-4/5 rounded" />
                </div>
              </div>
            </div>
            
            {/* Player skeleton */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="skeleton-shimmer w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <div className="skeleton-shimmer h-20 w-full rounded" />
                </div>
              </div>
            </div>
            
            {/* Stats skeleton */}
            <div className="flex items-center gap-6 mb-8 pb-4 border-b border-gray-100">
              <div className="skeleton-shimmer h-4 w-16 rounded" />
              <div className="skeleton-shimmer h-4 w-16 rounded" />
              <div className="skeleton-shimmer h-4 w-20 rounded" />
            </div>
            
            {/* Comments skeleton */}
            <div className="space-y-4">
              <div className="skeleton-shimmer h-4 w-24 rounded mb-4" />
              <div className="flex gap-3">
                <div className="skeleton-shimmer w-8 h-8 rounded-full" />
                <div className="skeleton-shimmer h-16 flex-1 rounded" />
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

  const isOwner = user?.uid === track.user?.firebaseUid

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
                  {uploadingImage && (
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
                      <h1 className="text-xl font-mono font-semibold">{track.title}</h1>
                    </div>
                    
                    {/* Show user info if not owner */}
                    {!isOwner && track.user && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-gray-200 rounded-full overflow-hidden">
                          {track.user.avatarUrl ? (
                            <img src={track.user.avatarUrl} alt={track.user.displayName} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                              {track.user.displayName?.[0] || track.user.username?.[0] || '?'}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-gray-600">
                          {track.user.displayName || track.user.username || 'Unknown'}
                        </span>
                      </div>
                    )}
                    
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
                        <Heart className="w-3.5 h-3.5" />
                        0 likes
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        {comments.length}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(track.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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

          {/* Player Section */}
          <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg animate-fade-in-delay">
            {/* Main Player Controls */}
            <div className="flex items-center gap-4">
              <button
                disabled={!track}
                onClick={() => {
                  // Make sure track is loaded
                  if (!track) return
                  
                  const currentFileUrl = currentVersion?.fileUrl || track.fileUrl
                  
                  // Check if this track is the current one in the global player
                  if (currentTrack?.id === track.id) {
                    // Check if we're playing the same version
                    if (audioRef.current?.src.includes(currentFileUrl)) {
                      // Same version, just toggle play/pause
                      togglePlayPause()
                    } else {
                      // Different version, load the new one
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
                    // Play this track with the current version
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
                {/* Time display */}
                <div className="flex items-center justify-end mb-2 text-xs font-mono">
                  <span className="text-black">
                    {currentTrack?.id === track.id ? formatTimestamp(globalCurrentTime) : '0:00'}
                  </span>
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="text-gray-500">
                    {formatDuration(currentVersion?.duration || track.duration || 0)}
                  </span>
                </div>
                
                {/* Waveform with hover time indicator */}
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
                    barWidth={3}
                    barGap={1}
                    progress={
                      currentTrack?.id === track.id && globalIsPlaying && globalDuration > 0 
                        ? globalCurrentTime / globalDuration 
                        : localSeekPosition
                    }
                    interactive={true} // Always interactive
                    baseColor="#d1d5db"
                    progressColor="#000000"
                    hoverColor="#6b7280"
                    duration={currentVersion?.duration || track?.duration || 0}
                    comments={comments
                      .filter(c => {
                        // Only show comments with timestamps
                        if (c.timestamp === null || c.timestamp === undefined) return false
                        
                        // Filter by version - if we have a currentVersion selected, only show comments for that version
                        // Otherwise show comments for the main track version
                        if (currentVersion) {
                          return c.version === currentVersion.versionNumber.toString().padStart(3, '0')
                        } else {
                          // Show comments for the main track version or comments without a version
                          return !c.version || c.version === (track.version || '001')
                        }
                      })
                      .map(c => ({
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
                        
                        // If this track is playing, actually seek in the player
                        if (currentTrack?.id === track.id && globalDuration > 0) {
                          globalSeek(comment.timestamp)
                        }
                      }
                    }}
                    onSeek={(progress) => {
                      const duration = currentVersion?.duration || track?.duration || 0
                      
                      // If we're selecting a timestamp for comment
                      if (isSelectingTimestamp && duration) {
                        const seekTime = progress * duration
                        setCommentTimestamp(seekTime)
                        setIsSelectingTimestamp(false)
                        return
                      }
                      
                      // Always update local seek position
                      setLocalSeekPosition(progress)
                      
                      // If this track is currently loaded in the player
                      if (currentTrack?.id === track.id) {
                        // If it's playing, seek immediately
                        if (globalIsPlaying && globalDuration > 0) {
                          globalSeek(progress * globalDuration)
                        } else {
                          // If paused, just seek to position (will play from here when play is pressed)
                          if (globalDuration > 0) {
                            globalSeek(progress * globalDuration)
                          }
                        }
                      } else {
                        // If this track isn't loaded, load it and seek to position
                        playTrack(track)
                        // Small delay to let track load before seeking
                        setTimeout(() => {
                          if (audioRef.current && audioRef.current.duration > 0) {
                            audioRef.current.currentTime = progress * audioRef.current.duration
                          }
                        }, 100)
                      }
                    }}
                    className="w-full"
                  />
                  
                  {/* Hover time indicator */}
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
                      {(trackVersions.length > 0 || currentVersion) && (
                        <span className="ml-1 text-gray-500">
                          on v{currentVersion ? currentVersion.versionNumber.toString().padStart(3, '0') : (track.version || '001')}
                        </span>
                      )}
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
                  onFocus={() => {
                    // Auto-set timestamp on focus if audio is playing and no timestamp is set
                    if (audioRef.current && !commentTimestamp && audioRef.current.currentTime > 0) {
                      setCommentTimestamp(audioRef.current.currentTime)
                    }
                  }}
                  placeholder="Add a comment..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black font-mono text-sm"
                />
              </div>
              
              <button 
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || submittingComment}
                className="flex items-center justify-center w-9 h-9 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                title="Send comment"
              >
                {submittingComment ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            
            {/* Comments Display */}
            {comments.length > 0 && (
              <div className="space-y-4">
                {comments
                  .filter((comment: any) => {
                    // Filter comments by current version
                    if (currentVersion) {
                      return comment.version === currentVersion.versionNumber.toString().padStart(3, '0')
                    } else {
                      // Show comments for the main track version or comments without a version
                      return !comment.version || comment.version === (track.version || '001')
                    }
                  })
                  .map((comment: any) => (
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
                              {comment.version && trackVersions.length > 0 && (
                                <span className="ml-1 text-gray-500">on v{comment.version}</span>
                              )}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {userProfile?.id === comment.user.id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
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
                {/* In Collections */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-mono font-semibold text-gray-700 uppercase tracking-wider">Collections</h3>
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

                {/* Versions */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-mono font-semibold text-gray-700 uppercase tracking-wider">Versions</h3>
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
                  
                  {/* Pinned Version */}
                  <div className="mb-2">
                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Pinned</div>
                    <div
                      onClick={() => {
                        if (currentVersion && track) {
                          setCurrentVersion(null)
                          // Reset seek position to beginning
                          setLocalSeekPosition(0)
                          // Stop playback if this track is currently playing
                          if (currentTrack?.id === track.id && globalIsPlaying) {
                            pauseTrack()
                            // Reset the audio position to the beginning
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
                            <span className="text-[10px] text-gray-500">(plays by default)</span>
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
                    </>
                  )}
                    
                    {/* Other versions */}
                    {trackVersions.map((version: any, index: number) => {
                      const isCurrent = currentVersion?.id === version.id
                      return (
                        <React.Fragment key={version.id}>
                        <div
                          onClick={() => {
                            if (!isCurrent && version.fileUrl && track) {
                              setCurrentVersion(version)
                              // Reset seek position to beginning
                              setLocalSeekPosition(0)
                              // Stop playback if this track is currently playing
                              if (currentTrack?.id === track.id && globalIsPlaying) {
                                pauseTrack()
                                // Reset the audio position to the beginning
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
                    )})}
                  </div>
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

      {/* Edit Modal */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        title="Edit Track"
      >
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5 font-mono">
              Title *
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-sm"
              placeholder="Track title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5 font-mono">
              Description
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-sm resize-none"
              placeholder="Add a description..."
            />
          </div>

          {/* Tags */}
          <div className="relative">
            <label className="block text-sm text-gray-700 mb-1.5 font-mono">
              Tags
            </label>
            <input
              type="text"
              value={editTagInput}
              onChange={(e) => setEditTagInput(e.target.value)}
              onKeyDown={handleEditTagKeyDown}
              onFocus={() => editTagInput && setShowTagSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-sm"
              placeholder="Type and press Enter, comma, or space to add tags"
            />
            
            {/* Tag Suggestions Dropdown */}
            {showTagSuggestions && tagSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                <div className="py-1">
                  <div className="px-3 py-1 text-xs text-gray-500 font-mono">
                    Suggested tags
                  </div>
                  {tagSuggestions.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleSelectTagSuggestion(tag)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between group"
                    >
                      <span className="font-mono">#{tag}</span>
                      <span className="text-xs text-gray-400 group-hover:text-gray-600">
                        {tracks.filter(t => t.tags?.includes(tag)).length} tracks
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {editTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {editTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-xs font-mono rounded"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Version */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5 font-mono">
              Version
            </label>
            <input
              type="text"
              value={editVersion}
              onChange={(e) => setEditVersion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-sm"
              placeholder="001"
              maxLength={10}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5 font-mono">
              Visibility
            </label>
            <select 
              value={editVisibility}
              onChange={(e) => setEditVisibility(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-sm"
            >
              <option value="private">Private (only you)</option>
              <option value="project" disabled>Project (coming soon)</option>
              <option value="channel" disabled>Channel (coming soon)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Private tracks are only visible to you. Projects and channels coming soon.
            </p>
          </div>

          {/* Error display */}
          {editError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-mono">
              {editError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSaveEdit}
              disabled={!editTitle.trim() || saving}
              className="px-6 py-2.5 bg-black text-white font-mono text-sm hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => setShowEditModal(false)}
              disabled={saving}
              className="px-6 py-2.5 border border-gray-300 font-mono text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)}
        hideCloseButton
      >
        <div className="p-6">
          <h2 className="text-lg font-mono font-medium mb-4">Delete Track</h2>
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to delete "{track.title}"? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              className="px-6 py-2.5 bg-red-600 text-white font-mono text-sm hover:bg-red-700 transition-colors"
            >
              Delete
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

      {/* Version Upload Modal */}
      <Modal 
        isOpen={showVersionModal} 
        onClose={() => {
          setShowVersionModal(false)
          setVersionFile(null)
          setVersionDescription('')
          setVersionNumber(track.version ? String(parseInt(track.version) + 1).padStart(3, '0') : '002')
          setMakeDefaultVersion(false) // Reset to unchecked
        }}
        title="Upload New Version"
      >
        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Upload a new version of "{track.title}". Previous versions will be preserved.
            </p>
          </div>

          {/* File Upload */}
          <div>
            <input
              ref={versionInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleVersionFileSelect(file)
              }}
              className="hidden"
              disabled={uploadingVersion || versionUploaded}
            />
            
            {!versionFile ? (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                onClick={() => !uploadingVersion && !versionUploaded && versionInputRef.current?.click()}
              >
                <UploadIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-mono text-gray-600">Click to select audio file</p>
                <p className="text-xs text-gray-400 mt-1">MP3, WAV, FLAC, AIFF, AAC/M4A • Max 100MB</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Music className="w-8 h-8 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-mono">{versionFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(versionFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  {!versionUploaded && (
                    <button
                      onClick={() => {
                        setVersionFile(null)
                        setUploadingVersion(false)
                        setVersionUploadProgress(0)
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                      disabled={uploadingVersion}
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </div>
                
                {/* Upload Progress */}
                {(uploadingVersion || versionUploadProgress > 0) && versionUploadProgress < 100 && (
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs font-mono text-gray-600">
                      <span>Uploading...</span>
                      <span>{versionUploadProgress}%</span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-black transition-all duration-300"
                        style={{ width: `${versionUploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {versionUploaded && (
                  <div className="mt-2 text-xs text-green-600 font-mono">
                    Upload complete! Configure version details below.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Version Number */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5 font-mono">
              Version Number
            </label>
            <input
              type="text"
              value={versionNumber || (track.version ? String(parseInt(track.version) + 1).padStart(3, '0') : '002')}
              onChange={(e) => setVersionNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-sm"
              placeholder="002"
              maxLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">
              Current version: v{track.version || '001'}
            </p>
          </div>

          {/* Version Description */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5 font-mono">
              Version Notes (optional)
            </label>
            <textarea
              value={versionDescription}
              onChange={(e) => setVersionDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-sm resize-none"
              placeholder="What changed in this version?"
            />
          </div>

          {/* Pin as Default Version */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={makeDefaultVersion}
                onChange={(e) => setMakeDefaultVersion(e.target.checked)}
                className="rounded"
              />
              <div>
                <span className="text-sm font-mono text-gray-700 flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5" />
                  Pin as default version
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {makeDefaultVersion 
                    ? 'This version will be pinned and play by default. The current pinned version will move to history.' 
                    : 'This version will be added to version history. The current pinned version remains default.'}
                </p>
              </div>
            </label>
          </div>

          {/* Version History Preview */}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 font-mono mb-3">Version History Preview</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono">v{versionNumber || (track.version ? String(parseInt(track.version) + 1).padStart(3, '0') : '002')}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  makeDefaultVersion 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {makeDefaultVersion ? 'New Default' : 'Archived'}
                </span>
              </div>
              {!makeDefaultVersion && (
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono">v{track.version || '001'}</span>
                  <span className="bg-black text-white text-xs px-2 py-0.5 rounded">Current Default</span>
                </div>
              )}
              {makeDefaultVersion && track.version && (
                <div className="flex items-center justify-between text-xs opacity-60">
                  <span className="font-mono">v{track.version}</span>
                  <span className="text-gray-500">Current</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSaveVersion}
              disabled={!versionUploaded || uploadingVersion}
              className="px-6 py-2.5 bg-black text-white font-mono text-sm hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {uploadingVersion ? 'Uploading...' : versionUploaded ? 'Save Version' : 'Upload Version'}
            </button>
            <button
              onClick={() => {
                setShowVersionModal(false)
                setVersionFile(null)
                setVersionDescription('')
                setVersionNumber('')
                setVersionUploaded(false)
                setUploadedVersion(null)
                setVersionUploadProgress(0)
                if (versionProgressIntervalRef.current) {
                  clearInterval(versionProgressIntervalRef.current)
                  versionProgressIntervalRef.current = null
                }
              }}
              className="px-6 py-2.5 border border-gray-300 font-mono text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Add to Project/Playlist Modal */}
      <Modal 
        isOpen={showAddToProjectModal} 
        onClose={() => {
          setShowAddToProjectModal(false)
          setSelectedProjectId(null)
        }}
        title="Add to Collection"
      >
        <div className="p-6 space-y-6">
          {/* Tab selector */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => {
                setActiveTab('project')
                setSelectedProjectId(null)
              }}
              className={`px-4 py-2 text-sm font-mono border-b-2 transition-colors ${
                activeTab === 'project'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => {
                setActiveTab('playlist')
                setSelectedProjectId(null)
              }}
              className={`px-4 py-2 text-sm font-mono border-b-2 transition-colors ${
                activeTab === 'playlist'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Playlists
            </button>
          </div>
          
          {loadingProjects ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton-shimmer h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <div>
              {/* Projects Tab */}
              {activeTab === 'project' && (
                <>
                  {userProjects.filter(p => p.type === 'project').length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {userProjects
                        .filter(project => project.type === 'project' && !track?.projectTracks?.some((pt: any) => pt.project.id === project.id))
                        .map((project) => (
                        <button
                          key={project.id}
                          onClick={() => setSelectedProjectId(project.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center gap-3 ${
                            selectedProjectId === project.id
                              ? 'border-black bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {project.imageUrl ? (
                            <img 
                              src={project.imageUrl} 
                              alt={project.title}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                              <Folder className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-mono text-sm">{project.title}</div>
                            <div className="text-xs text-gray-500">
                              {project.trackCount || 0} tracks
                            </div>
                          </div>
                        </button>
                      ))}
                      {userProjects.filter(p => p.type === 'project' && !track?.projectTracks?.some((pt: any) => pt.project.id === p.id)).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          This track is already in all your projects
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">You don't have any projects yet</p>
                      <Link 
                        to="/projects/new?type=project"
                        className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                      >
                        Create your first project
                      </Link>
                    </div>
                  )}
                </>
              )}
              
              {/* Playlists Tab */}
              {activeTab === 'playlist' && (
                <>
                  {userProjects.filter(p => p.type === 'playlist').length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {userProjects
                        .filter(project => project.type === 'playlist' && !track?.projectTracks?.some((pt: any) => pt.project.id === project.id))
                        .map((project) => (
                        <button
                          key={project.id}
                          onClick={() => setSelectedProjectId(project.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center gap-3 ${
                            selectedProjectId === project.id
                              ? 'border-black bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {project.imageUrl ? (
                            <img 
                              src={project.imageUrl} 
                              alt={project.title}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                              <Music className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-mono text-sm">{project.title}</div>
                            <div className="text-xs text-gray-500">
                              {project.trackCount || 0} tracks
                            </div>
                          </div>
                        </button>
                      ))}
                      {userProjects.filter(p => p.type === 'playlist' && !track?.projectTracks?.some((pt: any) => pt.project.id === p.id)).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          This track is already in all your playlists
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Music className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">You don't have any playlists yet</p>
                      <Link 
                        to="/projects/new?type=playlist"
                        className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                      >
                        Create your first playlist
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {selectedProjectId && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAddToProject}
                disabled={!selectedProjectId || addingToProject}
                className="px-6 py-2.5 bg-black text-white font-mono text-sm hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {addingToProject ? 'Adding...' : `Add to ${userProjects.find(p => p.id === selectedProjectId)?.type === 'playlist' ? 'Playlist' : 'Project'}`}
              </button>
              <button
                onClick={() => {
                  setShowAddToProjectModal(false)
                  setSelectedProjectId(null)
                }}
                disabled={addingToProject}
                className="px-6 py-2.5 border border-gray-300 font-mono text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
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
              onClick={async () => {
                try {
                  console.log('Pinning version:', versionToPin.id, 'for track:', track.id)
                  const pinResponse = await apiClient.pinTrackVersion(track.id, versionToPin.id)
                  console.log('Pin response:', pinResponse)
                  
                  // Refresh track data to get updated version info (force refresh to bypass cache)
                  await fetchTrack(true)
                  await fetchTrackVersions()
                  
                  setShowPinConfirmModal(false)
                  setVersionToPin(null)
                } catch (error) {
                  console.error('Failed to pin version:', error)
                  alert('Failed to pin version. Please check the console for details.')
                }
              }}
              className="px-4 py-2 text-sm font-mono bg-black text-white hover:bg-gray-800 transition-colors"
            >
              Pin Version
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}