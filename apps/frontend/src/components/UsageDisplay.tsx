import { useState } from 'react'
import { Music, HardDrive, Crown, ArrowUp, ArrowDown, Sparkles } from 'lucide-react'
import { useUsageStats } from '../hooks/useUsageQueries'
import UpgradeModal from './UpgradeModal'

export default function UsageDisplay() {
  const { data: stats, isLoading: loading } = useUsageStats()
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Determine tier based on limits (this would come from backend in real app)
  const getTier = () => {
    if ((stats?.tracksLimit || 0) <= 100 && (stats?.storageLimit || 0) <= 10) {
      return { name: 'Free', color: 'text-gray-600', icon: null }
    } else if ((stats?.tracksLimit || 0) <= 1000) {
      return { name: 'Pro', color: 'text-blue-600', icon: <Crown className="w-3 h-3" /> }
    } else {
      return { name: 'Premium', color: 'text-purple-600', icon: <Sparkles className="w-3 h-3" /> }
    }
  }

  const formatStorage = (gb: number | undefined) => {
    if (!gb && gb !== 0) return '0 GB'
    if (gb < 1) {
      return `${(gb * 1024).toFixed(0)} MB`
    }
    return `${gb.toFixed(1)} GB`
  }

  if (loading || !stats) {
    // Simple placeholder while loading
    return (
      <div className="border-t border-gray-100 p-4">
        <div className="h-12"></div>
      </div>
    )
  }

  const trackPercentage = stats.tracksCount ? (stats.tracksCount / (stats.tracksLimit || 100)) * 100 : 0
  const storagePercentage = stats.storageUsed ? (stats.storageUsed / (stats.storageLimit || 10)) * 100 : 0
  const tier = getTier()
  const isNearLimit = trackPercentage > 80 || storagePercentage > 80
  const isFree = tier.name === 'Free'
  
  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return 'bg-gray-300'
    if (percentage < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="py-4">
      <div className="px-4">
        {/* Tier Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            {tier.icon}
            <span className={`text-xs font-mono font-semibold ${tier.color}`}>
              {tier.name}
            </span>
          </div>
          {isFree && (
            <button
              onClick={() => setShowUpgradePrompt(!showUpgradePrompt)}
              className="flex items-center gap-1 text-xs font-mono text-gray-500 hover:text-blue-600 transition-colors"
            >
              {showUpgradePrompt ? (
                <ArrowDown className="w-3 h-3" />
              ) : (
                <Crown className="w-3 h-3" />
              )}
              upgrade
            </button>
          )}
        </div>

        <div className="space-y-3">
          {/* Track Usage */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Music className="w-3 h-3 text-gray-500" />
                <span className="text-gray-600 font-mono">
                  {stats.tracksCount || 0}/{stats.tracksLimit || 100}
                </span>
              </div>
              <span className="text-gray-400">tracks</span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getUsageColor(trackPercentage)}`}
                style={{ width: `${Math.min(trackPercentage, 100)}%` }}
              />
            </div>
          </div>
          
          {/* Storage Usage */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3 h-3 text-gray-500" />
                <span className="text-gray-600 font-mono">
                  {formatStorage(stats.storageUsed || 0)}/{formatStorage(stats.storageLimit || 10)}
                </span>
              </div>
              <span className="text-gray-400">storage</span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getUsageColor(storagePercentage)}`}
                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Upgrade Prompt */}
        {(showUpgradePrompt || (isFree && isNearLimit)) && (
          <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs font-mono text-blue-800 mb-2">
              {isNearLimit ? 'Running low on space!' : 'Unlock more features'}
            </p>
            <div className="space-y-1 text-xs text-blue-700">
              <div>• 1,000 tracks</div>
              <div>• 100 GB storage</div>
              <div>• unlimited playlists</div>
              <div>• priority support</div>
            </div>
            <button 
              onClick={() => setShowUpgradeModal(true)}
              className="mt-2 w-full text-xs font-mono bg-blue-600 text-white py-1.5 rounded hover:bg-blue-700 transition-colors"
              data-upgrade-trigger
            >
              Upgrade to Pro
            </button>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  )
}