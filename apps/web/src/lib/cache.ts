interface CacheEntry<T> {
  data: T
  timestamp: number
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export class CacheManager {
  static set<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(key, JSON.stringify(entry))
  }

  static get<T>(key: string): T | null {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    try {
      const entry: CacheEntry<T> = JSON.parse(cached)
      const age = Date.now() - entry.timestamp
      
      // Return null if cache is expired
      if (age > CACHE_DURATION) {
        localStorage.removeItem(key)
        return null
      }
      
      return entry.data
    } catch {
      // Invalid cache entry, remove it
      localStorage.removeItem(key)
      return null
    }
  }

  static invalidate(pattern?: string): void {
    if (!pattern) {
      // Clear all cache entries
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('cached')) {
          localStorage.removeItem(key)
        }
      })
    } else {
      // Clear cache entries matching pattern
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.includes(pattern)) {
          localStorage.removeItem(key)
        }
      })
    }
  }

  static invalidatePlaylists(): void {
    this.invalidate('Playlist')
  }

  static invalidateProjects(): void {
    this.invalidate('Project')
  }
}