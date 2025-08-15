import { useState, useRef, useEffect } from 'react'
import { Upload, Music2, Layers, Search, Loader2, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUserTracks } from '../hooks/useTrackQueries'

interface UploadDropdownProps {
  isOpen: boolean
  onClose: () => void
  anchorElement: HTMLElement | null
}

export default function UploadDropdown({ isOpen, onClose, anchorElement }: UploadDropdownProps) {
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [showTrackSearch, setShowTrackSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { data: userTracks = [], isLoading: tracksLoading } = useUserTracks()

  // Position dropdown
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (anchorElement && isOpen) {
      const rect = anchorElement.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 8,
        left: rect.left
      })
    }
  }, [anchorElement, isOpen])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          anchorElement && !anchorElement.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, anchorElement])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleNewTrack = () => {
    onClose()
    navigate('/upload')
  }

  const handleSelectTrack = (trackId: string) => {
    onClose()
    navigate(`/track/${trackId}`, { state: { openVersionUpload: true } })
  }

  const filteredTracks = searchQuery 
    ? userTracks.filter(track =>
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : userTracks.slice(0, 5) // Show recent 5 tracks when not searching

  if (!isOpen) return null

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200"
      style={{ top: position.top, left: position.left }}
    >
      {!showTrackSearch ? (
        <div className="py-1 w-56">
          <button
            onClick={handleNewTrack}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
          >
            <Music2 className="w-4 h-4 text-gray-600" />
            <div className="flex-1">
              <p className="text-sm font-mono">New Track</p>
              <p className="text-xs text-gray-500">Upload a brand new track</p>
            </div>
          </button>
          
          <div className="h-px bg-gray-200 my-1" />
          
          <button
            onClick={() => setShowTrackSearch(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
          >
            <Layers className="w-4 h-4 text-gray-600" />
            <div className="flex-1">
              <p className="text-sm font-mono">New Version</p>
              <p className="text-xs text-gray-500">Add version to existing track</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      ) : (
        <div className="w-80 max-h-96">
          {/* Search header */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracks..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400"
                autoFocus
              />
            </div>
            <button
              onClick={() => {
                setShowTrackSearch(false)
                setSearchQuery('')
              }}
              className="text-xs font-mono text-gray-500 hover:text-gray-700 mt-2"
            >
              ← back
            </button>
          </div>

          {/* Track list */}
          <div className="py-1 max-h-64 overflow-y-auto">
            {tracksLoading ? (
              <div className="px-4 py-8 text-center">
                <Loader2 className="w-6 h-6 text-gray-400 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-gray-500">Loading tracks...</p>
              </div>
            ) : filteredTracks.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Music2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? 'No tracks found' : 'No tracks yet'}
                </p>
              </div>
            ) : (
              <>
                {!searchQuery && (
                  <div className="px-4 py-1">
                    <p className="text-xs font-mono text-gray-500 uppercase">Recent Tracks</p>
                  </div>
                )}
                {filteredTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => handleSelectTrack(track.id)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center">
                      {track.imageUrl ? (
                        <img 
                          src={track.imageUrl} 
                          alt="" 
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Music2 className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate">{track.title}</p>
                      <p className="text-xs text-gray-500">
                        {track.versionCount || 1} version{track.versionCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}