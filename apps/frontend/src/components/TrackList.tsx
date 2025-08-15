import { Play, Pause, Trash2, Music, MoreHorizontal, Calendar, Clock, FileAudio } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Waveform from './Waveform'
import { getFileBasename } from '../lib/filename-utils'

interface Track {
  id: string
  title: string
  description?: string
  tags?: string[]
  version?: string
  visibility?: string
  isPublic: boolean
  fileUrl: string
  filename?: string
  imageUrl?: string
  waveformData?: any
  duration?: number
  createdAt: string
  updatedAt: string
  userId: string
}

interface TrackListProps {
  tracks: Track[]
  playingTrackId: string | null
  currentTrackId?: string | null  // Track that's loaded in player (playing or paused)
  playbackProgress?: number
  onPlayPause: (track: Track) => void
  onSeek?: (trackId: string, progress: number) => void
  onDelete?: (trackId: string) => void
  showDelete?: boolean
  className?: string
  compact?: boolean
}

export default function TrackList({ 
  tracks, 
  playingTrackId,
  currentTrackId,
  playbackProgress = 0,
  onPlayPause, 
  onSeek,
  onDelete,
  showDelete = true,
  className = '',
  compact = false
}: TrackListProps) {
  const navigate = useNavigate()

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - d.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return '—'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (compact) {
    // Compact table-like view for many tracks
    return (
      <div className={`${className}`}>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[40px_1fr_200px_120px_80px_40px] gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-mono text-gray-500">
            <div></div>
            <div>Title</div>
            <div>Waveform</div>
            <div>Tags</div>
            <div>Date</div>
            <div></div>
          </div>
          
          {/* Tracks */}
          {tracks.map((track) => (
            <div 
              key={track.id}
              className="grid grid-cols-[40px_1fr_200px_120px_80px_40px] gap-3 px-3 py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer group items-center"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return
                navigate(`/track/${track.id}`)
              }}
            >
              {/* Play button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPlayPause(track)
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded transition-colors"
              >
                {playingTrackId === track.id ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>
              
              {/* Title & Duration */}
              <div className="min-w-0 flex flex-col">
                <h3 className="font-mono text-sm truncate group-hover:text-blue-600 transition-colors">
                  {track.title}
                </h3>
                {track.filename && (
                  <span className="text-xs text-gray-400 truncate flex items-center gap-1">
                    <FileAudio className="w-3 h-3" />
                    {getFileBasename(track.filename)}
                  </span>
                )}
                <span className="text-xs font-mono text-gray-400">
                  {formatDuration(track.duration)}
                </span>
              </div>
              
              {/* Mini Waveform */}
              <div 
                className="relative"
                onClick={(e) => e.stopPropagation()} // Prevent row click
              >
                <Waveform
                  peaks={track.waveformData?.full || []}
                  height={24}
                  barWidth={1}
                  barGap={0.5}
                  progress={(currentTrackId || playingTrackId) === track.id ? playbackProgress : 0}
                  interactive={(currentTrackId || playingTrackId) === track.id}
                  onSeek={(progress) => onSeek?.(track.id, progress)}
                  className="w-full opacity-60 hover:opacity-100 transition-opacity"
                />
              </div>
              
              {/* Tags */}
              <div className="flex gap-1 min-w-0">
                {track.tags?.slice(0, 2).map(tag => (
                  <span key={tag} className="text-xs text-gray-500 truncate">
                    #{tag}
                  </span>
                ))}
                {track.tags && track.tags.length > 2 && (
                  <span className="text-xs text-gray-400">+{track.tags.length - 2}</span>
                )}
              </div>
              
              {/* Date */}
              <div className="text-xs text-gray-500">
                {formatDate(track.createdAt)}
              </div>
              
              {/* Actions */}
              <div className="flex items-center">
                {showDelete && onDelete ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(track.id)
                    }}
                    className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                    className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Standard view with more details (for fewer tracks)
  return (
    <div className={`space-y-2 ${className}`}>
      {tracks.map((track) => (
        <div 
          key={track.id} 
          className="border border-gray-200 rounded-lg hover:border-gray-300 transition-all cursor-pointer group"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button')) return
            navigate(`/track/${track.id}`)
          }}
        >
          <div className="p-3">
            <div className="flex items-center gap-3">
              {/* Thumbnail & Play */}
              <div className="flex-shrink-0 relative group/play">
                <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                  {track.imageUrl ? (
                    <img 
                      src={track.imageUrl} 
                      alt={track.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <Music className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlayPause(track)
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors rounded"
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg opacity-0 group-hover/play:opacity-100 transition-opacity">
                    {playingTrackId === track.id ? (
                      <Pause className="w-3 h-3 text-black" />
                    ) : (
                      <Play className="w-3 h-3 text-black ml-0.5" />
                    )}
                  </div>
                </button>
              </div>
              
              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <h3 className="font-mono text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                    {track.title}
                  </h3>
                  <span className="text-xs text-gray-400">v{track.version || '001'}</span>
                </div>
                
                {/* Show filename if available */}
                {track.filename && (
                  <div className="flex items-center gap-1 mb-1">
                    <FileAudio className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400 truncate">
                      {getFileBasename(track.filename)}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  {/* Tags */}
                  {track.tags && track.tags.length > 0 && (
                    <div className="flex gap-1">
                      {track.tags.slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className="text-xs text-gray-500"
                        >
                          #{tag}
                        </span>
                      ))}
                      {track.tags.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{track.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(track.duration)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(track.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              {showDelete && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(track.id)
                  }}
                  className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Waveform - full width below */}
            <div 
              className="mt-3 relative"
              onClick={(e) => e.stopPropagation()} // Prevent card click
            >
              <Waveform
                peaks={track.waveformData?.full || []}
                height={32}
                barWidth={2}
                barGap={1}
                progress={(currentTrackId || playingTrackId) === track.id ? playbackProgress : 0}
                interactive={(currentTrackId || playingTrackId) === track.id}
                onSeek={(progress) => onSeek?.(track.id, progress)}
                className="w-full opacity-70 hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}