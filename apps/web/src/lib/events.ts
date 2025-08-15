// Simple event emitter for triggering UI updates
class EventEmitter {
  private events: { [key: string]: Array<() => void> } = {}

  on(event: string, callback: () => void) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
    
    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback)
    }
  }

  emit(event: string) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback())
    }
  }
}

export const sidebarEvents = new EventEmitter()

// Event names
export const SIDEBAR_EVENTS = {
  REFRESH_PROJECTS: 'refresh_projects',
  REFRESH_TAGS: 'refresh_tags',
  REFRESH_ALL: 'refresh_all'
}