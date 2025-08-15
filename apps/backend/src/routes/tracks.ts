import { Router } from 'express';
import { TracksController } from '../controllers/tracksController';
import { authenticateFirebase, optionalFirebaseAuth } from '../middleware/firebase-auth';
import { validate } from '../middleware/validation';
import { trackSchemas } from '../utils/validation';
import { upload, audioUpload, imageUpload } from '../lib/storage';
import { loadWorkspace } from '../middleware/workspace';

export const tracksRouter = Router();

// Get current user's tracks (protected)
tracksRouter.get('/my', authenticateFirebase, loadWorkspace, TracksController.getUserTracks);

// Get single track (public or private if owner)
tracksRouter.get('/:id', optionalFirebaseAuth, TracksController.getTrack);

// Create new track (protected)
tracksRouter.post('/', authenticateFirebase, loadWorkspace, validate(trackSchemas.create), TracksController.createTrack);

// Update track (protected)
tracksRouter.put('/:id', authenticateFirebase, validate(trackSchemas.update), TracksController.updateTrack);

// Delete track (protected)
tracksRouter.delete('/:id', authenticateFirebase, TracksController.deleteTrack);

// Upload track file with optional image (protected)
tracksRouter.post('/upload', authenticateFirebase, loadWorkspace, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), TracksController.uploadTrack);

// Track versions endpoints
// Get track versions (public or private if owner)
tracksRouter.get('/:id/versions', optionalFirebaseAuth, TracksController.getTrackVersions);

// Upload new track version (protected)
tracksRouter.post('/:id/versions', authenticateFirebase, audioUpload.single('file'), TracksController.uploadTrackVersion);

// Update track version metadata (protected)
tracksRouter.put('/:id/versions/:versionId', authenticateFirebase, TracksController.updateTrackVersion);

// Pin a track version (protected)
tracksRouter.post('/:id/versions/:versionId/pin', authenticateFirebase, TracksController.pinTrackVersion);

// Update track image (protected)
tracksRouter.put('/:id/image', authenticateFirebase, imageUpload.single('image'), TracksController.updateTrackImage);

// Comment endpoints
// Get track comments (public or private if owner)
tracksRouter.get('/:id/comments', optionalFirebaseAuth, TracksController.getTrackComments);

// Create track comment (protected)
tracksRouter.post('/:id/comments', authenticateFirebase, TracksController.createTrackComment);

// Delete track comment (protected)
tracksRouter.delete('/:id/comments/:commentId', authenticateFirebase, TracksController.deleteTrackComment);