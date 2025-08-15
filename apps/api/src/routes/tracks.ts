import { Router } from 'express';
import { TracksController } from '../controllers/tracksController';
import { requireAuth, optionalAuth } from '../middleware/clerk-auth';
import { validate } from '../middleware/validation';
import { trackSchemas } from '../utils/validation';
import { upload, audioUpload, imageUpload } from '../lib/storage';
import { loadWorkspace } from '../middleware/workspace';

export const tracksRouter = Router();

// Get current user's tracks (protected)
tracksRouter.get('/my', requireAuth, loadWorkspace, TracksController.getUserTracks);

// Get single track (public or private if owner)
tracksRouter.get('/:id', optionalAuth, TracksController.getTrack);

// Create new track (protected)
tracksRouter.post('/', requireAuth, loadWorkspace, validate(trackSchemas.create), TracksController.createTrack);

// Update track (protected)
tracksRouter.put('/:id', requireAuth, validate(trackSchemas.update), TracksController.updateTrack);

// Delete track (protected)
tracksRouter.delete('/:id', requireAuth, TracksController.deleteTrack);

// Upload track file with optional image (protected)
tracksRouter.post('/upload', requireAuth, loadWorkspace, upload.fields([
	{ name: 'file', maxCount: 1 },
	{ name: 'image', maxCount: 1 }
]), TracksController.uploadTrack);

// Track versions endpoints
// Get track versions (public or private if owner)
tracksRouter.get('/:id/versions', optionalAuth, TracksController.getTrackVersions);

// Upload new track version (protected)
tracksRouter.post('/:id/versions', requireAuth, audioUpload.single('file'), TracksController.uploadTrackVersion);

// Update track version metadata (protected)
tracksRouter.put('/:id/versions/:versionId', requireAuth, TracksController.updateTrackVersion);

// Pin a track version (protected)
tracksRouter.post('/:id/versions/:versionId/pin', requireAuth, TracksController.pinTrackVersion);

// Update track image (protected)
tracksRouter.put('/:id/image', requireAuth, imageUpload.single('image'), TracksController.updateTrackImage);

// Comment endpoints
// Get track comments (public or private if owner)
tracksRouter.get('/:id/comments', optionalAuth, TracksController.getTrackComments);

// Create track comment (protected)
tracksRouter.post('/:id/comments', requireAuth, TracksController.createTrackComment);

// Delete track comment (protected)
tracksRouter.delete('/:id/comments/:commentId', requireAuth, TracksController.deleteTrackComment);