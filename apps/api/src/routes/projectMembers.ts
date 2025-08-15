import express from 'express';
import { requireAuth as authenticate } from '../middleware/clerk-auth';
import { loadWorkspace } from '../middleware/workspace';
import {
  getProjectMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  resendInvitation,
  cancelInvitation,
  acceptInvitation,
  getInvitationDetails
} from '../controllers/projectMembersController';

const router = express.Router();

// Protected routes (require authentication and workspace)
router.get('/:projectId/members', authenticate, loadWorkspace, getProjectMembers);
router.post('/:projectId/members/invite', authenticate, loadWorkspace, inviteMember);
router.patch('/:projectId/members/:memberId/role', authenticate, loadWorkspace, updateMemberRole);
router.delete('/:projectId/members/:memberId', authenticate, loadWorkspace, removeMember);
router.post('/:projectId/invitations/:invitationId/resend', authenticate, loadWorkspace, resendInvitation);
router.delete('/:projectId/invitations/:invitationId', authenticate, loadWorkspace, cancelInvitation);

// Invitation routes
router.get('/invitations/:token', getInvitationDetails); // Public - to show invitation details
router.post('/invitations/:token/accept', authenticate, acceptInvitation); // Requires auth but not workspace

export default router;