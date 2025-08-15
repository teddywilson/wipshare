import { prisma } from '../utils/database';

// Simple hardcoded limits for MVP
const LIMITS = {
  MAX_TRACKS: 50,
  MAX_TRACK_SIZE_MB: 100,
  MAX_TOTAL_STORAGE_GB: 5
};

export class SimpleUsageService {
  /**
   * Get current usage for a user
   */
  static async getUserUsage(userId: string) {
    const tracks = await prisma.track.findMany({
      where: { userId },
      select: {
        id: true,
        fileUrl: true
      }
    });

    // For now, estimate storage (we can track this properly later)
    const estimatedStorageMB = tracks.length * 25; // Rough estimate
    const storageUsedGB = estimatedStorageMB / 1024;
    
    // Return in the format the frontend expects
    return {
      tracksCount: tracks.length,
      tracksLimit: LIMITS.MAX_TRACKS,
      storageUsed: storageUsedGB, // in GB
      storageLimit: LIMITS.MAX_TOTAL_STORAGE_GB, // in GB
      // Keep old format for backward compatibility
      trackCount: tracks.length,
      storageUsedMB: estimatedStorageMB,
      limits: {
        maxTracks: LIMITS.MAX_TRACKS,
        maxStorageGB: LIMITS.MAX_TOTAL_STORAGE_GB,
        maxTrackSizeMB: LIMITS.MAX_TRACK_SIZE_MB
      }
    };
  }

  /**
   * Check if user can upload
   */
  static async canUpload(userId: string, fileSizeMB: number): Promise<{ allowed: boolean; reason?: string }> {
    // Check file size
    if (fileSizeMB > LIMITS.MAX_TRACK_SIZE_MB) {
      return { 
        allowed: false, 
        reason: `File too large (max ${LIMITS.MAX_TRACK_SIZE_MB}MB)` 
      };
    }

    // Check track count
    const trackCount = await prisma.track.count({
      where: { userId }
    });

    if (trackCount >= LIMITS.MAX_TRACKS) {
      return { 
        allowed: false, 
        reason: `Track limit reached (${LIMITS.MAX_TRACKS} tracks)` 
      };
    }

    return { allowed: true };
  }
}

export default SimpleUsageService;