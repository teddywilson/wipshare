import { useState } from 'react'
import { useAuth } from '../lib/stytch-auth-context'
import { usePlayer } from '../contexts/PlayerContext'
import { useUserTracks, useDeleteTrack } from '../hooks/useTrackQueries'
import { 
  Upload as UploadIcon, 
  Music, 
  Users, 
  MessageCircle, 
  Folder,
  Search
} from 'lucide-react'
import { Link } from 'react-router-dom'
import TrackList from '../components/TrackList'
import { TrackSkeleton } from '../components/Skeleton'
import SearchModal from '../components/SearchModal'

export default function Dashboard() {
  const { user } = useAuth()
  const { playTrack, currentTrack, isPlaying, currentTime, duration, seek } = usePlayer()
  const [searchOpen, setSearchOpen] = useState(false)
  
  // React Query hooks
  const { data: tracksData, isLoading: tracksLoading, error: tracksError } = useUserTracks()
  const deleteTrackMutation = useDeleteTrack()
  
  const tracks = tracksData || []
  const loading = tracksLoading

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
      await deleteTrackMutation.mutateAsync(trackId)
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
                
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Upload your first track to get started. Share work-in-progress music, get feedback from collaborators, 
                  and keep all versions organized in one place.
                </p>
                
                {/* Main CTA */}
                <Link
                  to="/upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-mono text-sm hover:bg-gray-800 transition-colors"
                >
                  <UploadIcon className="w-4 h-4" />
                  Upload your first track
                </Link>
              </div>
              
              {/* Feature Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Music className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-mono font-medium mb-1">Version Control</h3>
                      <p className="text-gray-600 text-xs leading-relaxed">
                        Upload multiple versions of your tracks and easily switch between them. 
                        Pin versions to set which one plays by default.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageCircle className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-mono font-medium mb-1">Timestamped Feedback</h3>
                      <p className="text-gray-600 text-xs leading-relaxed">
                        Leave comments at specific timestamps in your tracks. 
                        Perfect for getting detailed feedback on exact moments.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Folder className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-mono font-medium mb-1">Projects & Playlists</h3>
                      <p className="text-gray-600 text-xs leading-relaxed">
                        Organize tracks into projects for albums or EPs. 
                        Create playlists to curate collections of work.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Users className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-mono font-medium mb-1">Collaboration</h3>
                      <p className="text-gray-600 text-xs leading-relaxed">
                        Share tracks privately or publicly. Collaborate with other musicians 
                        and producers in shared workspaces.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Main Dashboard */
            <div className="animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <h1 className="text-sm font-mono text-gray-700">your tracks</h1>
                  <span className="text-xs text-gray-500 font-mono">
                    {tracks.length} track{tracks.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors font-mono"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
              </div>
              
              {/* Track List */}
              <TrackList
                tracks={tracks}
                playingTrackId={isPlaying ? currentTrack?.id || null : null}
                currentTrackId={currentTrack?.id || null}
                playbackProgress={duration > 0 ? currentTime / duration : 0}
                onPlayPause={handlePlayTrack}
                onSeek={handleSeek}
                onDelete={handleDeleteTrack}
                showDelete={true}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Search Modal */}
      <SearchModal 
        isOpen={searchOpen} 
        onClose={() => setSearchOpen(false)} 
      />
    </div>
  )
}