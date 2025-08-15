interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  animation?: 'pulse' | 'wave'
  width?: string | number
  height?: string | number
}

export default function Skeleton({
  className = '',
  variant = 'text',
  animation = 'pulse',
  width,
  height
}: SkeletonProps) {
  const baseClasses = animation === 'wave' 
    ? 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:1000px_100%]'
    : 'bg-gray-200'
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer'
  }
  
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded',
    circular: 'rounded-full'
  }
  
  const style: React.CSSProperties = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1em' : undefined)
  }
  
  return (
    <div
      className={`${baseClasses} ${animationClasses[animation]} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  )
}

export function TrackSkeleton() {
  return (
    <div className="border border-gray-200 p-4 animate-in fade-in duration-300">
      <div className="flex items-start gap-4">
        {/* Play button skeleton */}
        <Skeleton variant="rectangular" width={40} height={40} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Title skeleton */}
              <Skeleton className="mb-2" width="60%" height={16} />
              
              {/* Metadata skeleton */}
              <div className="flex items-center gap-3">
                <Skeleton width={60} height={12} />
                <Skeleton width={50} height={12} />
                <Skeleton width={40} height={12} />
              </div>
              
              {/* Waveform skeleton */}
              <div className="mt-3 mb-2">
                <Skeleton variant="rectangular" height={45} />
              </div>
            </div>
            
            {/* Delete button skeleton */}
            <Skeleton variant="circular" width={32} height={32} className="ml-4" />
          </div>
        </div>
      </div>
    </div>
  )
}