import { useState, useEffect } from 'react'
import { X, Upload, Search, Clock, Music2, ChevronRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUserTracks } from '../hooks/useTrackQueries'
import { apiClient } from '../lib/api-client'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'choose' | 'select-track'>('choose')
  const [searchQuery, setSearchQuery] = useState('')
  const [recentTracks, setRecentTracks] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingRecent, setLoadingRecent] = useState(false)
  
  const { data: userTracks = [] } = useUserTracks()

  // Fetch recent tracks when opening in version mode
  useEffect(() => {
    if (mode === 'select-track' && recentTracks.length === 0) {
      setLoadingRecent(true)
      // Get most recent tracks
      const recent = userTracks
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
      setRecentTracks(recent)
      setLoadingRecent(false)
    }
  }, [mode, userTracks])

  // Search tracks
  useEffect(() => {
    if (searchQuery.length > 0) {
      setSearching(true)
      const filtered = userTracks.filter(track =>
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setSearchResults(filtered)
      setSearching(false)
    } else {
      setSearchResults([])
    }
  }, [searchQuery, userTracks])

  const handleNewTrack = () => {
    onClose()
    navigate('/upload')
  }

  const handleSelectTrack = (trackId: string) => {
    // Store the track ID and navigation intent
    sessionStorage.setItem('openVersionUpload', trackId)
    onClose()
    navigate(`/track/${trackId}`, { state: { openVersionUpload: true } })
  }

  const handleClose = () => {
    setMode('choose')
    setSearchQuery('')
    setSearchResults([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg mx-4 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-mono">
            {mode === 'choose' ? 'upload' : 'select track'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === 'choose' ? (
            <div className="space-y-3">
              <button
                onClick={handleNewTrack}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <Music2 className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-mono text-sm font-medium">new track</p>
                    <p className="text-xs text-gray-500">upload a brand new track</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>

              <button
                onClick={() => setMode('select-track')}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <Upload className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-mono text-sm font-medium">new version</p>
                    <p className="text-xs text-gray-500">add a version to existing track</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Back button */}
              <button
                onClick={() => setMode('choose')}
                className="text-sm font-mono text-gray-600 hover:text-black transition-colors"
              >
                ← back
              </button>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="search your tracks..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:border-gray-400"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>

              {/* Track list */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {searchQuery ? (
                  <>
                    {searching ? (
                      <div className="py-8 text-center">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      <>
                        <p className="text-xs font-mono text-gray-500 uppercase tracking-wider px-1">
                          search results
                        </p>
                        {searchResults.map((track) => (
                          <button
                            key={track.id}
                            onClick={() => handleSelectTrack(track.id)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                          >
                            <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center">
                              {track.imageUrl ? (
                                <img 
                                  src={track.imageUrl} 
                                  alt="" 
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <Music2 className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-sm truncate">{track.title}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {track.artist || 'Unknown Artist'} • {track.versionCount || 1} version{track.versionCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-sm text-gray-500 font-mono">no tracks found</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {loadingRecent ? (
                      <div className="py-8 text-center">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                      </div>
                    ) : recentTracks.length > 0 ? (
                      <>
                        <p className="text-xs font-mono text-gray-500 uppercase tracking-wider px-1 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          recent tracks
                        </p>
                        {recentTracks.map((track) => (
                          <button
                            key={track.id}
                            onClick={() => handleSelectTrack(track.id)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                          >
                            <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center">
                              {track.imageUrl ? (
                                <img 
                                  src={track.imageUrl} 
                                  alt="" 
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <Music2 className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-sm truncate">{track.title}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {track.artist || 'Unknown Artist'} • {track.versionCount || 1} version{track.versionCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="py-8 text-center">
                        <Music2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 font-mono">no tracks yet</p>
                        <p className="text-xs text-gray-400 mt-1">upload your first track to get started</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}