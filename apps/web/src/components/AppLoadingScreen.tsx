export default function AppLoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        {/* Logo/Brand loading animation */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-mono font-semibold text-black">wipshare</h1>
        </div>
        
        {/* Loading indicator */}
        <div className="flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  )
}