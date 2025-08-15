import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Filter, Upload } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import TrackList from '../components/TrackList'
import { TrackSkeleton } from '../components/Skeleton'
import { usePlayer } from '../contexts/PlayerContext'

export default function Library() {
  const [searchParams] = useSearchParams()
  const { playTrack, currentTrack, isPlaying, currentTime, duration, seek } = usePlayer()
  const { tracks, loading: dataLoading, refreshTracks } = useData()
  const [filteredTracks, setFilteredTracks] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  
  const selectedTag = searchParams.get('tag')
  // Only show loading on first load when we have no tracks
  const loading = dataLoading.tracks && tracks.length === 0

  useEffect(() => {
    // Only refresh if we don't have data
    if (tracks.length === 0) {
      refreshTracks()
    }
  }, [refreshTracks, tracks.length])

  useEffect(() => {
    // Filter tracks based on search and selected tag
    let filtered = tracks
    
    if (searchQuery) {
      filtered = filtered.filter(track => 
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    if (selectedTag) {
      filtered = filtered.filter(track => track.tags?.includes(selectedTag))
    }
    
    setFilteredTracks(filtered)
  }, [tracks, searchQuery, selectedTag])

  const handlePlayPause = (track: any) => {
    // Pass full track data to the player
    playTrack({
      id: track.id,
      title: track.title,
      description: track.description,
      fileUrl: track.fileUrl,
      imageUrl: track.imageUrl,
      duration: track.duration,
      userId: track.userId,
      user: track.user
    })
  }

  const handleSeek = (trackId: string, progress: number) => {
    // Only seek if this is the currently playing track
    if (currentTrack?.id === trackId && duration > 0) {
      seek(progress * duration)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-sm font-mono text-gray-600">library</h1>
              <Link 
                to="/upload"
                className="text-sm font-mono text-gray-600 hover:text-black transition-colors"
              >
                + new
              </Link>
            </div>

            {/* Search and filter bar */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tracks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 focus:outline-none focus:border-gray-400 transition-colors"
                />
              </div>
              <button className="px-4 py-2 border border-gray-200 hover:border-gray-400 transition-colors flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filter</span>
              </button>
            </div>

            {/* Selected tag indicator */}
            {selectedTag && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-gray-500">Filtering by tag:</span>
                <span className="px-2 py-1 bg-gray-100 text-sm rounded">{selectedTag}</span>
                <button
                  onClick={() => window.location.href = '/library'}
                  className="text-sm text-gray-500 hover:text-black"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Results */}
          {loading ? (
            <div className="space-y-3">
              <TrackSkeleton />
              <TrackSkeleton />
              <TrackSkeleton />
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {searchQuery || selectedTag ? 'No tracks found matching your criteria' : 'No tracks in your library yet'}
              </p>
              {!searchQuery && !selectedTag && (
                <Link
                  to="/upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload your first track</span>
                </Link>
              )}
            </div>
          ) : (
            <TrackList
              tracks={filteredTracks}
              playingTrackId={currentTrack?.id && isPlaying ? currentTrack.id : null}
              currentTrackId={currentTrack?.id}
              playbackProgress={currentTrack?.id && duration > 0 ? currentTime / duration : 0}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              showDelete={false}
              compact={filteredTracks.length > 8}
            />
          )}
        </div>
      </div>
    </div>
  )
}