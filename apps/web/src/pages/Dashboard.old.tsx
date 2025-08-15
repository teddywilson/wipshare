import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth-context'
import { useData } from '../contexts/DataContext'
import { usePlayer } from '../contexts/PlayerContext'
import { apiClient } from '../lib/api-client'
import { 
  Upload as UploadIcon, 
  Music, 
  Users, 
  MessageCircle, 
  Folder,
  Search
} from 'lucide-react'
import { Link } from 'react-router-dom'
// Removed toast - using optimistic UI instead
import TrackList from '../components/TrackList'
import { TrackSkeleton } from '../components/Skeleton'
import SearchModal from '../components/SearchModal'

export default function Dashboard() {
  const { user } = useAuth()
  const { tracks, loading: dataLoading, refreshTracks, deleteTrack: removeTrack } = useData()
  const { playTrack, currentTrack, isPlaying, currentTime, duration, seek } = usePlayer()
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    // Only refresh if we don't have data
    if (user && tracks.length === 0) {
      refreshTracks()
    }
  }, [user, refreshTracks, tracks.length])

  // Only show loading on first load when we have no tracks
  const loading = dataLoading.tracks && tracks.length === 0

  const handlePlayTrack = (track: any) => {
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

  const handleDeleteTrack = async (trackId: string) => {
    if (confirm('Delete this track?')) {
      // Optimistically remove from UI
      removeTrack(trackId)
      
      try {
        await apiClient.deleteTrack(trackId)
        // Optimistic UI already removed the track - no toast needed
        // Refresh in background to sync
        refreshTracks(true)
      } catch (error) {
        console.error('Failed to delete track:', error)
        // Refresh to restore on error
        refreshTracks(true)
      }
    }
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
          ) : tracks.length === 0 ? (
            /* Welcome Experience */
            <div className="max-w-3xl py-12 animate-fade-in">
              {/* Welcome Message */}
              <div className="mb-16">
                <h1 className="text-2xl font-mono mb-6 leading-relaxed">
                  welcome to your workspace
                </h1>
                <p className="text-base text-gray-700 font-mono leading-relaxed mb-8 max-w-2xl">
                  this is where your music lives while you're working on it. upload demos, get feedback, 
                  organize into projects, and share privately with collaborators.
                </p>
                
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-4">
                  <Link 
                    to="/upload" 
                    className="inline-flex items-center gap-2 border border-gray-300 px-6 py-3 text-sm font-mono hover:border-gray-400 transition-colors"
                  >
                    <UploadIcon className="w-4 h-4 text-gray-600" />
                    upload track
                  </Link>
                  <Link 
                    to="/projects" 
                    className="inline-flex items-center gap-2 border border-gray-300 px-6 py-3 text-sm font-mono hover:border-gray-400 transition-colors"
                  >
                    <Folder className="w-4 h-4 text-gray-600" />
                    new project
                  </Link>
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="inline-flex items-center gap-2 border border-gray-300 px-6 py-3 text-sm font-mono hover:border-gray-400 transition-colors"
                  >
                    <Search className="w-4 h-4 text-gray-600" />
                    search & connect
                  </button>
                </div>
              </div>

              {/* How it works */}
              <div className="space-y-12">
                <div>
                  <h2 className="text-lg font-mono mb-8">how it works</h2>
                  <div className="grid gap-8 md:grid-cols-3">
                    {/* Version Control */}
                    <div className="space-y-4">
                      <div className="w-10 h-10 border border-gray-300 flex items-center justify-center">
                        <Music className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-mono mb-2">version control</h3>
                        <p className="text-sm text-gray-600 font-mono leading-relaxed">
                          upload multiple versions of the same track. compare iterations and keep your history.
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 text-xs font-mono space-y-1">
                        <div className="flex justify-between">
                          <span>summer_vibe_v3.wav</span>
                          <span className="text-gray-500">current</span>
                        </div>
                        <div className="flex justify-between opacity-60">
                          <span>summer_vibe_v2.wav</span>
                          <span className="text-gray-500">previous</span>
                        </div>
                      </div>
                    </div>

                    {/* Collaboration */}
                    <div className="space-y-4">
                      <div className="w-10 h-10 border border-gray-300 flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-mono mb-2">private sharing</h3>
                        <p className="text-sm text-gray-600 font-mono leading-relaxed">
                          invite collaborators to listen and leave feedback before you release.
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 text-xs font-mono">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                            j
                          </div>
                          <span>@jamie_producer</span>
                        </div>
                        <div className="text-gray-600 italic">
                          "love the new mix direction"
                        </div>
                      </div>
                    </div>

                    {/* Feedback */}
                    <div className="space-y-4">
                      <div className="w-10 h-10 border border-gray-300 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-mono mb-2">timestamped notes</h3>
                        <p className="text-sm text-gray-600 font-mono leading-relaxed">
                          leave comments at specific moments. get detailed feedback on every section.
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 text-xs font-mono">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-gray-200 px-2 py-1">1:23</span>
                        </div>
                        <div className="text-gray-600">
                          "try a different snare here"
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* Tracks */
            <div className="w-full animate-fade-in">
              <div className="mb-6">
                <h2 className="text-sm text-gray-600">Recent uploads</h2>
              </div>

              <TrackList
                tracks={tracks}
                playingTrackId={currentTrack?.id && isPlaying ? currentTrack.id : null}
                currentTrackId={currentTrack?.id}
                playbackProgress={currentTrack?.id && duration > 0 ? currentTime / duration : 0}
                onPlayPause={handlePlayTrack}
                onSeek={handleSeek}
                onDelete={handleDeleteTrack}
                showDelete={false}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}