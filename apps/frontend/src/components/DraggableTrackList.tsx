import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Music, GripVertical, Play, MoreHorizontal } from 'lucide-react'

interface Track {
  id: string
  title: string
  description?: string
  duration?: number
  imageUrl?: string
  tags?: string[]
}

interface DraggableTrackListProps {
  tracks: Track[]
  onReorder: (newOrder: Track[]) => void
  isReordering?: boolean
}

export default function DraggableTrackList({ tracks, onReorder, isReordering = false }: DraggableTrackListProps) {
  const [draggedTrack, setDraggedTrack] = useState<Track | null>(null)
  const [items, setItems] = useState(tracks)

  // Update items when tracks prop changes
  if (JSON.stringify(tracks) !== JSON.stringify(items) && !draggedTrack) {
    setItems(tracks)
  }

  const handleDragStart = (e: React.DragEvent, track: Track) => {
    setDraggedTrack(track)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (!draggedTrack) return
    
    // Real-time reordering visualization
    const draggedIndex = items.findIndex(t => t.id === draggedTrack.id)
    if (draggedIndex === index) return

    const newItems = [...items]
    
    // Remove dragged item
    newItems.splice(draggedIndex, 1)
    
    // Insert at new position
    newItems.splice(index, 0, draggedTrack)
    
    setItems(newItems)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    
    if (!draggedTrack) return
    
    // Save the new order
    onReorder(items)
    
    // Clean up
    setDraggedTrack(null)
  }

  const handleDragEnd = () => {
    // If drag was cancelled, revert to original order
    if (draggedTrack) {
      setItems(tracks)
    }
    setDraggedTrack(null)
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="border border-gray-200">
      {items.map((track, index) => (
        <div
          key={track.id}
          draggable
          onDragStart={(e) => handleDragStart(e, track)}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, index)}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          className={`
            relative flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0 
            bg-white transition-all duration-200
            ${draggedTrack?.id === track.id ? 'opacity-40 scale-95' : ''}
            ${!isReordering && !draggedTrack ? 'hover:bg-gray-50' : ''}
          `}
          style={{
            cursor: draggedTrack ? 'grabbing' : 'grab',
            transform: draggedTrack && draggedTrack.id !== track.id ? 'translateY(0)' : undefined,
            transition: 'transform 200ms ease'
          }}
        >
          {/* Drag Handle */}
          <div className="flex items-center gap-2 text-gray-400">
            <GripVertical className="w-4 h-4" />
            <span className="text-xs font-mono w-6 text-center">
              {(index + 1).toString().padStart(2, '0')}
            </span>
          </div>

          {/* Track Image */}
          <div className="w-10 h-10 bg-gray-100 flex-shrink-0 flex items-center justify-center">
            {track.imageUrl ? (
              <img src={track.imageUrl} alt={track.title} className="w-full h-full object-cover" />
            ) : (
              <Music className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <Link
              to={`/track/${track.id}`}
              className="text-sm font-mono hover:underline block truncate"
              onClick={(e) => {
                if (draggedTrack) {
                  e.preventDefault()
                }
              }}
            >
              {track.title}
            </Link>
            {track.tags && track.tags.length > 0 && (
              <div className="flex gap-1 mt-0.5">
                {track.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-xs text-gray-500 font-mono">
                    #{tag}
                  </span>
                ))}
                {track.tags.length > 3 && (
                  <span className="text-xs text-gray-400 font-mono">
                    +{track.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Duration */}
          <span className="text-xs font-mono text-gray-500">
            {formatDuration(track.duration)}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button 
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              disabled={isReordering || !!draggedTrack}
            >
              <Play className="w-3 h-3 text-gray-600" />
            </button>
            <button 
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              disabled={isReordering || !!draggedTrack}
            >
              <MoreHorizontal className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}