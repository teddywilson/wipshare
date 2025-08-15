import { Hash } from 'lucide-react'

export default function Channels() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100">
          <Hash className="w-6 h-6 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Channels Coming Soon</h2>
        <p className="text-sm text-gray-600">
          Share your work with your following, get feedback, and discover new music from artists you follow.
        </p>
      </div>
    </div>
  )
}