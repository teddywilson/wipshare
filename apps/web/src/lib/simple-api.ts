import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Debug log for API URL
console.log('API URL configured:', API_URL)

class SimpleApiClient {
  private client: AxiosInstance
  private authReady: Promise<void>

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Create a promise that resolves when auth is ready
    this.authReady = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe()
        resolve()
      })
    })

    // Add request interceptor to include Firebase auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          // Wait for auth to be ready
          await this.authReady
          
          const user = auth.currentUser
          if (user) {
            const token = await user.getIdToken()
            config.headers.Authorization = `Bearer ${token}`
            console.log('Sending request with auth:', {
              url: config.url,
              hasToken: !!token,
              user: user.email
            })
          } else {
            console.log('No user found for request:', config.url)
          }
        } catch (error) {
          console.error('Error adding auth token:', error)
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          console.warn('Authentication error, user may need to sign in again')
          // Don't redirect here - let React Router handle it
        }
        return Promise.reject(error)
      }
    )
  }

  // User endpoints
  async getCurrentUser() {
    const response = await this.client.get('/auth/me')
    return response.data
  }

  // Tracks endpoints
  async getTracks() {
    try {
      const response = await this.client.get('/tracks/my')
      return response.data.tracks || []
    } catch (error) {
      console.error('Error fetching tracks:', error)
      return [] // Return empty array on error
    }
  }

  async getTrack(id: string) {
    // For development, return mock data
    return {
      id,
      title: `Track ${id}`,
      description: 'Mock track description',
      audioUrl: `https://example.com/track${id}.mp3`,
      isPublic: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async createTrack(data: { title: string; description?: string; isPublic?: boolean }) {
    // For development, return mock data
    return {
      id: `track_${Date.now()}`,
      ...data,
      audioUrl: 'https://example.com/new-track.mp3',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async updateTrack(id: string, data: any) {
    // For development, return mock data
    return {
      id,
      ...data,
      updatedAt: new Date().toISOString()
    }
  }

  async deleteTrack(id: string) {
    // For development, return success
    return { success: true, message: `Track ${id} deleted` }
  }

  // File upload
  async uploadTrack(formData: FormData) {
    // For development, return mock data
    const title = formData.get('title') || 'Untitled Track'
    return {
      id: `track_${Date.now()}`,
      title,
      audioUrl: 'https://example.com/uploaded-track.mp3',
      createdAt: new Date().toISOString()
    }
  }
}

export const api = new SimpleApiClient()
export default api