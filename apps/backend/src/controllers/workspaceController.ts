import { Request, Response } from 'express'
import { prisma } from '../utils/database'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

interface WorkspaceRequest extends Request {
  user?: any
  workspace?: any
}

export class WorkspaceController {
  // Get user's workspaces
  static async getUserWorkspaces(req: WorkspaceRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id

      const workspaces = await prisma.workspaceMember.findMany({
        where: { userId },
        include: {
          workspace: {
            include: {
              _count: {
                select: { 
                  members: true,
                  tracks: true,
                  projects: true
                }
              },
              owner: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          }
        },
        orderBy: { lastActive: 'desc' }
      })

      // Get user's default workspace
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { defaultWorkspaceId: true }
      })

      res.json({
        workspaces: workspaces.map(wm => ({
          ...wm.workspace,
          role: wm.role,
          memberCount: wm.workspace._count.members,
          trackCount: wm.workspace._count.tracks,
          projectCount: wm.workspace._count.projects,
          isDefault: wm.workspace.id === user?.defaultWorkspaceId
        })),
        defaultWorkspaceId: user?.defaultWorkspaceId
      })
    } catch (error) {
      console.error('Error fetching workspaces:', error)
      res.status(500).json({ error: 'Failed to fetch workspaces' })
    }
  }

  // Get workspace by ID or slug
  static async getWorkspace(req: WorkspaceRequest, res: Response): Promise<void> {
    try {
      const { idOrSlug } = req.params
      const userId = req.user!.id

      // Find workspace by ID or slug
      const workspace = await prisma.workspace.findFirst({
        where: {
          OR: [
            { id: idOrSlug },
            { slug: idOrSlug }
          ]
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true
            }
          },
          members: {
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
            orderBy: { joinedAt: 'asc' }
          },
          usage: true,
          _count: {
            select: {
              tracks: true,
              projects: true,
              members: true
            }
          }
        }
      })

      if (!workspace) {
        res.status(404).json({ error: 'Workspace not found' })
        return
      }

      // Check if user is a member
      const membership = workspace.members.find(m => m.userId === userId)
      if (!membership) {
        res.status(403).json({ error: 'Access denied' })
        return
      }

      res.json({
        workspace: {
          ...workspace,
          currentUserRole: membership.role,
          memberCount: workspace._count.members,
          trackCount: workspace._count.tracks,
          projectCount: workspace._count.projects
        }
      })
    } catch (error) {
      console.error('Error fetching workspace:', error)
      res.status(500).json({ error: 'Failed to fetch workspace' })
    }
  }

  // Create new workspace
  static async createWorkspace(req: WorkspaceRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id
      const { name, description, slug } = req.body

      // TEMPORARY: Prevent creating additional workspaces during initial launch
      // Teams feature coming soon
      res.status(403).json({ error: 'Teams feature coming soon! For now, all tracks are in your personal workspace.' })
      return

      if (!name || !slug) {
        res.status(400).json({ error: 'Name and slug are required' })
        return
      }

      // Check if slug is already taken
      const existingWorkspace = await prisma.workspace.findUnique({
        where: { slug }
      })

      if (existingWorkspace) {
        res.status(400).json({ error: 'Slug is already taken' })
        return
      }

      // Create workspace with owner as first member
      const workspace = await prisma.workspace.create({
        data: {
          name,
          slug,
          description,
          ownerId: userId,
          members: {
            create: {
              userId,
              role: 'OWNER'
            }
          },
          usage: {
            create: {
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            }
          }
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true
            }
          },
          _count: {
            select: {
              members: true,
              tracks: true,
              projects: true
            }
          }
        }
      })

      // Log activity
      await prisma.workspaceActivity.create({
        data: {
          workspaceId: workspace.id,
          userId,
          action: 'created',
          entityType: 'workspace',
          entityId: workspace.id
        }
      })

      res.json({
        message: 'Workspace created successfully',
        workspace: {
          ...workspace,
          role: 'OWNER',
          memberCount: workspace._count.members,
          trackCount: workspace._count.tracks,
          projectCount: workspace._count.projects
        }
      })
    } catch (error) {
      console.error('Error creating workspace:', error)
      res.status(500).json({ error: 'Failed to create workspace' })
    }
  }

  // Update workspace
  static async updateWorkspace(req: WorkspaceRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = req.user!.id
      const { name, description, slug, imageUrl, settings } = req.body

      // Check if user has permission (must be owner or admin)
      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: id,
          userId,
          role: { in: ['OWNER', 'ADMIN'] }
        }
      })

      if (!member) {
        res.status(403).json({ error: 'Permission denied' })
        return
      }

      // If changing slug, check if it's available
      if (slug) {
        const existingWorkspace = await prisma.workspace.findFirst({
          where: {
            slug,
            NOT: { id }
          }
        })

        if (existingWorkspace) {
          res.status(400).json({ error: 'Slug is already taken' })
          return
        }
      }

      const updatedWorkspace = await prisma.workspace.update({
        where: { id },
        data: {
          name,
          description,
          slug,
          imageUrl,
          settings
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true
            }
          },
          _count: {
            select: {
              members: true,
              tracks: true,
              projects: true
            }
          }
        }
      })

      // Log activity
      await prisma.workspaceActivity.create({
        data: {
          workspaceId: id,
          userId,
          action: 'updated',
          entityType: 'workspace',
          entityId: id,
          metadata: { changes: Object.keys(req.body) }
        }
      })

      res.json({
        message: 'Workspace updated successfully',
        workspace: {
          ...updatedWorkspace,
          memberCount: updatedWorkspace._count.members,
          trackCount: updatedWorkspace._count.tracks,
          projectCount: updatedWorkspace._count.projects
        }
      })
    } catch (error) {
      console.error('Error updating workspace:', error)
      res.status(500).json({ error: 'Failed to update workspace' })
    }
  }

  // Switch active workspace
  static async switchWorkspace(req: WorkspaceRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = req.user!.id

      // Check if user is a member of the workspace
      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: id,
          userId
        }
      })

      if (!member) {
        res.status(403).json({ error: 'Not a member of this workspace' })
        return
      }

      // Update user's default workspace
      await prisma.user.update({
        where: { id: userId },
        data: { defaultWorkspaceId: id }
      })

      // Update last active timestamp
      await prisma.workspaceMember.update({
        where: { id: member.id },
        data: { lastActive: new Date() }
      })

      res.json({ message: 'Workspace switched successfully' })
    } catch (error) {
      console.error('Error switching workspace:', error)
      res.status(500).json({ error: 'Failed to switch workspace' })
    }
  }

  // Invite member to workspace
  static async inviteMember(req: WorkspaceRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = req.user!.id
      const { email, role = 'MEMBER' } = req.body

      if (!email) {
        res.status(400).json({ error: 'Email is required' })
        return
      }

      // Check if user has permission (must be owner or admin)
      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: id,
          userId,
          role: { in: ['OWNER', 'ADMIN'] }
        }
      })

      if (!member) {
        res.status(403).json({ error: 'Permission denied' })
        return
      }

      // Check if user with email exists
      const invitedUser = await prisma.user.findUnique({
        where: { email }
      })

      // Check if user is already a member
      if (invitedUser) {
        const existingMember = await prisma.workspaceMember.findFirst({
          where: {
            workspaceId: id,
            userId: invitedUser.id
          }
        })

        if (existingMember) {
          res.status(400).json({ error: 'User is already a member' })
          return
        }
      }

      // Generate invitation token
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      // Create invitation
      const invitation = await prisma.workspaceInvitation.create({
        data: {
          workspaceId: id,
          email,
          userId: invitedUser?.id,
          role,
          token,
          invitedBy: userId,
          expiresAt
        }
      })

      // Log activity
      await prisma.workspaceActivity.create({
        data: {
          workspaceId: id,
          userId,
          action: 'invited',
          entityType: 'member',
          metadata: { email, role }
        }
      })

      // TODO: Send invitation email

      res.json({
        message: 'Invitation sent successfully',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt
        }
      })
    } catch (error) {
      console.error('Error inviting member:', error)
      res.status(500).json({ error: 'Failed to send invitation' })
    }
  }

  // Accept invitation
  static async acceptInvitation(req: WorkspaceRequest, res: Response): Promise<void> {
    try {
      const { token } = req.params
      const userId = req.user!.id

      // Find invitation
      const invitation = await prisma.workspaceInvitation.findUnique({
        where: { token },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      })

      if (!invitation) {
        res.status(404).json({ error: 'Invalid invitation' })
        return
      }

      // Check if invitation is expired
      if (invitation.expiresAt < new Date()) {
        await prisma.workspaceInvitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' }
        })
        res.status(400).json({ error: 'Invitation has expired' })
        return
      }

      // Check if invitation is for the current user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
      })

      if (user?.email !== invitation.email) {
        res.status(403).json({ error: 'Invitation is for a different email' })
        return
      }

      // Add user to workspace
      await prisma.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId,
          role: invitation.role,
          invitedBy: invitation.invitedBy
        }
      })

      // Update invitation status
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date()
        }
      })

      // Update workspace usage
      await prisma.workspaceUsage.update({
        where: { workspaceId: invitation.workspaceId },
        data: {
          currentMembers: { increment: 1 }
        }
      })

      // Log activity
      await prisma.workspaceActivity.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId,
          action: 'joined',
          entityType: 'member',
          entityId: userId
        }
      })

      res.json({
        message: 'Successfully joined workspace',
        workspace: invitation.workspace
      })
    } catch (error) {
      console.error('Error accepting invitation:', error)
      res.status(500).json({ error: 'Failed to accept invitation' })
    }
  }

  // Remove member from workspace
  static async removeMember(req: WorkspaceRequest, res: Response): Promise<void> {
    try {
      const { id, memberId } = req.params
      const userId = req.user!.id

      // Check if user has permission (must be owner or admin)
      const currentMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: id,
          userId,
          role: { in: ['OWNER', 'ADMIN'] }
        }
      })

      if (!currentMember) {
        res.status(403).json({ error: 'Permission denied' })
        return
      }

      // Find member to remove
      const memberToRemove = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: id,
          userId: memberId
        }
      })

      if (!memberToRemove) {
        res.status(404).json({ error: 'Member not found' })
        return
      }

      // Can't remove the owner
      if (memberToRemove.role === 'OWNER') {
        res.status(400).json({ error: 'Cannot remove workspace owner' })
        return
      }

      // Remove member
      await prisma.workspaceMember.delete({
        where: { id: memberToRemove.id }
      })

      // Update workspace usage
      await prisma.workspaceUsage.update({
        where: { workspaceId: id },
        data: {
          currentMembers: { decrement: 1 }
        }
      })

      // Log activity
      await prisma.workspaceActivity.create({
        data: {
          workspaceId: id,
          userId,
          action: 'removed',
          entityType: 'member',
          entityId: memberId
        }
      })

      res.json({ message: 'Member removed successfully' })
    } catch (error) {
      console.error('Error removing member:', error)
      res.status(500).json({ error: 'Failed to remove member' })
    }
  }

  // Update member role
  static async updateMemberRole(req: WorkspaceRequest, res: Response): Promise<void> {
    try {
      const { id, memberId } = req.params
      const { role } = req.body
      const userId = req.user!.id

      if (!role || !['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
        res.status(400).json({ error: 'Invalid role' })
        return
      }

      // Check if user has permission (must be owner)
      const currentMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: id,
          userId,
          role: 'OWNER'
        }
      })

      if (!currentMember) {
        res.status(403).json({ error: 'Only workspace owner can change roles' })
        return
      }

      // Find member to update
      const memberToUpdate = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: id,
          userId: memberId
        }
      })

      if (!memberToUpdate) {
        res.status(404).json({ error: 'Member not found' })
        return
      }

      // Can't change owner's role
      if (memberToUpdate.role === 'OWNER') {
        res.status(400).json({ error: 'Cannot change workspace owner role' })
        return
      }

      // Update role
      await prisma.workspaceMember.update({
        where: { id: memberToUpdate.id },
        data: { role }
      })

      // Log activity
      await prisma.workspaceActivity.create({
        data: {
          workspaceId: id,
          userId,
          action: 'role_changed',
          entityType: 'member',
          entityId: memberId,
          metadata: { oldRole: memberToUpdate.role, newRole: role }
        }
      })

      res.json({ message: 'Member role updated successfully' })
    } catch (error) {
      console.error('Error updating member role:', error)
      res.status(500).json({ error: 'Failed to update member role' })
    }
  }

  // Get workspace activity logs
  static async getActivityLogs(req: WorkspaceRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = req.user!.id
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 50

      // Check if user is a member
      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: id,
          userId
        }
      })

      if (!member) {
        res.status(403).json({ error: 'Access denied' })
        return
      }

      const activities = await prisma.workspaceActivity.findMany({
        where: { workspaceId: id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })

      const total = await prisma.workspaceActivity.count({
        where: { workspaceId: id }
      })

      res.json({
        activities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      })
    } catch (error) {
      console.error('Error fetching activity logs:', error)
      res.status(500).json({ error: 'Failed to fetch activity logs' })
    }
  }
}