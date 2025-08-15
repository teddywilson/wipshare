import { Users } from 'lucide-react'

export default function Following() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100">
          <Users className="w-6 h-6 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Following Coming Soon</h2>
        <p className="text-sm text-gray-600">
          Follow artists to see their latest releases and activity in your feed.
        </p>
      </div>
    </div>
  )
}