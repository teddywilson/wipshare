import { Router } from 'express'
import { ProjectsController } from '../controllers/projectsController'
import { requireAuth, optionalAuth } from '../middleware/clerk-auth'
import { loadWorkspace } from '../middleware/workspace'

export const projectsRouter = Router()

// Get user's projects
projectsRouter.get('/my', requireAuth, loadWorkspace, ProjectsController.getUserProjects)

// Get project by ID (public endpoint with optional auth)
projectsRouter.get('/:id', optionalAuth, ProjectsController.getProject)

// Create project
projectsRouter.post('/', requireAuth, loadWorkspace, ProjectsController.createProject)

// Update project
projectsRouter.put('/:id', requireAuth, ProjectsController.updateProject)

// Upload project image
projectsRouter.put('/:id/image', requireAuth, ProjectsController.uploadProjectImage, ProjectsController.updateProjectImage)

// Delete project
projectsRouter.delete('/:id', requireAuth, ProjectsController.deleteProject)

// Add track to project
projectsRouter.post('/:id/tracks', requireAuth, ProjectsController.addTrackToProject)

// Remove track from project
projectsRouter.delete('/:id/tracks/:trackId', requireAuth, ProjectsController.removeTrackFromProject)

// Reorder tracks in project
projectsRouter.put('/:id/tracks/reorder', requireAuth, ProjectsController.reorderProjectTracks)