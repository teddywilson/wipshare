// Re-export the API client for use throughout the app
// The auth context manages updating the client with the current user
export { apiClient as api } from './api-client'
export { apiClient as default } from './api-client'