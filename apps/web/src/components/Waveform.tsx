import { useEffect, useRef, useState } from 'react'

interface CommentMarker {
  id: string
  timestamp: number
  content: string
  username: string
  avatarUrl?: string
}

interface WaveformProps {
  peaks?: number[]
  progress?: number // 0-1
  height?: number
  className?: string
  barWidth?: number
  barGap?: number
  baseColor?: string
  progressColor?: string
  hoverColor?: string
  interactive?: boolean
  onSeek?: (progress: number) => void
  duration?: number
  comments?: CommentMarker[]
  onCommentClick?: (comment: CommentMarker) => void
}

export default function Waveform({
  peaks = [],
  progress = 0,
  height = 60,
  className = '',
  barWidth = 2,
  barGap = 1,
  baseColor = '#e5e7eb', // gray-200
  progressColor = '#000000', // black
  hoverColor = '#6b7280', // gray-500
  interactive = false,
  onSeek,
  duration = 0,
  comments = [],
  onCommentClick
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoverX, setHoverX] = useState<number | null>(null)
  const [hoveredComment, setHoveredComment] = useState<CommentMarker | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height })

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [height])

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    
    const peaksToRender = peaks && peaks.length > 0 ? peaks : generatePlaceholderPeaks(50)

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    // Calculate bar dimensions
    const totalBarWidth = barWidth + barGap
    const barsCount = Math.floor(dimensions.width / totalBarWidth)
    
    // Sample or interpolate peaks to match bar count
    const sampledPeaks = samplePeaks(peaksToRender, barsCount)

    // Draw bars
    sampledPeaks.forEach((peak, index) => {
      const x = index * totalBarWidth
      const barHeight = Math.max(2, peak * dimensions.height)
      const y = (dimensions.height - barHeight) / 2

      // Determine bar color
      let color = baseColor
      const barProgress = (x + barWidth / 2) / dimensions.width
      
      if (barProgress <= progress) {
        color = progressColor
      } else if (interactive && hoverX !== null) {
        const hoverProgress = hoverX / dimensions.width
        if (barProgress <= hoverProgress) {
          color = hoverColor
        }
      }

      // Draw with rounded corners for smoother look
      ctx.fillStyle = color
      const radius = Math.min(barWidth / 2, 1)
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, radius)
      ctx.fill()
    })
  }, [dimensions, peaks, progress, barWidth, barGap, baseColor, progressColor, hoverColor, interactive, hoverX])

  // Sample peaks to match desired bar count
  const samplePeaks = (originalPeaks: number[], targetCount: number): number[] => {
    if (originalPeaks.length === 0) return []
    if (originalPeaks.length === targetCount) return originalPeaks
    
    const sampled: number[] = []
    const ratio = originalPeaks.length / targetCount
    
    for (let i = 0; i < targetCount; i++) {
      const start = Math.floor(i * ratio)
      const end = Math.floor((i + 1) * ratio)
      
      // Take the maximum peak in this range
      let maxPeak = 0
      for (let j = start; j < end && j < originalPeaks.length; j++) {
        if (originalPeaks[j] > maxPeak) {
          maxPeak = originalPeaks[j]
        }
      }
      
      sampled.push(maxPeak)
    }
    
    return sampled
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    
    if (interactive) {
      setHoverX(x)
    }
    
    // Check if hovering over a comment marker
    if (duration > 0 && comments.length > 0) {
      const hoveredTime = (x / rect.width) * duration
      const hovered = comments.find(comment => {
        const commentX = (comment.timestamp / duration) * rect.width
        return Math.abs(commentX - x) < 10 // 10px tolerance
      })
      setHoveredComment(hovered || null)
    }
  }

  const handleMouseLeave = () => {
    setHoverX(null)
    setHoveredComment(null)
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    
    // Check if clicking on a comment marker
    if (duration > 0 && comments.length > 0) {
      const clickedTime = (x / rect.width) * duration
      const clickedComment = comments.find(comment => {
        const commentX = (comment.timestamp / duration) * rect.width
        return Math.abs(commentX - x) < 10 // 10px tolerance
      })
      
      if (clickedComment && onCommentClick) {
        onCommentClick(clickedComment)
        return
      }
    }
    
    // Otherwise handle normal seek
    if (interactive && onSeek) {
      const progress = x / rect.width
      onSeek(Math.max(0, Math.min(1, progress)))
    }
  }

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className={`relative ${className} ${interactive ? 'cursor-pointer' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full"
        />
        
        {/* Subtle comment markers on waveform */}
        {duration > 0 && comments.map(comment => {
          const position = (comment.timestamp / duration) * 100
          return (
            <div
              key={comment.id}
              className="absolute top-0 bottom-0 w-[1px] bg-orange-400 opacity-30"
              style={{ left: `${position}%` }}
            />
          )
        })}
        
        {(!peaks || peaks.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-gray-400">Waveform loading...</span>
          </div>
        )}
      </div>
      
      {/* Comment avatars below waveform */}
      {duration > 0 && comments.length > 0 && (
        <div className="relative h-10 mt-2">
          {comments.map(comment => {
            const position = (comment.timestamp / duration) * 100
            const isHovered = hoveredComment?.id === comment.id
            
            return (
              <div
                key={comment.id}
                className="absolute"
                style={{ 
                  left: `${position}%`,
                  transform: 'translateX(-50%)',
                  zIndex: isHovered ? 10 : 1
                }}
                onMouseEnter={() => setHoveredComment(comment)}
                onMouseLeave={() => setHoveredComment(null)}
              >
                <div 
                  className={`w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
                    isHovered ? 'ring-2 ring-orange-400 scale-110' : ''
                  }`}
                  onClick={() => onCommentClick?.(comment)}
                >
                  {comment.avatarUrl ? (
                    <img 
                      src={comment.avatarUrl} 
                      alt={comment.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-mono text-gray-600">
                      {comment.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                {/* Tooltip on hover */}
                {isHovered && (
                  <div 
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-xs p-2 rounded-lg shadow-lg pointer-events-none whitespace-nowrap z-20"
                    style={{ maxWidth: '250px' }}
                  >
                    <div className="font-semibold">@{comment.username}</div>
                    <div className="mt-1 whitespace-normal line-clamp-3">{comment.content}</div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Generate random placeholder peaks for demo/loading state
function generatePlaceholderPeaks(count: number): number[] {
  const peaks: number[] = []
  for (let i = 0; i < count; i++) {
    // Create a more realistic waveform pattern
    const position = i / count
    const amplitude = Math.sin(position * Math.PI) * 0.5 + 0.3
    const variation = Math.random() * 0.3
    peaks.push(Math.max(0.1, Math.min(1, amplitude + variation)))
  }
  return peaks
}