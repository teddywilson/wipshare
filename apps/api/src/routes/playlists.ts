import { Router } from 'express'
import { requireAuth } from '../middleware/clerk-auth'
import { imageUpload } from '../lib/storage'
import {
  getMyPlaylists,
  getDiscoverablePlaylists,
  getPlaylist,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  resetSecretLink,
  toggleFollowPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  uploadPlaylistImage
} from '../controllers/playlistsController'

const router = Router()

// Get user's own playlists
router.get('/my', requireAuth, getMyPlaylists)

// Get playlists from others (following/discoverable)
router.get('/discover', requireAuth, getDiscoverablePlaylists)

// Get single playlist (public access with token support) - optional auth
router.get('/:playlistId', requireAuth, getPlaylist)

// Create playlist
router.post('/', requireAuth, createPlaylist)

// Update playlist
router.put('/:playlistId', requireAuth, updatePlaylist)

// Delete playlist
router.delete('/:playlistId', requireAuth, deletePlaylist)

// Generate/reset secret link
router.post('/:playlistId/secret-link', requireAuth, resetSecretLink)

// Follow/unfollow playlist
router.post('/:playlistId/follow', requireAuth, toggleFollowPlaylist)

// Add track to playlist
router.post('/:playlistId/tracks', requireAuth, addTrackToPlaylist)

// Remove track from playlist
router.delete('/:playlistId/tracks/:trackId', requireAuth, removeTrackFromPlaylist)

// Reorder tracks in playlist
router.put('/:playlistId/tracks/reorder', requireAuth, reorderPlaylistTracks)

// Upload playlist image
router.post('/:playlistId/image', requireAuth, imageUpload.single('image'), uploadPlaylistImage)

export default router