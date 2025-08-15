import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Music, Upload as UploadIcon, X, Image, CheckCircle } from 'lucide-react'
import { useCreateTrack, useUpdateTrack, useDeleteTrack } from '../hooks/useTrackQueries'

export default function UploadPage() {
  const navigate = useNavigate()
  const createTrackMutation = useCreateTrack()
  const updateTrackMutation = useUpdateTrack()
  const deleteTrackMutation = useDeleteTrack()
  
  const [file, setFile] = useState<File | null>(null)
  const [, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedTrack, setUploadedTrack] = useState<any>(null)
  
  // Metadata
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [version, setVersion] = useState('001')
  const [channels] = useState<string[]>([])
  const [projects] = useState<string[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [])

  const uploadFile = async (selectedFile: File) => {
    setUploading(true)
    setUploadProgress(0)
    
    const formData = new FormData()
    formData.append('file', selectedFile)
    
    // Use filename as initial title
    const initialTitle = selectedFile.name.replace(/\.[^/.]+$/, "")
    formData.append('title', initialTitle)
    
    try {
      // Simulate progress for better UX
      progressIntervalRef.current = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current)
              progressIntervalRef.current = null
            }
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await createTrackMutation.mutateAsync(formData)
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setUploadProgress(100)
      setUploading(false)
      setUploaded(true)
      setUploadedTrack(response.track)
      
      // Auto-populate title from track
      setTitle(response.track.title)
    } catch (err: any) {
      console.error('Upload error:', err)
      const message = err.response?.data?.message || 'Upload failed'
      setError(message)
      setUploadProgress(0)
      setUploading(false)
      setFile(null)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }

  const handleFileSelect = async (selectedFile: File) => {
    setError(null)
    if (!selectedFile.type.startsWith('audio/')) {
      setError('Please select an audio file')
      return
    }

    const maxSize = 100 * 1024 * 1024 // 100MB
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 100MB')
      return
    }

    setFile(selectedFile)
    
    // Auto-populate title from filename
    const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "")
    setTitle(nameWithoutExt)
    
    // Immediately start upload
    await uploadFile(selectedFile)
  }

  const handleImageSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (selectedFile.size > maxSize) {
      setError('Image must be less than 5MB')
      return
    }

    setImageFile(selectedFile)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      const trimmedTag = tagInput.trim()
      if (trimmedTag && !tags.includes(trimmedTag)) {
        setTags([...tags, trimmedTag])
        setTagInput('')
      }
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleCancel = async () => {
    // If upload is in progress, just stop it
    if (uploading && progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    
    // If track was uploaded, delete it
    if (uploaded && uploadedTrack) {
      try {
        await deleteTrackMutation.mutateAsync(uploadedTrack.id)
        console.log('Cancelled upload, deleted track:', uploadedTrack.id)
      } catch (err) {
        console.error('Failed to delete uploaded track:', err)
      }
    }
    
    // Navigate away
    navigate('/dashboard')
  }

  const handleSave = async () => {
    setError(null)
    if (!uploadedTrack) {
      setError('Please wait for upload to complete')
      return
    }

    if (!title.trim()) {
      setError('Please enter a title')
      return
    }
    
    try {
      // Update the track with metadata
      await updateTrackMutation.mutateAsync({
        id: uploadedTrack.id,
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          tags: tags,
          visibility,
          version,
          channelIds: channels,
          projectIds: projects
        }
      })
      
      // React Query will automatically refresh data via mutations
      
      // Navigate immediately - success is implicit
      navigate('/dashboard')
    } catch (err: any) {
      console.error('Save error:', err)
      const message = err.response?.data?.message || 'Failed to save track details'
      setError(message)
    }
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-2xl mx-auto animate-fade-in">
          <h1 className="text-xl font-mono mb-8">Upload</h1>
          
          {/* File Upload Area - Only show if no file selected */}
          {!file ? (
            <div 
              className={`border-2 border-dashed ${dragActive ? 'border-black bg-gray-50' : 'border-gray-300'} rounded-lg p-12 transition-all`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0]
                  if (selectedFile) {
                    handleFileSelect(selectedFile)
                  }
                }}
                className="hidden"
              />

              <div className="text-center">
                <UploadIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-base mb-4 font-mono">
                  Drag & drop your audio file
                </p>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 bg-black text-white text-sm font-mono hover:bg-gray-800 transition-colors"
                >
                  or choose file
                </button>

                {error && (
                  <div className="mt-4 text-sm text-red-600 font-mono">
                    {error}
                  </div>
                )}

                <div className="mt-8 text-xs text-gray-500 font-mono">
                  <p>MP3, WAV, FLAC, AIFF, AAC/M4A • Max 100MB</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* File Info with Upload Progress */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-black rounded flex items-center justify-center">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                  {uploaded && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
                
                {/* Upload Progress */}
                {(uploading || uploadProgress > 0) && uploadProgress < 100 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono text-gray-600">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-black transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {uploaded && (
                  <div className="text-xs text-green-600 font-mono">
                    Upload complete! Edit details below.
                  </div>
                )}
              </div>

              {/* Track Details Form - Always visible but Save disabled until uploaded */}
              <div className="space-y-6">
                {/* Artwork and Title Row */}
                <div className="flex gap-6">
                  {/* Image Upload */}
                  <div className="flex-shrink-0">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0]
                        if (selectedFile) {
                          handleImageSelect(selectedFile)
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                      className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {imagePreview ? (
                        <img 
                          src={imagePreview} 
                          alt="Track artwork" 
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-center">
                          <Image className="w-8 h-8 mx-auto text-gray-400 group-hover:text-gray-600" />
                          <span className="text-xs text-gray-500 mt-1">Artwork</span>
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Title */}
                  <div className="flex-1">
                    <label className="block text-sm text-gray-700 mb-1.5 font-mono">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={uploading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-sm disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="Track title"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5 font-mono">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={uploading}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-sm resize-none disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Add a description..."
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5 font-mono">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    disabled={uploading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-sm disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Type and press Enter, comma, or space to add tags"
                  />
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-xs font-mono rounded"
                        >
                          #{tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            disabled={uploading}
                            className="hover:text-black disabled:opacity-50"
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
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    disabled={uploading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-sm disabled:bg-gray-50 disabled:text-gray-500"
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
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    disabled={uploading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-sm disabled:bg-gray-50 disabled:text-gray-500"
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
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-mono">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={!uploaded || !title.trim() || uploading}
                    className="px-6 py-2.5 bg-black text-white font-mono text-sm hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Save Track
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2.5 border border-gray-300 font-mono text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}