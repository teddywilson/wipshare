import { Request, Response } from 'express';
import { prisma } from '../utils/database';
import { uploadToGCS, deleteFromGCS, generateSignedUrl } from '../lib/storage';
import { v4 as uuidv4 } from 'uuid';
import { generateWaveform, simplifyWaveform } from '../utils/waveform';
import * as fs from 'fs';
import SimpleUsageService from '../services/simpleUsageService';
import { logWorkspaceActivity } from '../middleware/workspace';

interface WorkspaceRequest extends Request {
  user?: any;
  workspace?: any;
  workspaceMember?: any;
}

// Helper function to generate signed URLs for track data
async function generateSignedUrlsForTrack(track: any) {
  if (track.fileUrl && track.fileUrl.includes('storage.googleapis.com')) {
    try {
      track.fileUrl = await generateSignedUrl(track.fileUrl, 120); // 2 hours
    } catch (error) {
      console.error('Error generating signed URL for track:', track.id, error);
    }
  }
  return track;
}

export class TracksController {
  static async getUserTracks(req: WorkspaceRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const workspaceId = req.workspace?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const tracks = await prisma.track.findMany({
        where: { 
          userId,
          ...(workspaceId ? { workspaceId } : {})
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      const total = await prisma.track.count({
        where: { 
          userId,
          ...(workspaceId ? { workspaceId } : {})
        }
      });

      // Generate signed URLs for track files
      const tracksWithSignedUrls = await Promise.all(
        tracks.map(generateSignedUrlsForTrack)
      );

      res.json({
        tracks: tracksWithSignedUrls,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      throw error;
    }
  }

  static async getTrack(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const track = await prisma.track.findFirst({
        where: {
          id,
          OR: [
            { visibility: { not: 'private' } },
            { userId: userId || '' }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              firebaseUid: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            }
          },
          projectTracks: {
            include: {
              project: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  imageUrl: true,
                }
              }
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            }
          }
        }
      });

      if (!track) {
        return res.status(404).json({
          error: 'Track not found',
          message: 'The requested track could not be found'
        });
      }

      // Increment play count (only for different users)
      if (userId !== track.userId) {
        await prisma.track.update({
          where: { id },
          data: { playCount: { increment: 1 } }
        });
      }

      // Generate signed URL for track file
      const trackWithSignedUrl = await generateSignedUrlsForTrack(track);

      // Hide filename from non-owners
      if (userId !== track.userId) {
        delete trackWithSignedUrl.filename;
      }

      // Set cache headers for better performance
      res.set('Cache-Control', 'private, max-age=60'); // Cache for 1 minute
      res.json({ track: trackWithSignedUrl });
    } catch (error) {
      throw error;
    }
  }

  static async createTrack(req: WorkspaceRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const workspaceId = req.workspace!.id;
      const { title, description, visibility, version } = req.body;

      // For now, we'll create a placeholder fileUrl
      // TODO: Implement file upload later
      const fileUrl = 'https://example.com/placeholder.mp3';

      const track = await prisma.track.create({
        data: {
          userId,
          workspaceId,
          title,
          description,
          fileUrl,
          visibility: visibility || 'private',
          version: version || '001',
        },
        include: {
          user: {
            select: {
              id: true,
              firebaseUid: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            }
          }
        }
      });

      res.status(201).json({
        message: 'Track created successfully',
        track
      });
    } catch (error) {
      throw error;
    }
  }

  static async updateTrack(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const updateData = req.body;

      // Check if track exists and belongs to user
      const existingTrack = await prisma.track.findFirst({
        where: { id, userId }
      });

      if (!existingTrack) {
        return res.status(404).json({
          error: 'Track not found',
          message: 'Track not found or you do not have permission to edit it'
        });
      }

      const track = await prisma.track.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              firebaseUid: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            }
          }
        }
      });

      res.json({
        message: 'Track updated successfully',
        track
      });
    } catch (error) {
      throw error;
    }
  }

  static async deleteTrack(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Check if track exists and belongs to user
      const track = await prisma.track.findFirst({
        where: { id, userId }
      });

      if (!track) {
        return res.status(404).json({
          error: 'Track not found',
          message: 'Track not found or you do not have permission to delete it'
        });
      }

      // Delete file from GCS if it exists
      if (track.fileUrl && track.fileUrl.includes('storage.googleapis.com')) {
        try {
          await deleteFromGCS(track.fileUrl);
        } catch (error) {
          console.error('Error deleting file from GCS:', error);
        }
      }

      await prisma.track.delete({
        where: { id }
      });

      res.json({
        message: 'Track deleted successfully'
      });
    } catch (error) {
      throw error;
    }
  }

  static async uploadTrack(req: WorkspaceRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const workspaceId = req.workspace!.id;
      const { title, description, tags } = req.body;
      
      // Handle multiple files (audio and optional image)
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const audioFile = files?.file?.[0] || (req.file as Express.Multer.File | undefined);
      const imageFile = files?.image?.[0];
      
      if (!audioFile) {
        return res.status(400).json({
          error: 'No file provided',
          message: 'Please select an audio file to upload'
        });
      }

      // Check usage limits before upload
      const fileSizeMB = audioFile.size / (1024 * 1024);
      const canUpload = await SimpleUsageService.canUpload(userId, fileSizeMB);
      if (!canUpload.allowed) {
        return res.status(403).json({
          error: 'Upload limit reached',
          message: canUpload.reason
        });
      }

      const trackTitle = title?.trim() || audioFile.originalname.replace(/\.[^/.]+$/, '');
      const originalFilename = audioFile.originalname;
      
      // Generate a unique track ID
      const trackId = uuidv4();

      // Upload audio file to Google Cloud Storage
      let fileUrl: string;
      try {
        fileUrl = await uploadToGCS(audioFile, userId, trackId);
      } catch (uploadError) {
        console.error('Error uploading audio to GCS:', uploadError);
        return res.status(500).json({
          error: 'Upload failed',
          message: 'Failed to upload audio file to cloud storage'
        });
      }

      // Upload image file if provided
      let imageUrl: string | undefined;
      if (imageFile) {
        try {
          // Check image file size (max 5MB)
          const imageSizeMB = imageFile.size / (1024 * 1024);
          if (imageSizeMB > 5) {
            console.warn('Image file too large, skipping:', imageSizeMB, 'MB');
          } else {
            imageUrl = await uploadToGCS(imageFile, userId, `${trackId}-artwork`);
          }
        } catch (imageError) {
          console.error('Error uploading image to GCS:', imageError);
          // Continue without image - non-critical error
        }
      }

      // Generate waveform data
      let waveformData = null;
      let duration = null;
      try {
        // Save file temporarily for waveform processing
        const tempPath = `/tmp/${trackId}-${audioFile.originalname}`;
        fs.writeFileSync(tempPath, audioFile.buffer);
        
        // Generate waveform with 20 samples per second for better quality
        const waveform = await generateWaveform(tempPath, 20);
        
        // Store both full and simplified waveform
        waveformData = {
          full: waveform.peaks,
          simplified: simplifyWaveform(waveform.peaks, 200), // 150 points for better dashboard accuracy
          sampleRate: waveform.sampleRate
        };
        duration = waveform.duration;
        
        // Clean up temp file
        fs.unlinkSync(tempPath);
      } catch (waveformError) {
        console.error('Error generating waveform:', waveformError);
        // Continue without waveform data - non-critical error
      }

      // Parse tags if provided
      let parsedTags: string[] = [];
      if (tags) {
        try {
          parsedTags = JSON.parse(tags);
        } catch (e) {
          console.warn('Failed to parse tags:', e);
        }
      }

      const track = await prisma.track.create({
        data: {
          id: trackId,
          userId,
          workspaceId,
          title: trackTitle,
          description: description?.trim() || undefined,
          fileUrl,
          filename: originalFilename,
          imageUrl: imageUrl || undefined,
          tags: parsedTags,
          visibility: 'private', // Default to private for uploads
          version: '001',
          waveformData: waveformData || undefined,
          duration,
        },
        include: {
          user: {
            select: {
              id: true,
              firebaseUid: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            }
          }
        }
      });

      res.status(201).json({
        message: 'Track uploaded successfully',
        track
      });
    } catch (error) {
      throw error;
    }
  }

  static async getTrackVersions(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Check if track exists and user has access
      const track = await prisma.track.findFirst({
        where: {
          id,
          OR: [
            { visibility: { not: 'private' } },
            { userId: userId || '' }
          ]
        }
      });

      if (!track) {
        return res.status(404).json({
          error: 'Track not found',
          message: 'Track not found or you do not have permission to view it'
        });
      }

      const versions = await prisma.trackVersion.findMany({
        where: { trackId: id },
        orderBy: { versionNumber: 'asc' },
        select: {
          id: true,
          trackId: true,
          versionNumber: true,
          title: true,
          description: true,
          fileUrl: true,
          duration: true,
          isPinned: true,
          createdAt: true,
          // Only send simplified waveform for versions list
          waveformData: true
        }
      });

      // Generate signed URLs for version files
      const versionsWithSignedUrls = await Promise.all(
        versions.map(generateSignedUrlsForTrack)
      );

      // Hide filename from non-owners
      if (userId !== track.userId) {
        versionsWithSignedUrls.forEach(version => {
          delete version.filename;
        });
      }

      // Set cache headers
      res.set('Cache-Control', 'private, max-age=300'); // Cache for 5 minutes
      res.json({ versions: versionsWithSignedUrls });
    } catch (error) {
      throw error;
    }
  }

  static async uploadTrackVersion(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { version, description, makeDefault } = req.body;
      
      const audioFile = req.file;
      
      if (!audioFile) {
        return res.status(400).json({
          error: 'No file provided',
          message: 'Please select an audio file to upload'
        });
      }

      const originalFilename = audioFile.originalname;

      // Check if track exists and belongs to user
      const track = await prisma.track.findFirst({
        where: { id, userId }
      });

      if (!track) {
        return res.status(404).json({
          error: 'Track not found',
          message: 'Track not found or you do not have permission to add versions'
        });
      }

      // Check usage limits before upload
      const fileSizeMB = audioFile.size / (1024 * 1024);
      const canUpload = await SimpleUsageService.canUpload(userId, fileSizeMB);
      if (!canUpload.allowed) {
        return res.status(403).json({
          error: 'Upload limit reached',
          message: canUpload.reason
        });
      }

      // Get the next version number
      const latestVersion = await prisma.trackVersion.findFirst({
        where: { trackId: id },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true }
      });
      
      const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;
      const versionId = uuidv4();

      // Upload audio file to Google Cloud Storage
      let fileUrl: string;
      try {
        fileUrl = await uploadToGCS(audioFile, userId, `${id}-v${nextVersionNumber}`);
      } catch (uploadError) {
        console.error('Error uploading version to GCS:', uploadError);
        return res.status(500).json({
          error: 'Upload failed',
          message: 'Failed to upload audio file to cloud storage'
        });
      }

      // Generate waveform data
      let waveformData = null;
      let duration = null;
      try {
        // Save file temporarily for waveform processing
        const tempPath = `/tmp/${versionId}-${audioFile.originalname}`;
        fs.writeFileSync(tempPath, audioFile.buffer);
        
        // Generate waveform with 20 samples per second for better quality
        const waveform = await generateWaveform(tempPath, 20);
        
        // Store both full and simplified waveform
        waveformData = {
          full: waveform.peaks,
          simplified: simplifyWaveform(waveform.peaks, 200),
          sampleRate: waveform.sampleRate
        };
        duration = waveform.duration;
        
        // Clean up temp file
        fs.unlinkSync(tempPath);
      } catch (waveformError) {
        console.error('Error generating waveform:', waveformError);
      }

      // If makeDefault is true, unpin all other versions first
      if (makeDefault === 'true' || makeDefault === true) {
        await prisma.trackVersion.updateMany({
          where: { trackId: id },
          data: { isPinned: false }
        });
      }

      const trackVersion = await prisma.trackVersion.create({
        data: {
          id: versionId,
          trackId: id,
          versionNumber: nextVersionNumber,
          title: track.title,
          description: description?.trim() || undefined,
          fileUrl,
          filename: originalFilename,
          waveformData: waveformData || undefined,
          duration,
          isPinned: makeDefault === 'true' || makeDefault === true
        }
      });

      // If this version was pinned, update the main track
      if (trackVersion.isPinned) {
        await prisma.track.update({
          where: { id },
          data: {
            version: trackVersion.versionNumber.toString().padStart(3, '0'),
            fileUrl: trackVersion.fileUrl,
            duration: trackVersion.duration,
            waveformData: trackVersion.waveformData || undefined
          }
        });
      }

      res.status(201).json({
        message: 'Track version uploaded successfully',
        version: trackVersion
      });
    } catch (error) {
      throw error;
    }
  }

  static async updateTrackVersion(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id, versionId } = req.params;
      const userId = req.user!.id;
      const updateData = req.body;

      // Check if track exists and belongs to user
      const track = await prisma.track.findFirst({
        where: { id, userId }
      });

      if (!track) {
        return res.status(404).json({
          error: 'Track not found',
          message: 'Track not found or you do not have permission to edit it'
        });
      }

      // Check if version exists
      const existingVersion = await prisma.trackVersion.findFirst({
        where: { id: versionId, trackId: id }
      });

      if (!existingVersion) {
        return res.status(404).json({
          error: 'Version not found',
          message: 'Version not found'
        });
      }

      const version = await prisma.trackVersion.update({
        where: { id: versionId },
        data: updateData
      });

      res.json({
        message: 'Track version updated successfully',
        version
      });
    } catch (error) {
      throw error;
    }
  }

  static async pinTrackVersion(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id, versionId } = req.params;
      const userId = req.user!.id;

      // Check if track exists and belongs to user
      const track = await prisma.track.findFirst({
        where: { id, userId },
        include: {
          versions: true
        }
      });

      if (!track) {
        return res.status(404).json({
          error: 'Track not found',
          message: 'Track not found or you do not have permission to edit it'
        });
      }

      // Check if version exists
      const versionToPin = await prisma.trackVersion.findFirst({
        where: { id: versionId, trackId: id }
      });

      if (!versionToPin) {
        return res.status(404).json({
          error: 'Version not found',
          message: 'Version not found'
        });
      }

      // Unpin all versions for this track
      await prisma.trackVersion.updateMany({
        where: { trackId: id },
        data: { isPinned: false }
      });

      // Pin the selected version
      const pinnedVersion = await prisma.trackVersion.update({
        where: { id: versionId },
        data: { isPinned: true }
      });

      // Update the main track's version number and file URL to match the pinned version
      await prisma.track.update({
        where: { id },
        data: {
          version: pinnedVersion.versionNumber.toString().padStart(3, '0'),
          fileUrl: pinnedVersion.fileUrl,
          duration: pinnedVersion.duration,
          waveformData: pinnedVersion.waveformData || undefined
        }
      });

      return res.json({
        message: 'Version pinned successfully',
        version: pinnedVersion
      });
    } catch (error) {
      console.error('Error pinning version:', error);
      return res.status(500).json({
        error: 'Failed to pin version',
        message: 'An error occurred while pinning the version'
      });
    }
  }

  static async updateTrackImage(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const imageFile = req.file;
      
      if (!imageFile) {
        return res.status(400).json({
          error: 'No image provided',
          message: 'Please select an image file to upload'
        });
      }

      // Check if track exists and belongs to user
      const track = await prisma.track.findFirst({
        where: { id, userId }
      });

      if (!track) {
        return res.status(404).json({
          error: 'Track not found',
          message: 'Track not found or you do not have permission to edit it'
        });
      }

      // Check image file size (max 5MB)
      const imageSizeMB = imageFile.size / (1024 * 1024);
      if (imageSizeMB > 5) {
        return res.status(400).json({
          error: 'File too large',
          message: 'Image must be less than 5MB'
        });
      }

      // Upload image file to Google Cloud Storage
      let imageUrl: string;
      try {
        imageUrl = await uploadToGCS(imageFile, userId, `${id}-artwork`);
      } catch (uploadError) {
        console.error('Error uploading image to GCS:', uploadError);
        return res.status(500).json({
          error: 'Upload failed',
          message: 'Failed to upload image file to cloud storage'
        });
      }

      // Update track with new image URL
      const updatedTrack = await prisma.track.update({
        where: { id },
        data: { imageUrl },
        include: {
          user: {
            select: {
              id: true,
              firebaseUid: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            }
          }
        }
      });

      res.json({
        message: 'Track image updated successfully',
        track: updatedTrack
      });
    } catch (error) {
      throw error;
    }
  }

  static async getTrackComments(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Check if track exists and user has access
      const track = await prisma.track.findFirst({
        where: { 
          id,
          OR: [
            { visibility: 'public' },
            { userId: userId || '' }
          ]
        }
      });

      if (!track) {
        return res.status(404).json({
          error: 'Track not found',
          message: 'Track not found or you do not have permission to view it'
        });
      }

      const comments = await prisma.comment.findMany({
        where: { trackId: id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      res.json(comments);
    } catch (error) {
      throw error;
    }
  }

  static async createTrackComment(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { content, timestamp, version } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Comment content is required'
        });
      }

      // Check if track exists and user has access
      const track = await prisma.track.findFirst({
        where: { 
          id,
          OR: [
            { visibility: 'public' },
            { userId }
          ]
        }
      });

      if (!track) {
        return res.status(404).json({
          error: 'Track not found',
          message: 'Track not found or you do not have permission to comment on it'
        });
      }

      const comment = await prisma.comment.create({
        data: {
          content: content.trim(),
          timestamp: timestamp || null,
          version: version || null,
          trackId: id,
          userId
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            }
          }
        }
      });

      res.status(201).json(comment);
    } catch (error) {
      throw error;
    }
  }

  static async deleteTrackComment(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id, commentId } = req.params;
      const userId = req.user!.id;

      // Check if comment exists and belongs to the user
      const comment = await prisma.comment.findFirst({
        where: { 
          id: commentId,
          trackId: id
        }
      });

      if (!comment) {
        return res.status(404).json({
          error: 'Comment not found'
        });
      }

      // Only allow the comment author to delete their comment
      if (comment.userId !== userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only delete your own comments'
        });
      }

      // Delete the comment
      await prisma.comment.delete({
        where: { id: commentId }
      });

      return res.json({ success: true });
    } catch (error) {
      console.error('Error deleting comment:', error);
      return res.status(500).json({
        error: 'Failed to delete comment'
      });
    }
  }
}