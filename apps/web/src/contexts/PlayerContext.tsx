import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from 'react'

interface Track {
  id: string
  title: string
  description?: string
  artist?: string
  fileUrl: string
  imageUrl?: string
  duration?: number
  userId: string
  user?: {
    username: string
    displayName?: string
  }
}

interface PlayerContextType {
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isLoading: boolean
  playTrack: (track: Track) => void
  pauseTrack: () => void
  togglePlayPause: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  audioRef: React.RefObject<HTMLAudioElement | null>
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('playerVolume')
    return saved ? parseFloat(saved) : 0.8
  })
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const shouldAutoPlay = useRef(false)

  // Initialize audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [])

  // Handle track changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    const handleLoadStart = () => {
      setIsLoading(true)
    }
    
    const handleCanPlay = () => {
      setIsLoading(false)
      // Auto-play when ready if we should
      if (shouldAutoPlay.current && isPlaying) {
        // Use a microtask to avoid race conditions
        Promise.resolve().then(() => {
          if (audio.paused && isPlaying) {
            audio.play().catch(err => {
              // Only log non-abort errors
              if (err.name !== 'AbortError') {
                console.error('Failed to play:', err)
                setIsPlaying(false)
              }
            })
          }
        })
        shouldAutoPlay.current = false
      }
    }
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration || 0)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const handleError = (e: Event) => {
      console.error('Audio error:', e)
      setIsLoading(false)
      setIsPlaying(false)
    }

    // Set new source
    audio.src = currentTrack.fileUrl
    audio.load()

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [currentTrack]) // Remove isPlaying from deps to avoid re-running

  // Handle play/pause state changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    if (isPlaying && !isLoading) {
      // Only try to play if audio is ready
      if (audio.readyState >= 3) { // HAVE_FUTURE_DATA
        audio.play().catch(err => {
          console.error('Failed to play:', err)
          setIsPlaying(false)
        })
      }
    } else if (!isPlaying) {
      audio.pause()
    }
  }, [isPlaying, currentTrack, isLoading])

  const playTrack = (track: Track) => {
    // Safety check for undefined track
    if (!track || !track.fileUrl) {
      console.error('playTrack called with invalid track:', track)
      return
    }
    
    // If it's the same track, just toggle play/pause
    if (currentTrack?.id === track.id && audioRef.current) {
      // If audio is loaded and ready, toggle immediately
      if (audioRef.current.readyState >= 3) {
        togglePlayPause()
      } else {
        // If not ready, set play state and let it start when ready
        setIsPlaying(!isPlaying)
      }
      return
    }

    // Reset state for new track
    setCurrentTime(0)
    setDuration(0)
    setCurrentTrack(track)
    setIsPlaying(true)
    shouldAutoPlay.current = true // Mark that we should auto-play when loaded
    // Let the useEffect handle setting the src and playing
  }

  const pauseTrack = () => {
    setIsPlaying(false)
  }

  const togglePlayPause = () => {
    if (!currentTrack) return
    setIsPlaying(!isPlaying)
  }

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const setVolumeHandler = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolume(clampedVolume)
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume
    }
    localStorage.setItem('playerVolume', clampedVolume.toString())
  }

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      volume,
      isLoading,
      playTrack,
      pauseTrack,
      togglePlayPause,
      seek,
      setVolume: setVolumeHandler,
      audioRef
    }}>
      {/* Global audio element */}
      <audio ref={audioRef} />
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}