import { X, Check, Crown, Music, HardDrive, BarChart3, Headphones, Mail, Zap } from 'lucide-react'

interface UpgradeModalProps {
  onClose: () => void
}

export default function UpgradeModal({ onClose }: UpgradeModalProps) {
  const features = [
    '1,000 tracks',
    '100 GB storage',
    'unlimited playlists',
    'priority support'
  ]

  const currentLimits = [
    { icon: <Music className="w-4 h-4" />, label: 'tracks', current: '100', after: '1,000' },
    { icon: <HardDrive className="w-4 h-4" />, label: 'storage', current: '10 GB', after: '100 GB' },
    { icon: <Headphones className="w-4 h-4" />, label: 'support', current: 'community', after: 'priority' }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-mono font-semibold">upgrade your account</h2>
            <p className="text-sm text-gray-600 font-mono mt-1">unlock more features and storage</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 transition-colors rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Current vs Upgraded */}
          <div className="mb-8">
            <h3 className="text-sm font-mono font-semibold text-gray-800 mb-4">what you'll get</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentLimits.map((item, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-500">{item.icon}</span>
                    <span className="text-xs font-mono text-gray-600">{item.label}</span>
                  </div>
                  <div className="text-xs font-mono">
                    <div className="text-gray-500 line-through">{item.current}</div>
                    <div className="text-green-600 font-semibold">→ {item.after}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Single Plan */}
          <div className="max-w-md mx-auto">
            <div className="p-6 border-2 border-blue-300 bg-blue-50 rounded-lg text-center">
              {/* Plan Header */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-2 rounded bg-blue-100 text-blue-600">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-mono font-semibold">Pro</h3>
                  <p className="text-sm text-gray-600 font-mono">for serious creators</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-mono font-bold">$9</span>
                  <span className="text-gray-600 font-mono">/month</span>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6 space-y-2 text-left">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-mono text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button className="w-full py-3 text-sm font-mono font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                upgrade to pro
              </button>
            </div>
          </div>

          {/* Contact Section */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <div className="max-w-md mx-auto">
              <Mail className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <h4 className="text-sm font-mono font-semibold mb-2">need something else?</h4>
              <p className="text-xs text-gray-600 mb-3">
                we're still building and would love to hear what you need. 
                enterprise features, custom limits, or integrations – let's chat.
              </p>
              <button className="text-xs font-mono text-blue-600 hover:text-blue-700 transition-colors">
                contact us
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}