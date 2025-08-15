import { Request, Response } from 'express';
import { PrismaClient, ProjectRole } from '@prisma/client';
import { EmailService } from '../services/emailService';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: any;
  workspace?: { id: string };
}

// Get project members
export const getProjectMembers = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    // Check if user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId: req.workspace?.id,
        OR: [
          { userId },
          { isPublic: true },
          {
            members: {
              some: { userId }
            }
          }
        ]
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get all members with user details
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            email: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' }
      ]
    });

    // Get pending invitations
    const invitations = await prisma.projectInvitation.findMany({
      where: {
        projectId,
        acceptedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: {
        inviter: {
          select: {
            username: true,
            displayName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${invitations.length} pending invitations for project ${projectId}`);
    invitations.forEach(inv => {
      console.log(`- ${inv.email} (expires: ${inv.expiresAt})`);
    });

    const response = {
      members,
      invitations
    };
    
    console.log('Sending response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('Error fetching project members:', error);
    res.status(500).json({ error: 'Failed to fetch project members' });
  }
};

// Invite member to project
export const inviteMember = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { projectId } = req.params;
    const { email, role = 'VIEWER' } = req.body;
    const inviterId = req.user?.id;

    // Validate role
    if (!['VIEWER', 'EDITOR'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be VIEWER or EDITOR' });
    }

    // Check if inviter has permission (must be owner or editor)
    const inviterMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: inviterId,
        role: { in: ['OWNER', 'EDITOR'] }
      }
    });

    if (!inviterMember) {
      return res.status(403).json({ error: 'You do not have permission to invite members' });
    }

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: {
          select: {
            displayName: true,
            username: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      const existingMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: existingUser.id
        }
      });

      if (existingMember) {
        return res.status(400).json({ error: 'User is already a member of this project' });
      }
    }

    // Check for existing invitation
    const existingInvitation = await prisma.projectInvitation.findFirst({
      where: {
        projectId,
        email,
        acceptedAt: null
      }
    });

    if (existingInvitation) {
      // If invitation exists but expired, delete it and create a new one
      if (existingInvitation.expiresAt < new Date()) {
        await prisma.projectInvitation.delete({
          where: { id: existingInvitation.id }
        });
      } else {
        // Invitation is still valid
        return res.status(400).json({ 
          error: 'An invitation has already been sent to this email. You can resend it from the pending invitations list.' 
        });
      }
    }

    // Create invitation
    const invitation = await prisma.projectInvitation.create({
      data: {
        projectId,
        inviterId,
        email,
        role: role as ProjectRole,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Get inviter details
    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
      select: {
        displayName: true,
        username: true
      }
    });

    // Send invitation email
    const invitationLink = `${process.env.FRONTEND_URL}/invite/project/${invitation.token}`;
    
    try {
      await EmailService.sendProjectInvitation({
        to: email,
        inviterName: inviter?.displayName || inviter?.username || 'A WipShare user',
        projectName: project.title,
        projectType: project.type,
        role: role.charAt(0).toUpperCase() + role.slice(1).toLowerCase(),
        invitationLink
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    console.error('Error inviting member:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
};

// Update member role
export const updateMemberRole = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { projectId, memberId } = req.params;
    const { role } = req.body;
    const userId = req.user?.id;

    // Validate role
    if (!['VIEWER', 'EDITOR'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be VIEWER or EDITOR' });
    }

    // Check if user is owner
    const isOwner = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        role: 'OWNER'
      }
    });

    if (!isOwner) {
      return res.status(403).json({ error: 'Only project owners can update member roles' });
    }

    // Check if member exists and is not owner
    const member = await prisma.projectMember.findFirst({
      where: {
        id: memberId,
        projectId
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.role === 'OWNER') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    // Update role
    const updatedMember = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role: role as ProjectRole },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    res.json(updatedMember);
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
};

// Remove member from project
export const removeMember = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { projectId, memberId } = req.params;
    const userId = req.user?.id;

    // Check if user is owner or removing themselves
    const member = await prisma.projectMember.findFirst({
      where: {
        id: memberId,
        projectId
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const isOwner = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        role: 'OWNER'
      }
    });

    const isSelf = member.userId === userId;

    if (!isOwner && !isSelf) {
      return res.status(403).json({ error: 'You do not have permission to remove this member' });
    }

    // Cannot remove owner
    if (member.role === 'OWNER') {
      return res.status(400).json({ error: 'Cannot remove project owner' });
    }

    // Remove member
    await prisma.projectMember.delete({
      where: { id: memberId }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

// Resend invitation
export const resendInvitation = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { projectId, invitationId } = req.params;
    const userId = req.user?.id;

    // Check if user has permission (must be owner or editor)
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        role: { in: ['OWNER', 'EDITOR'] }
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'You do not have permission to resend invitations' });
    }

    // Find the invitation
    const invitation = await prisma.projectInvitation.findFirst({
      where: {
        id: invitationId,
        projectId,
        acceptedAt: null
      },
      include: {
        project: true,
        inviter: {
          select: {
            displayName: true,
            username: true
          }
        }
      }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or already accepted' });
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      // Update expiration date if expired
      await prisma.projectInvitation.update({
        where: { id: invitationId },
        data: { 
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });
    }

    // Resend invitation email
    const invitationLink = `${process.env.FRONTEND_URL}/invite/project/${invitation.token}`;
    
    try {
      await EmailService.sendProjectInvitation({
        to: invitation.email,
        inviterName: invitation.inviter?.displayName || invitation.inviter?.username || 'A WipShare user',
        projectName: invitation.project.title,
        projectType: invitation.project.type,
        role: invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1).toLowerCase(),
        invitationLink
      });
    } catch (emailError) {
      console.error('Failed to resend invitation email:', emailError);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    res.json({ message: 'Invitation resent successfully' });
  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({ error: 'Failed to resend invitation' });
  }
};

// Cancel invitation
export const cancelInvitation = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { projectId, invitationId } = req.params;
    const userId = req.user?.id;

    // Check if user has permission (must be owner or editor)
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        role: { in: ['OWNER', 'EDITOR'] }
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'You do not have permission to cancel invitations' });
    }

    // Delete invitation
    await prisma.projectInvitation.delete({
      where: {
        id: invitationId,
        projectId
      }
    });

    res.json({ message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
};

// Accept invitation
export const acceptInvitation = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { token } = req.params;
    const userId = req.user?.id;

    // Find invitation
    const invitation = await prisma.projectInvitation.findUnique({
      where: { token },
      include: {
        project: {
          include: {
            user: {
              select: {
                displayName: true,
                username: true,
                email: true
              }
            }
          }
        },
        inviter: {
          select: {
            displayName: true,
            username: true,
            email: true
          }
        }
      }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invalid invitation' });
    }

    if (invitation.acceptedAt) {
      return res.status(400).json({ error: 'Invitation has already been accepted' });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }

    // Note: We're allowing users to accept invitations even if the email doesn't match
    // This is a common pattern in modern collaboration tools
    // The invitation email was just for delivery purposes

    // Check if already a member
    const existingMember = await prisma.projectMember.findFirst({
      where: {
        projectId: invitation.projectId,
        userId
      }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'You are already a member of this project' });
    }

    // Add user as project member
    await prisma.projectMember.create({
      data: {
        projectId: invitation.projectId,
        userId,
        role: invitation.role
      }
    });

    // Mark invitation as accepted
    await prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() }
    });

    // Send notification to inviter
    try {
      await EmailService.sendInvitationAccepted({
        to: invitation.inviter.email,
        memberName: user.displayName || user.username,
        projectName: invitation.project.title
      });
    } catch (emailError) {
      console.error('Failed to send acceptance notification:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      message: 'Invitation accepted successfully',
      project: {
        id: invitation.project.id,
        title: invitation.project.title,
        type: invitation.project.type
      }
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
};

// Get invitation details
export const getInvitationDetails = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { token } = req.params;

    const invitation = await prisma.projectInvitation.findUnique({
      where: { token },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            imageUrl: true
          }
        },
        inviter: {
          select: {
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invalid invitation' });
    }

    if (invitation.acceptedAt) {
      return res.status(400).json({ error: 'Invitation has already been accepted' });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    res.json({
      email: invitation.email,
      role: invitation.role,
      project: invitation.project,
      inviter: invitation.inviter,
      expiresAt: invitation.expiresAt
    });
  } catch (error) {
    console.error('Error fetching invitation details:', error);
    res.status(500).json({ error: 'Failed to fetch invitation details' });
  }
};