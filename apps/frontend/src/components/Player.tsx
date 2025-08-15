import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Loader2 } from 'lucide-react'
import { usePlayer } from '../contexts/PlayerContext'
import { useNavigate } from 'react-router-dom'

export default function Player() {
  const navigate = useNavigate()
  const { 
    currentTrack, 
    isPlaying, 
    currentTime,
    duration,
    volume,
    isLoading,
    togglePlayPause,
    seek,
    setVolume
  } = usePlayer()

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value))
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value))
  }

  const toggleMute = () => {
    setVolume(volume > 0 ? 0 : 0.8)
  }

  const handleTrackClick = () => {
    if (currentTrack) {
      navigate(`/track/${currentTrack.id}`)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 md:left-64 right-0 h-16 bg-white border-t border-gray-200 z-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-full">
        <div className="h-full flex items-center gap-4">
        {/* Track info */}
        <div className="flex items-center gap-3 min-w-0 w-48 lg:w-64">
          {currentTrack ? (
            <>
              {currentTrack.imageUrl ? (
                <img 
                  src={currentTrack.imageUrl} 
                  alt={currentTrack.title}
                  className="w-10 h-10 rounded object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={handleTrackClick}
                />
              ) : (
                <div 
                  className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={handleTrackClick}
                />
              )}
              <div className="min-w-0 cursor-pointer" onClick={handleTrackClick}>
                <div className="text-sm font-medium truncate hover:underline">
                  {currentTrack.title}
                </div>
                {currentTrack.user && (
                  <div className="text-xs text-gray-500 truncate">
                    {currentTrack.user.displayName || currentTrack.user.username}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-400">No track selected</div>
          )}
        </div>

        {/* Center controls and progress */}
        <div className="flex-1 max-w-2xl">
          <div className="flex items-center gap-3">
            {/* Controls */}
            <div className="flex items-center gap-1">
              <button 
                className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={!currentTrack}
              >
                <SkipBack className="w-4 h-4 text-gray-600" />
              </button>
              
              <button 
                onClick={togglePlayPause}
                disabled={isLoading || !currentTrack}
                className="w-8 h-8 bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>
              
              <button 
                className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={!currentTrack}
              >
                <SkipForward className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Time and Progress */}
            <span className="text-xs text-gray-500 font-mono tabular-nums min-w-[2.5rem] text-right">
              {currentTrack ? formatTime(currentTime) : '0:00'}
            </span>
            
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              disabled={!currentTrack}
              className="flex-1 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-black
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125
                [&::-webkit-slider-thumb:disabled]:hover:scale-100 [&::-webkit-slider-thumb:disabled]:bg-gray-400
                [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3
                [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer
                [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:scale-125
                [&::-moz-range-thumb:disabled]:hover:scale-100 [&::-moz-range-thumb:disabled]:bg-gray-400"
            />
            
            <span className="text-xs text-gray-500 font-mono tabular-nums min-w-[2.5rem]">
              {currentTrack ? formatTime(duration) : '0:00'}
            </span>
          </div>
        </div>

        {/* Volume control */}
        <div className="hidden md:flex items-center gap-2">
          <button 
            onClick={toggleMute}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 text-gray-600" />
            ) : (
              <Volume2 className="w-4 h-4 text-gray-600" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5
              [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-black
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125
              [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5
              [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer
              [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:scale-125"
          />
        </div>
      </div>
      </div>
    </div>
  )
}