import { Router } from 'express'
import { authenticateFirebase } from '../middleware/firebase-auth'
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
router.get('/my', authenticateFirebase, getMyPlaylists)

// Get playlists from others (following/discoverable)
router.get('/discover', authenticateFirebase, getDiscoverablePlaylists)

// Get single playlist (public access with token support) - optional auth
router.get('/:playlistId', authenticateFirebase, getPlaylist)

// Create playlist
router.post('/', authenticateFirebase, createPlaylist)

// Update playlist
router.put('/:playlistId', authenticateFirebase, updatePlaylist)

// Delete playlist
router.delete('/:playlistId', authenticateFirebase, deletePlaylist)

// Generate/reset secret link
router.post('/:playlistId/secret-link', authenticateFirebase, resetSecretLink)

// Follow/unfollow playlist
router.post('/:playlistId/follow', authenticateFirebase, toggleFollowPlaylist)

// Add track to playlist
router.post('/:playlistId/tracks', authenticateFirebase, addTrackToPlaylist)

// Remove track from playlist
router.delete('/:playlistId/tracks/:trackId', authenticateFirebase, removeTrackFromPlaylist)

// Reorder tracks in playlist
router.put('/:playlistId/tracks/reorder', authenticateFirebase, reorderPlaylistTracks)

// Upload playlist image
router.post('/:playlistId/image', authenticateFirebase, imageUpload.single('image'), uploadPlaylistImage)

export default router