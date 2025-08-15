import { Router } from 'express'
import { WorkspaceController } from '../controllers/workspaceController'
import { requireAuth } from '../middleware/clerk-auth'

const router = Router()

// All workspace routes require authentication
router.use(requireAuth)

// Workspace management
router.get('/workspaces', WorkspaceController.getUserWorkspaces)
router.post('/workspaces', WorkspaceController.createWorkspace)
router.get('/workspaces/:idOrSlug', WorkspaceController.getWorkspace)
router.put('/workspaces/:id', WorkspaceController.updateWorkspace)
router.post('/workspaces/:id/switch', WorkspaceController.switchWorkspace)

// Member management
router.post('/workspaces/:id/invite', WorkspaceController.inviteMember)
router.post('/invitations/:token/accept', WorkspaceController.acceptInvitation)
router.delete('/workspaces/:id/members/:memberId', WorkspaceController.removeMember)
router.put('/workspaces/:id/members/:memberId/role', WorkspaceController.updateMemberRole)

// Activity logs
router.get('/workspaces/:id/activity', WorkspaceController.getActivityLogs)

export default router