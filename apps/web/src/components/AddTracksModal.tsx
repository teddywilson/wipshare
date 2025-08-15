import { useState } from 'react'
import { X, Search, Plus, Check, Calendar, Hash } from 'lucide-react'
import { apiClient } from '../lib/api-client'
import { useUserTracks } from '../hooks/useTrackQueries'
import toast from 'react-hot-toast'

interface AddTracksModalProps {
  playlistId: string
  onClose: () => void
  onSuccess: () => void
}

export default function AddTracksModal({ playlistId, onClose, onSuccess }: AddTracksModalProps) {
  const { data: userTracks = [] } = useUserTracks()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTracks, setSelectedTracks] = useState<string[]>([])
  const [adding, setAdding] = useState(false)

  const filteredTracks = userTracks.filter((track: any) =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggleTrack = (trackId: string) => {
    setSelectedTracks(prev =>
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    )
  }

  const handleAddTracks = async () => {
    if (selectedTracks.length === 0) {
      toast.error('Please select at least one track')
      return
    }

    setAdding(true)
    try {
      // Add tracks one by one (could be optimized with batch endpoint)
      for (const trackId of selectedTracks) {
        await apiClient.post(`/playlists/${playlistId}/tracks`, { trackId })
      }
      
      toast.success(`Added ${selectedTracks.length} track${selectedTracks.length > 1 ? 's' : ''} to playlist`)
      onSuccess()
    } catch (error) {
      console.error('Failed to add tracks:', error)
      toast.error('Failed to add tracks to playlist')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white border border-gray-200 max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-sm font-mono font-semibold">Add tracks to playlist</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 transition-colors rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your tracks..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black font-mono text-sm"
            />
          </div>
        </div>

        {/* Track List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredTracks.length === 0 ? (
            <p className="text-center text-gray-500 py-8 font-mono text-xs">
              {searchQuery ? 'No tracks found matching your search' : 'No tracks available'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredTracks.map((track: any) => (
                <label
                  key={track.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTracks.includes(track.id)
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTracks.includes(track.id)}
                    onChange={() => handleToggleTrack(track.id)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-medium text-sm truncate">{track.title}</div>
                    {track.description && (
                      <div className="text-xs text-gray-600 font-mono truncate mb-1">{track.description}</div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                      {track.createdAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(track.createdAt).toLocaleDateString()}
                        </span>
                      )}
                      {track.tags && track.tags.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {track.tags.slice(0, 2).join(', ')}
                          {track.tags.length > 2 && ` +${track.tags.length - 2}`}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedTracks.includes(track.id) && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <span className="text-sm text-gray-600 font-mono">
            {selectedTracks.length} track{selectedTracks.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded hover:border-gray-300 transition-colors font-mono text-xs"
              disabled={adding}
            >
              cancel
            </button>
            <button
              onClick={handleAddTracks}
              className="px-3 py-1.5 bg-black text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-mono text-xs"
              disabled={adding || selectedTracks.length === 0}
            >
              {adding ? (
                <>adding...</>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  add {selectedTracks.length > 0 && `(${selectedTracks.length})`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}