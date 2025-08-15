import { Router } from 'express'
import { ProjectsController } from '../controllers/projectsController'
import { authenticateFirebase, optionalFirebaseAuth } from '../middleware/firebase-auth'
import { loadWorkspace } from '../middleware/workspace'

export const projectsRouter = Router()

// Get user's projects
projectsRouter.get('/my', authenticateFirebase, loadWorkspace, ProjectsController.getUserProjects)

// Get project by ID (public endpoint with optional auth)
projectsRouter.get('/:id', optionalFirebaseAuth, ProjectsController.getProject)

// Create project
projectsRouter.post('/', authenticateFirebase, loadWorkspace, ProjectsController.createProject)

// Update project
projectsRouter.put('/:id', authenticateFirebase, ProjectsController.updateProject)

// Upload project image
projectsRouter.put('/:id/image', authenticateFirebase, ProjectsController.uploadProjectImage, ProjectsController.updateProjectImage)

// Delete project
projectsRouter.delete('/:id', authenticateFirebase, ProjectsController.deleteProject)

// Add track to project
projectsRouter.post('/:id/tracks', authenticateFirebase, ProjectsController.addTrackToProject)

// Remove track from project
projectsRouter.delete('/:id/tracks/:trackId', authenticateFirebase, ProjectsController.removeTrackFromProject)

// Reorder tracks in project
projectsRouter.put('/:id/tracks/reorder', authenticateFirebase, ProjectsController.reorderProjectTracks)