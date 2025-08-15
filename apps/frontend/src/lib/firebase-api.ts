import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { auth } from './firebase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

class FirebaseApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add request interceptor to include Firebase ID token
    this.client.interceptors.request.use(
      async (config) => {
        const user = auth.currentUser
        if (user) {
          const token = await user.getIdToken()
          config.headers.Authorization = `Bearer ${token}`
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
          // Token expired or invalid, Firebase will handle refresh automatically
          console.warn('Authentication error, user may need to sign in again')
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
    const response = await this.client.get('/tracks/my')
    return response.data.tracks || []
  }

  async getTrack(id: string) {
    const response = await this.client.get(`/tracks/${id}`)
    return response.data
  }

  async createTrack(data: { title: string; description?: string; isPublic?: boolean }) {
    const response = await this.client.post('/tracks', data)
    return response.data
  }

  async updateTrack(id: string, data: any) {
    const response = await this.client.put(`/tracks/${id}`, data)
    return response.data
  }

  async deleteTrack(id: string) {
    const response = await this.client.delete(`/tracks/${id}`)
    return response.data
  }

  // File upload
  async uploadTrack(formData: FormData) {
    const response = await this.client.post('/tracks/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }
}

export const api = new FirebaseApiClient()
export default api