import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Filter, Upload } from 'lucide-react'
import { useUserTracks } from '../hooks/useTrackQueries'
import TrackList from '../components/TrackList'
import { TrackSkeleton } from '../components/Skeleton'
import { usePlayer } from '../contexts/PlayerContext'

export default function Library() {
  const [searchParams] = useSearchParams()
  const { playTrack, currentTrack, isPlaying, currentTime, duration, seek } = usePlayer()
  const [searchQuery, setSearchQuery] = useState('')
  
  // React Query hooks
  const { data: tracksData, isLoading: tracksLoading } = useUserTracks()
  
  const tracks = tracksData || []
  const selectedTag = searchParams.get('tag')
  const loading = tracksLoading

  // Filter tracks using useMemo for performance
  const filteredTracks = useMemo(() => {
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
    
    return filtered
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

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    tracks.forEach(track => {
      track.tags?.forEach((tag: string) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [tracks])

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          {loading ? (
            /* Loading State */
            <div className="w-full animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                <TrackSkeleton />
                <TrackSkeleton />
                <TrackSkeleton />
              </div>
            </div>
          ) : (
            /* Main Library */
            <div className="animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <h1 className="text-sm font-mono text-gray-700">library</h1>
                  <span className="text-xs text-gray-500 font-mono">
                    {filteredTracks.length} track{filteredTracks.length !== 1 ? 's' : ''}
                    {selectedTag && (
                      <span>
                        {' '}tagged <span className="font-medium">#{selectedTag}</span>
                      </span>
                    )}
                  </span>
                </div>
                <Link
                  to="/upload"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors font-mono"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </Link>
              </div>

              {/* Search & Filters */}
              <div className="mb-6 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search tracks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black font-mono text-sm"
                  />
                </div>

                {/* Tag Filter */}
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/library"
                      className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                        !selectedTag
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      all
                    </Link>
                    {allTags.map((tag) => (
                      <Link
                        key={tag}
                        to={`/library?tag=${encodeURIComponent(tag)}`}
                        className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                          selectedTag === tag
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Results */}
              {filteredTracks.length === 0 ? (
                <div className="text-center py-16">
                  {tracks.length === 0 ? (
                    <div>
                      <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Search className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 font-mono mb-4">No tracks yet</p>
                      <Link
                        to="/upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-mono hover:bg-gray-800 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Upload your first track
                      </Link>
                    </div>
                  ) : (
                    <div>
                      <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Search className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 font-mono mb-2">
                        No tracks found
                        {searchQuery && (
                          <span>
                            {' '}for "<span className="font-medium">{searchQuery}</span>"
                          </span>
                        )}
                        {selectedTag && (
                          <span>
                            {' '}tagged <span className="font-medium">#{selectedTag}</span>
                          </span>
                        )}
                      </p>
                      {(searchQuery || selectedTag) && (
                        <button
                          onClick={() => {
                            setSearchQuery('')
                            if (selectedTag) {
                              window.history.pushState({}, '', '/library')
                            }
                          }}
                          className="text-xs text-gray-500 hover:text-black transition-colors font-mono underline"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Track List */
                <TrackList
                  tracks={filteredTracks}
                  currentTrackId={currentTrack?.id || null}
                  playingTrackId={isPlaying ? currentTrack?.id || null : null}
                  playbackProgress={duration > 0 ? currentTime / duration : 0}
                  onPlayPause={handlePlayPause}
                  onSeek={handleSeek}
                  showDelete={false}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}