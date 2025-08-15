import { Request, Response } from 'express'
import { prisma } from '../utils/database'
import multer from 'multer'
import { Storage } from '@google-cloud/storage'
import path from 'path'
import { logWorkspaceActivity } from '../middleware/workspace'

interface WorkspaceRequest extends Request {
  user?: any
  workspace?: any
  workspaceMember?: any
}

// Google Cloud Storage setup
const storage = new Storage()
const bucketName = process.env.GCP_STORAGE_BUCKET || process.env.GCS_BUCKET_NAME || 'wipshare-uploads'

// Multer configuration for project images
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed') as any, false)
    }
  }
})

export class ProjectsController {
  // Get user's projects
  static async getUserProjects(req: WorkspaceRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace?.id
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const skip = (page - 1) * limit

      const projects = await prisma.project.findMany({
        where: { 
          userId,
          // If workspaceId is provided, filter by it; otherwise get all user's projects
          ...(workspaceId ? { workspaceId } : {})
        },
        include: {
          _count: {
            select: { projectTracks: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit
      })

      const total = await prisma.project.count({
        where: { 
          userId,
          ...(workspaceId ? { workspaceId } : {})
        }
      })

      res.json({
        projects: projects.map(project => ({
          ...project,
          trackCount: project._count.projectTracks
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      })
    } catch (error) {
      throw error
    }
  }

  // Get project by ID
  static async getProject(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params
      const currentUserId = req.user?.id

      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true
            }
          },
          projectTracks: {
            include: {
              track: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  imageUrl: true,
                  duration: true,
                  createdAt: true
                }
              }
            },
            orderBy: { position: 'asc' }
          },
          _count: {
            select: { projectTracks: true }
          }
        }
      })

      if (!project) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'The requested project could not be found'
        })
      }

      // Check if user has access to this project
      if (!project.isPublic && project.userId !== currentUserId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this project'
        })
      }

      res.json({
        project: {
          ...project,
          trackCount: project._count.projectTracks,
          tracks: project.projectTracks.map(pt => pt.track)
        }
      })
    } catch (error) {
      throw error
    }
  }

  // Create project
  static async createProject(req: WorkspaceRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id
      const { title, description, type, isPublic } = req.body

      if (!title) {
        return res.status(400).json({
          error: 'Title required',
          message: 'Project title is required'
        })
      }

      const project = await prisma.project.create({
        data: {
          userId,
          workspaceId,
          title,
          description,
          type: type || 'collection',
          isPublic: isPublic || false
        },
        include: {
          _count: {
            select: { projectTracks: true }
          }
        }
      })

      res.json({
        message: 'Project created successfully',
        project: {
          ...project,
          trackCount: project._count.projectTracks
        }
      })
    } catch (error) {
      throw error
    }
  }

  // Update project
  static async updateProject(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params
      const userId = req.user!.id
      const { title, description, type, isPublic } = req.body

      const existingProject = await prisma.project.findFirst({
        where: { id, userId }
      })

      if (!existingProject) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'Project not found or you do not have permission to edit it'
        })
      }

      const project = await prisma.project.update({
        where: { id },
        data: {
          title,
          description,
          type,
          isPublic
        },
        include: {
          _count: {
            select: { projectTracks: true }
          }
        }
      })

      res.json({
        message: 'Project updated successfully',
        project: {
          ...project,
          trackCount: project._count.projectTracks
        }
      })
    } catch (error) {
      throw error
    }
  }

  // Upload project image
  static uploadProjectImage = upload.single('image')

  static async updateProjectImage(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params
      const userId = req.user!.id
      const file = req.file

      if (!file) {
        return res.status(400).json({
          error: 'No image file provided',
          message: 'Please provide an image file'
        })
      }

      const existingProject = await prisma.project.findFirst({
        where: { id, userId }
      })

      if (!existingProject) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'Project not found or you do not have permission to edit it'
        })
      }

      // Generate unique filename
      const timestamp = Date.now()
      const extension = path.extname(file.originalname)
      const filename = `project-images/${userId}/${id}-${timestamp}${extension}`

      // Upload to Google Cloud Storage
      const bucket = storage.bucket(bucketName)
      const gcsFile = bucket.file(filename)

      const stream = gcsFile.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
        resumable: false,
      })

      stream.on('error', (error) => {
        console.error('Upload error:', error)
        res.status(500).json({
          error: 'Upload failed',
          message: 'Failed to upload project image'
        })
      })

      stream.on('finish', async () => {
        try {
          // Make the file publicly readable
          await gcsFile.makePublic()
          
          // Construct the public URL
          const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`

          // Update project with new image URL
          const updatedProject = await prisma.project.update({
            where: { id },
            data: { imageUrl: publicUrl },
            include: {
              _count: {
                select: { projectTracks: true }
              }
            }
          })

          res.json({
            message: 'Project image updated successfully',
            project: {
              ...updatedProject,
              trackCount: updatedProject._count.projectTracks
            }
          })
        } catch (error) {
          console.error('Database update error:', error)
          res.status(500).json({
            error: 'Database update failed',
            message: 'Failed to update project with new image'
          })
        }
      })

      stream.end(file.buffer)
    } catch (error) {
      throw error
    }
  }

  // Delete project
  static async deleteProject(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params
      const userId = req.user!.id

      const existingProject = await prisma.project.findFirst({
        where: { id, userId }
      })

      if (!existingProject) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'Project not found or you do not have permission to delete it'
        })
      }

      await prisma.project.delete({
        where: { id }
      })

      res.json({
        message: 'Project deleted successfully'
      })
    } catch (error) {
      throw error
    }
  }

  // Add track to project
  static async addTrackToProject(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params // project id
      const { trackId } = req.body
      const userId = req.user!.id

      if (!trackId) {
        return res.status(400).json({
          error: 'Track ID required',
          message: 'Track ID is required'
        })
      }

      // Check if project exists and user owns it
      const project = await prisma.project.findFirst({
        where: { id, userId }
      })

      if (!project) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'Project not found or you do not have permission to edit it'
        })
      }

      // Check if track exists, user owns it, and it's in the same workspace
      const track = await prisma.track.findFirst({
        where: { 
          id: trackId, 
          userId,
          workspaceId: project.workspaceId // Ensure track is in same workspace as project
        }
      })

      if (!track) {
        // Check if track exists in a different workspace
        const trackInDifferentWorkspace = await prisma.track.findFirst({
          where: { id: trackId, userId }
        })
        
        if (trackInDifferentWorkspace) {
          return res.status(400).json({
            error: 'Workspace mismatch',
            message: 'Track and project must be in the same workspace'
          })
        }
        
        return res.status(404).json({
          error: 'Track not found',
          message: 'Track not found or you do not have permission to add it'
        })
      }

      // Check if track is already in project
      const existingProjectTrack = await prisma.projectTrack.findUnique({
        where: {
          projectId_trackId: {
            projectId: id,
            trackId
          }
        }
      })

      if (existingProjectTrack) {
        return res.status(400).json({
          error: 'Track already in project',
          message: 'This track is already in the project'
        })
      }

      // Get the next position
      const lastTrack = await prisma.projectTrack.findFirst({
        where: { projectId: id },
        orderBy: { position: 'desc' }
      })

      const position = lastTrack ? lastTrack.position + 1 : 1

      // Add track to project
      await prisma.projectTrack.create({
        data: {
          projectId: id,
          trackId,
          position
        }
      })

      res.json({
        message: 'Track added to project successfully'
      })
    } catch (error) {
      throw error
    }
  }

  // Remove track from project
  static async removeTrackFromProject(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id, trackId } = req.params
      const userId = req.user!.id

      // Check if project exists and user owns it
      const project = await prisma.project.findFirst({
        where: { id, userId }
      })

      if (!project) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'Project not found or you do not have permission to edit it'
        })
      }

      // Remove track from project
      const deletedProjectTrack = await prisma.projectTrack.deleteMany({
        where: {
          projectId: id,
          trackId
        }
      })

      if (deletedProjectTrack.count === 0) {
        return res.status(404).json({
          error: 'Track not found in project',
          message: 'This track is not in the project'
        })
      }

      res.json({
        message: 'Track removed from project successfully'
      })
    } catch (error) {
      throw error
    }
  }

  // Reorder tracks in project
  static async reorderProjectTracks(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params
      const { trackOrder } = req.body // Array of track IDs in the new order
      const userId = req.user!.id

      // Check if project exists and user owns it
      const project = await prisma.project.findFirst({
        where: { id, userId }
      })

      if (!project) {
        return res.status(404).json({
          error: 'Project not found',
          message: 'Project not found or you do not have permission to edit it'
        })
      }

      if (!Array.isArray(trackOrder)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'trackOrder must be an array of track IDs'
        })
      }

      // Update positions for all tracks in the project
      const updatePromises = trackOrder.map((trackId, index) => 
        prisma.projectTrack.update({
          where: {
            projectId_trackId: {
              projectId: id,
              trackId: trackId
            }
          },
          data: {
            position: index + 1
          }
        })
      )

      await Promise.all(updatePromises)

      res.json({
        message: 'Track order updated successfully'
      })
    } catch (error) {
      throw error
    }
  }
}