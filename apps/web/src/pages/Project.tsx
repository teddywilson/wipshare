import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiClient } from '../lib/api-client'
import { ArrowLeft, Music, Upload, Settings, Users, Calendar, FolderOpen, X, Check, Search, Edit2, Save, Camera, MoreHorizontal, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import DraggableTrackList from '../components/DraggableTrackList'
import AddTracksModal from '../components/AddTracksModal'
import { 
  useProject, 
  useUpdateProject, 
  useUpdateProjectImage, 
  useAddTrackToProject,
  useReorderProjectTracks 
} from '../hooks/useProjectQueries'
import { useUserTracks } from '../hooks/useTrackQueries'
import { sidebarEvents, SIDEBAR_EVENTS } from '../lib/events'

interface ProjectDetails {
  id: string
  title: string
  description?: string
  imageUrl?: string
  type: string
  tracks?: any[]
  trackCount?: number
  createdAt: string
  updatedAt: string
  userId: string
}

export default function Project() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: project, isLoading: loading, error: projectError } = useProject(id)
  const { data: userTracks = [] } = useUserTracks()
  
  // Mutations
  const updateProjectMutation = useUpdateProject()
  const updateProjectImageMutation = useUpdateProjectImage()
  const addTrackToProjectMutation = useAddTrackToProject()
  const reorderProjectTracksMutation = useReorderProjectTracks()
  const [navigating, setNavigating] = useState(false) // For navigation feedback
  const [showAddTracksModal, setShowAddTracksModal] = useState(false)
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set())
  const [addingTracks, setAddingTracks] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedType, setEditedType] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // React Query handles data fetching automatically
  
  // Listen for project events to clear cache when updated elsewhere  
  useEffect(() => {
    const handleProjectUpdate = () => {
      // Clear any remaining sessionStorage cache
      sessionStorage.removeItem(`project_${id}`)
      // React Query will automatically refetch
    }

    const unsubscribeRefresh = sidebarEvents.on(SIDEBAR_EVENTS.REFRESH_PROJECTS, handleProjectUpdate)

    return () => {
      unsubscribeRefresh()
    }
  }, [id])

  useEffect(() => {
    if (project) {
      setEditedTitle(project.title)
      setEditedDescription(project.description || '')
      setEditedType(project.type)
    }
  }, [project])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-menu]')) {
        setShowMoreMenu(false)
      }
    }

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreMenu])

  // React Query automatically handles data fetching


  const toggleTrackSelection = (trackId: string) => {
    const newSelection = new Set(selectedTracks)
    if (newSelection.has(trackId)) {
      newSelection.delete(trackId)
    } else {
      newSelection.add(trackId)
    }
    setSelectedTracks(newSelection)
  }

  const handleAddTracks = async () => {
    if (selectedTracks.size === 0) return
    
    setAddingTracks(true)
    try {
      for (const trackId of Array.from(selectedTracks)) {
        await addTrackToProjectMutation.mutateAsync({
          projectId: id!,
          trackId
        })
      }
      
      toast.success(`Added ${selectedTracks.size} track${selectedTracks.size === 1 ? '' : 's'} to project`)
      setShowAddTracksModal(false)
      setSelectedTracks(new Set())
      setSearchQuery('')
      
      // React Query will automatically refresh project data
      
      // Emit event to update sidebar
      sidebarEvents.emit(SIDEBAR_EVENTS.REFRESH_PROJECTS)
    } catch (error) {
      console.error('Failed to add tracks:', error)
      toast.error('Failed to add tracks to project')
    } finally {
      setAddingTracks(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!editedTitle.trim()) return
    
    setIsSaving(true)
    try {
      await updateProjectMutation.mutateAsync({
        projectId: id!,
        data: {
          title: editedTitle.trim(),
          description: editedDescription.trim() || undefined,
          type: editedType
        }
      })
      
      setIsEditMode(false)
      // React Query will automatically update the project data
      
      // Emit event to update sidebar
      sidebarEvents.emit(SIDEBAR_EVENTS.REFRESH_PROJECTS)
      
      toast.success('Project updated successfully')
    } catch (error) {
      console.error('Failed to update project:', error)
      toast.error('Failed to update project')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (project) {
      setEditedTitle(project.title)
      setEditedDescription(project.description || '')
      setEditedType(project.type)
    }
    setIsEditMode(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    const formData = new FormData()
    formData.append('image', file)

    setIsUploadingImage(true)
    toast.loading('Uploading image...', { id: 'image-upload' })
    
    try {
      await updateProjectImageMutation.mutateAsync({
        projectId: id!,
        formData
      })
      // React Query will automatically update the project data
      sidebarEvents.emit(SIDEBAR_EVENTS.REFRESH_PROJECTS)
      toast.success('Project image updated', { id: 'image-upload' })
    } catch (error) {
      console.error('Failed to upload image:', error)
      toast.error('Failed to upload image', { id: 'image-upload' })
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleReorderTracks = async (newTracks: any[]) => {
    if (!project || isSavingOrder) return
    
    setIsSavingOrder(true)
    
    try {
      // Send the new order to the backend
      const trackOrder = newTracks.map(track => track.id)
      await reorderProjectTracksMutation.mutateAsync({
        projectId: id!,
        trackOrder
      })
      
      // Emit event to update sidebar (track counts might have changed)
      sidebarEvents.emit(SIDEBAR_EVENTS.REFRESH_PROJECTS)
    } catch (error) {
      console.error('Failed to save track order:', error)
      // React Query will handle error state and retry logic
    } finally {
      setIsSavingOrder(false)
    }
  }

  // Filter tracks - exclude ones already in project and apply search
  const availableTracks = userTracks.filter(track => {
    // Check if track is already in project
    const isInProject = project?.tracks?.some(t => t.id === track.id)
    if (isInProject) return false
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return track.title.toLowerCase().includes(query) ||
             track.tags?.some((tag: string) => tag.toLowerCase().includes(query))
    }
    return true
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-6 lg:p-8">
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-2 text-sm font-mono text-gray-600 hover:text-black mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            back to projects
          </button>
          <div className="flex items-center gap-2 text-sm font-mono text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
            loading project...
          </div>
        </div>
      </div>
    )
  }

  if (projectError || !project) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-6 lg:p-8">
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-2 text-sm font-mono text-gray-600 hover:text-black mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            back to projects
          </button>
          <div className="text-sm font-mono text-red-600">
            {projectError ? 'Failed to load project' : 'Project not found'}
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
          <div className="mb-8">
            <button
              onClick={() => navigate('/projects')}
              className="inline-flex items-center gap-2 text-sm font-mono text-gray-600 hover:text-black mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              back to projects
            </button>

            <div className="flex items-start gap-6">
              {/* Project Cover */}
              <div className="relative w-48 h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex-shrink-0 group">
                {isUploadingImage ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
                    <span className="text-xs font-mono text-gray-600">uploading...</span>
                  </div>
                ) : project.imageUrl ? (
                  <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FolderOpen className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                {/* Image upload overlay */}
                {!isUploadingImage && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving || isUploadingImage}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                  >
                    <Camera className="w-8 h-8 text-white" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                  className="hidden"
                />
              </div>

              {/* Project Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  {isEditMode ? (
                    <div className="flex-1">
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        placeholder="Project title"
                        className="text-sm font-mono w-full border-b border-gray-300 focus:border-gray-500 outline-none pb-1 mb-2 text-gray-900"
                        disabled={isSaving}
                      />
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <select
                          value={editedType}
                          onChange={(e) => setEditedType(e.target.value)}
                          className="text-xs font-mono bg-transparent border-none outline-none text-gray-400"
                          disabled={isSaving}
                        >
                          <option value="collection">collection</option>
                          <option value="album">album</option>
                          <option value="ep">ep</option>
                          <option value="single">single</option>
                          <option value="playlist">playlist</option>
                        </select>
                        <span>{project.trackCount || project.tracks?.length || 0} tracks</span>
                        <span>created {formatDate(project.createdAt)}</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h1 className="text-sm font-mono text-gray-900 mb-1">{project.title}</h1>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{project.type}</span>
                        <span>{project.trackCount || project.tracks?.length || 0} tracks</span>
                        <span>created {formatDate(project.createdAt)}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="relative" data-menu>
                    <button
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {showMoreMenu && (
                      <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 shadow-sm z-10 rounded" data-menu>
                        <button
                          onClick={() => {
                            setIsEditMode(true)
                            setShowMoreMenu(false)
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          edit project
                        </button>
                        <button
                          onClick={() => {
                            setShowAddTracksModal(true)
                            setShowMoreMenu(false)
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          add tracks
                        </button>
                        <button
                          onClick={() => {
                            navigate(`/projects/${id}/settings`)
                            setShowMoreMenu(false)
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <Settings className="w-3 h-3" />
                          project settings
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {project.description && !isEditMode && (
                  <p className="text-gray-600 font-mono text-xs mb-4 leading-relaxed">
                    {project.description}
                  </p>
                )}

                {isEditMode && (
                  <div className="mt-4">
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder="Project description..."
                      rows={3}
                      className="w-full text-gray-600 font-mono text-sm leading-relaxed border border-gray-300 p-3 focus:border-gray-500 outline-none resize-none rounded"
                      disabled={isSaving}
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleSaveChanges}
                        disabled={isSaving || !editedTitle.trim()}
                        className="bg-black text-white px-4 py-2 text-xs font-mono hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed rounded"
                      >
                        {isSaving ? 'saving...' : 'save changes'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="border border-gray-300 px-4 py-2 text-xs font-mono hover:border-gray-400 transition-colors disabled:opacity-50 rounded"
                      >
                        cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tracks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono text-sm text-gray-600">tracks</h2>
              {project.tracks && project.tracks.length > 1 && (
                <p className="text-xs font-mono text-gray-400">drag to reorder</p>
              )}
            </div>
            {!project.tracks || project.tracks.length === 0 ? (
              <div className="h-64 flex items-center justify-center border border-gray-200 rounded-lg">
                <div className="text-center">
                  <Music className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-xs font-mono text-gray-400 mb-4">
                    no tracks in this project yet
                  </p>
                  <button 
                    onClick={() => setShowAddTracksModal(true)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-black text-white text-xs font-mono hover:bg-gray-800 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>add first track</span>
                  </button>
                </div>
              </div>
            ) : (
              <DraggableTrackList 
                tracks={project.tracks} 
                onReorder={handleReorderTracks}
                isReordering={isSavingOrder}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Add Tracks Modal */}
      {showAddTracksModal && (
        <AddTracksModal
          playlistId={project.id}
          onClose={() => setShowAddTracksModal(false)}
          onSuccess={() => {
            setShowAddTracksModal(false)
            // React Query automatically updates project data
          }}
        />
      )}
    </div>
  )
}