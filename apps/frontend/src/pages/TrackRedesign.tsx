import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
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
import { 
  Play, Pause, ArrowLeft, Edit2, Trash2, Lock, Globe, Music, X, Image, 
  MessageCircle, Upload, Send, Folder, Plus, Heart, Calendar, Clock, 
  BarChart3, Pin, Check, ChevronDown, MoreVertical, Share2, Copy, Flag
} from 'lucide-react'
import Waveform from '../components/Waveform'
import Modal from '../components/Modal'
import { sidebarEvents, SIDEBAR_EVENTS } from '../lib/events'
import toast from 'react-hot-toast'

export default function TrackRedesign() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // Player context
  const { 
    playTrack, 
    pauseTrack, 
    currentTrack, 
    isPlaying: globalIsPlaying,
    currentTime: globalCurrentTime,
    duration: globalDuration,
    seek
  } = usePlayer()
  
  // Data fetching
  const { data: trackData, isLoading: trackLoading, error: trackError } = useTrack(id)
  const { data: versionsData = [] } = useTrackVersions(id)
  const { data: commentsData = [] } = useTrackComments(id)
  const { data: projectsData } = useUserProjects(1, 100)
  
  // Mutations
  const updateTrackMutation = useUpdateTrack()
  const deleteTrackMutation = useDeleteTrack()
  const pinVersionMutation = usePinTrackVersion()
  const updateImageMutation = useUpdateTrackImage()
  const addCommentMutation = useAddTrackComment()
  const deleteCommentMutation = useDeleteTrackComment()
  const addToProjectMutation = useAddTrackToProject()
  
  // Local state
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showVersionsDropdown, setShowVersionsDropdown] = useState(false)
  const [showCollectionsModal, setShowCollectionsModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<any>(null)
  const [localSeekPosition, setLocalSeekPosition] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [commentTimestamp, setCommentTimestamp] = useState<number | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  
  // Edit form state
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editVisibility, setEditVisibility] = useState('private')
  
  // Refs
  const imageInputRef = useRef<HTMLInputElement>(null)
  const versionsDropdownRef = useRef<HTMLDivElement>(null)
  
  const track = trackData
  const trackVersions = versionsData || []
  const comments = commentsData || []
  const isOwner = user?.uid === track?.userId
  const isCurrentlyPlaying = currentTrack?.id === track?.id && globalIsPlaying
  
  // Initialize edit form
  useEffect(() => {
    if (track) {
      setEditTitle(track.title)
      setEditDescription(track.description || '')
      setEditTags(track.tags || [])
      setEditVisibility(track.visibility || 'private')
    }
  }, [track])
  
  // Set current version
  useEffect(() => {
    if (trackVersions.length > 0) {
      const pinnedVersion = trackVersions.find((v: any) => v.isPinned)
      setCurrentVersion(pinnedVersion || trackVersions[0])
    }
  }, [trackVersions])
  
  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (versionsDropdownRef.current && !versionsDropdownRef.current.contains(e.target as Node)) {
        setShowVersionsDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Error handling
  useEffect(() => {
    if (trackError) {
      const error = trackError as any
      if (error.response?.status === 404) {
        navigate('/dashboard')
      }
    }
  }, [trackError, navigate])
  
  // Handlers
  const handlePlayPause = () => {
    if (!track) return
    
    if (isCurrentlyPlaying) {
      pauseTrack()
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
    }
  }
  
  const handleSeek = (progress: number) => {
    if (currentTrack?.id === track?.id && globalDuration > 0) {
      seek(progress * globalDuration)
    }
  }
  
  const handleVersionChange = (version: any) => {
    setCurrentVersion(version)
    setShowVersionsDropdown(false)
    
    // If currently playing, switch to new version
    if (isCurrentlyPlaying && track) {
      playTrack({
        id: track.id,
        title: track.title,
        description: track.description || '',
        fileUrl: version.fileUrl,
        imageUrl: track.imageUrl || null,
        duration: version.duration || 0,
        userId: track.userId,
        user: track.user || null
      })
    }
  }
  
  const handlePinVersion = async (versionId: string) => {
    if (!id) return
    try {
      await pinVersionMutation.mutateAsync({ trackId: id, versionId })
      toast.success('Version pinned')
    } catch (error) {
      toast.error('Failed to pin version')
    }
  }
  
  const handleImageUpload = async (file: File) => {
    if (!id) return
    try {
      const formData = new FormData()
      formData.append('image', file)
      await updateImageMutation.mutateAsync({ id, formData })
      toast.success('Cover image updated')
    } catch (error) {
      toast.error('Failed to update image')
    }
  }
  
  const handleUpdateTrack = async () => {
    if (!id) return
    try {
      await updateTrackMutation.mutateAsync({
        id,
        data: {
          title: editTitle,
          description: editDescription,
          tags: editTags,
          visibility: editVisibility
        }
      })
      setShowEditModal(false)
      toast.success('Track updated')
    } catch (error) {
      toast.error('Failed to update track')
    }
  }
  
  const handleDeleteTrack = async () => {
    if (!id) return
    try {
      await deleteTrackMutation.mutateAsync(id)
      navigate('/dashboard')
      toast.success('Track deleted')
    } catch (error) {
      toast.error('Failed to delete track')
    }
  }
  
  const handleAddComment = async () => {
    if (!id || !commentText.trim()) return
    try {
      await addCommentMutation.mutateAsync({
        trackId: id,
        data: {
          content: commentText,
          timestamp: commentTimestamp,
          version: currentVersion?.versionNumber.toString().padStart(3, '0')
        }
      })
      setCommentText('')
      setCommentTimestamp(null)
      toast.success('Comment added')
    } catch (error) {
      toast.error('Failed to add comment')
    }
  }
  
  const handleAddToProject = async () => {
    if (!id || !selectedProjectId) return
    try {
      await addToProjectMutation.mutateAsync({ 
        projectId: selectedProjectId, 
        trackId: id 
      })
      setShowCollectionsModal(false)
      setSelectedProjectId(null)
      toast.success('Added to collection')
    } catch (error) {
      toast.error('Failed to add to collection')
    }
  }
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  if (trackLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }
  
  if (!track) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Track not found</div>
      </div>
    )
  }
  
  const projectsInTrack = track.projectTracks?.map((pt: any) => pt.project) || []
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Fixed Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to tracks</span>
            </Link>
            
            {/* Actions */}
            {isOwner && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edit track"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-600"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* Title & Metadata Section */}
          <div className="mb-8">
            <div className="flex items-start gap-6">
              {/* Artwork */}
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
                  className={`w-24 h-24 bg-white rounded-lg overflow-hidden shadow-sm relative group ${
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
                      <Music className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  {isOwner && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                      <Image className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Title & Meta */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{track.title}</h1>
                
                {/* Metadata pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    track.visibility === 'public' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {track.visibility === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {track.visibility || 'Private'}
                  </span>
                  
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                    <BarChart3 className="w-3 h-3" />
                    {track.playCount || 0} plays
                  </span>
                  
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                    <Clock className="w-3 h-3" />
                    {formatDuration(currentVersion?.duration || track.duration || 0)}
                  </span>
                  
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                    <Calendar className="w-3 h-3" />
                    {formatDate(track.createdAt)}
                  </span>
                </div>
                
                {/* Description */}
                {track.description && (
                  <p className="mt-3 text-sm text-gray-600">{track.description}</p>
                )}
                
                {/* Tags */}
                {track.tags && track.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {track.tags.map((tag: string) => (
                      <span key={tag} className="text-xs text-gray-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Waveform Section */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                {/* Version Selector */}
                <div className="flex items-center justify-between mb-4">
                  <div className="relative" ref={versionsDropdownRef}>
                    <button
                      onClick={() => setShowVersionsDropdown(!showVersionsDropdown)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {currentVersion?.isPinned && (
                        <Pin className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      <span className="text-sm font-medium">
                        v{currentVersion?.versionNumber.toString().padStart(3, '0') || track.version || '001'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                    
                    {showVersionsDropdown && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <div className="p-2">
                          {trackVersions.map((version: any) => (
                            <div
                              key={version.id}
                              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                              onClick={() => handleVersionChange(version)}
                            >
                              <div className="flex items-center gap-2">
                                {version.isPinned && (
                                  <Pin className="w-3.5 h-3.5 text-blue-600" />
                                )}
                                <div>
                                  <div className="text-sm font-medium">
                                    v{version.versionNumber.toString().padStart(3, '0')}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatDate(version.createdAt)}
                                  </div>
                                </div>
                              </div>
                              {currentVersion?.id === version.id && (
                                <Check className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                          ))}
                        </div>
                        {isOwner && (
                          <div className="border-t border-gray-200 p-2">
                            <button className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg text-sm">
                              <Plus className="w-4 h-4" />
                              Upload new version
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Play Button */}
                  <button
                    onClick={handlePlayPause}
                    className="flex items-center justify-center w-12 h-12 bg-black hover:bg-gray-800 text-white rounded-full transition-colors"
                  >
                    {isCurrentlyPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                </div>
                
                {/* Waveform */}
                <div className="h-32">
                  <Waveform
                    peaks={currentVersion?.waveformData?.full || track.waveformData?.full || []}
                    height={128}
                    barWidth={3}
                    barGap={1}
                    progress={isCurrentlyPlaying ? globalCurrentTime / globalDuration : 0}
                    interactive={true}
                    onSeek={handleSeek}
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* Comments Section */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold mb-4">Comments</h3>
                
                {/* Comment Input */}
                <div className="flex gap-3 mb-4 pb-4 border-b border-gray-100">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Comments List */}
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-gray-500">No comments yet</p>
                  ) : (
                    comments.map((comment: any) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {comment.user?.displayName || comment.user?.username}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            {/* Right Column */}
            <div className="space-y-6">
              {/* Collections */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Collections</h3>
                  {isOwner && (
                    <button
                      onClick={() => setShowCollectionsModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Add to collection
                    </button>
                  )}
                </div>
                
                {projectsInTrack.length === 0 ? (
                  <p className="text-sm text-gray-500">Not in any collections</p>
                ) : (
                  <div className="space-y-2">
                    {projectsInTrack.map((project: any) => (
                      <Link
                        key={project.id}
                        to={`/project/${project.id}`}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Folder className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{project.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Track Details */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold mb-4">Details</h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Uploaded by</dt>
                    <dd className="font-medium">
                      {track.user?.displayName || track.user?.username}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">File size</dt>
                    <dd className="font-medium">
                      {currentVersion?.fileSize ? 
                        `${(currentVersion.fileSize / 1024 / 1024).toFixed(1)} MB` : 
                        'Unknown'
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Version count</dt>
                    <dd className="font-medium">{trackVersions.length}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {showEditModal && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Track"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Visibility</label>
              <select
                value={editVisibility}
                onChange={(e) => setEditVisibility(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-black transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTrack}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      {showDeleteModal && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Track"
        >
          <div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete "{track.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-black transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTrack}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Track
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      {showCollectionsModal && (
        <Modal
          isOpen={showCollectionsModal}
          onClose={() => setShowCollectionsModal(false)}
          title="Add to Collection"
        >
          <div className="space-y-4">
            <div className="max-h-64 overflow-y-auto">
              {(projectsData?.projects || []).map((project: any) => (
                <label
                  key={project.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedProjectId === project.id 
                      ? 'bg-gray-100' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="project"
                    checked={selectedProjectId === project.id}
                    onChange={() => setSelectedProjectId(project.id)}
                    className="w-4 h-4"
                  />
                  <Folder className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{project.title}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setShowCollectionsModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-black transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToProject}
                disabled={!selectedProjectId}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Collection
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}