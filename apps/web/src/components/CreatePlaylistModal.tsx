import { useState, useRef } from 'react'
import { X, Lock, Users, Upload, Image } from 'lucide-react'
import { apiClient } from '../lib/api-client'
import { useAuth } from '../lib/auth-context'
import toast from 'react-hot-toast'

interface CreatePlaylistModalProps {
  onClose: () => void
  onSuccess: (playlist: any) => void
}

export default function CreatePlaylistModal({ onClose, onSuccess }: CreatePlaylistModalProps) {
  const { getToken } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<string>('PRIVATE')
  const [creating, setCreating] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB')
        return
      }
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast.error('Please enter a playlist title')
      return
    }

    setCreating(true)
    try {
      // Create playlist
      const response = await apiClient.post('/playlists', {
        title: title.trim(),
        description: description.trim(),
        visibility
      })

      // Upload image if provided
      if (imageFile && response.playlist) {
        const formData = new FormData()
        formData.append('image', imageFile)
        
        // Get fresh token from Clerk auth
        const token = await getToken()
        if (token) {
          const apiUrl = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//localhost:8080`
          await fetch(`${apiUrl}/api/playlists/${response.playlist.id}/image`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          })
        }
      }

      toast.success('Playlist created')
      onSuccess(response.playlist)
    } catch (error) {
      console.error('Failed to create playlist:', error)
      toast.error('Failed to create playlist')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white border border-gray-200 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-mono">new playlist</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-xs font-mono text-gray-600 mb-1">
              cover image (optional)
            </label>
            <div className="flex items-center gap-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 border border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-mono border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <Upload className="w-3 h-3 inline mr-1" />
                {imagePreview ? 'change' : 'upload'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-xs font-mono text-gray-600 mb-1">
              title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="untitled playlist"
              className="w-full px-2 py-1.5 text-sm border border-gray-200 focus:outline-none focus:border-black"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-xs font-mono text-gray-600 mb-1">
              description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="add a description..."
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 focus:outline-none focus:border-black resize-none"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-mono text-gray-600 mb-2">
              visibility
            </label>
            <div className="space-y-2">
              <label className={`flex items-center gap-2 p-2 border cursor-pointer transition-colors ${
                visibility === 'PRIVATE' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="visibility"
                  value="PRIVATE"
                  checked={visibility === 'PRIVATE'}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-3 h-3"
                />
                <Lock className="w-3.5 h-3.5 text-gray-600" />
                <div className="flex-1">
                  <div className="text-sm font-mono">private</div>
                  <div className="text-xs text-gray-500">only you can see this</div>
                </div>
              </label>
              
              <label className={`flex items-center gap-2 p-2 border cursor-pointer transition-colors ${
                visibility === 'FOLLOWERS_ONLY' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="visibility"
                  value="FOLLOWERS_ONLY"
                  checked={visibility === 'FOLLOWERS_ONLY'}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-3 h-3"
                />
                <Users className="w-3.5 h-3.5 text-gray-600" />
                <div className="flex-1">
                  <div className="text-sm font-mono">followers only</div>
                  <div className="text-xs text-gray-500">your followers can see this</div>
                </div>
              </label>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              you can generate a secret link to share with anyone after creating
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-1.5 text-sm font-mono border border-gray-200 hover:border-gray-300 transition-colors"
              disabled={creating}
            >
              cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-3 py-1.5 text-sm font-mono bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
              disabled={creating}
            >
              {creating ? 'creating...' : 'create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}