import { Request, Response, NextFunction } from 'express'
import { prisma } from '../utils/database'

interface WorkspaceRequest extends Request {
  user?: any
  workspace?: any
  workspaceMember?: any
}

// Middleware to load workspace from header or query param
export const loadWorkspace = async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get workspace ID from header, query, or body
    let workspaceId = req.headers['x-workspace-id'] as string || 
                      req.query.workspaceId as string || 
                      req.body?.workspaceId

    // If no workspace specified, use user's default
    if (!workspaceId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { defaultWorkspaceId: true }
      })
      
      if (user?.defaultWorkspaceId) {
        workspaceId = user.defaultWorkspaceId
      } else {
        // Find user's personal workspace
        const personalWorkspace = await prisma.workspace.findFirst({
          where: {
            personalUserId: userId,
            isPersonal: true
          }
        })
        
        if (personalWorkspace) {
          workspaceId = personalWorkspace.id
          // Update user's default workspace
          await prisma.user.update({
            where: { id: userId },
            data: { defaultWorkspaceId: personalWorkspace.id }
          })
        }
      }
    }

    if (!workspaceId) {
      return res.status(400).json({ error: 'No workspace selected' })
    }

    // Load workspace and check membership
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId
      },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                members: true,
                tracks: true,
                projects: true
              }
            }
          }
        }
      }
    })

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this workspace' })
    }

    // Attach to request
    req.workspace = member.workspace
    req.workspaceMember = {
      id: member.id,
      role: member.role,
      permissions: member.permissions
    }

    // Update last active
    await prisma.workspaceMember.update({
      where: { id: member.id },
      data: { lastActive: new Date() }
    }).catch(() => {}) // Ignore errors for activity update

    next()
  } catch (error) {
    console.error('Workspace middleware error:', error)
    return res.status(500).json({ error: 'Failed to load workspace' }) as any
  }
}

// Middleware to require specific workspace role
export const requireWorkspaceRole = (roles: string[]) => {
  return (req: WorkspaceRequest, res: Response, next: NextFunction) => {
    if (!req.workspaceMember) {
      return res.status(403).json({ error: 'Workspace not loaded' })
    }

    if (!roles.includes(req.workspaceMember.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    return next()
  }
}

// Middleware to ensure workspace is not personal for certain operations
export const requireTeamWorkspace = (req: WorkspaceRequest, res: Response, next: NextFunction) => {
  if (!req.workspace) {
    return res.status(403).json({ error: 'Workspace not loaded' })
  }

  if (req.workspace.isPersonal) {
    return res.status(400).json({ error: 'Operation not allowed on personal workspace' })
  }

  return next()
}

// Helper to log workspace activity
export const logWorkspaceActivity = async (
  workspaceId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: any
) => {
  try {
    await prisma.workspaceActivity.create({
      data: {
        workspaceId,
        userId,
        action,
        entityType,
        entityId,
        metadata
      }
    })
  } catch (error) {
    console.error('Failed to log workspace activity:', error)
  }
}