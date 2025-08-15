type EventCallback = () => void

class PlaylistEvents {
  private listeners: Map<string, EventCallback[]> = new Map()

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  emit(event: string): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback())
    }
  }
}

export const playlistEvents = new PlaylistEvents()

export const PLAYLIST_EVENTS = {
  PLAYLIST_CREATED: 'playlist_created',
  PLAYLIST_UPDATED: 'playlist_updated',
  PLAYLIST_DELETED: 'playlist_deleted',
  REFRESH_PLAYLISTS: 'refresh_playlists'
}