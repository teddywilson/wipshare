import { prisma } from '../utils/database';
import { TierLimit, Usage } from '@prisma/client';

// Default tier limits
const DEFAULT_LIMITS: Record<string, Omit<TierLimit, 'id'>> = {
  free: {
    tier: 'free',
    maxTracks: 10,
    maxStorageGB: 1,
    maxBandwidthGB: 5,
    maxTrackSizeMB: 50,
    maxTrackDuration: 600, // 10 minutes
    features: {
      publicTracks: true,
      privateTracks: false,
      analytics: false,
      collaboration: false,
      customBranding: false
    }
  },
  pro: {
    tier: 'pro',
    maxTracks: 100,
    maxStorageGB: 10,
    maxBandwidthGB: 50,
    maxTrackSizeMB: 200,
    maxTrackDuration: 1800, // 30 minutes
    features: {
      publicTracks: true,
      privateTracks: true,
      analytics: true,
      collaboration: true,
      customBranding: false
    }
  },
  enterprise: {
    tier: 'enterprise',
    maxTracks: -1, // unlimited
    maxStorageGB: 100,
    maxBandwidthGB: 500,
    maxTrackSizeMB: 500,
    maxTrackDuration: 7200, // 2 hours
    features: {
      publicTracks: true,
      privateTracks: true,
      analytics: true,
      collaboration: true,
      customBranding: true
    }
  }
};

export class UsageService {
  /**
   * Get or create usage record for a user
   */
  static async getOrCreateUsage(userId: string): Promise<Usage> {
    let usage = await prisma.usage.findUnique({
      where: { userId }
    });

    if (!usage) {
      // Calculate period end (first day of next month)
      const now = new Date();
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      usage = await prisma.usage.create({
        data: {
          userId,
          periodEnd
        }
      });
    }

    // Check if we need to reset monthly usage
    const now = new Date();
    if (now >= usage.periodEnd) {
      usage = await this.resetMonthlyUsage(userId);
    }

    return usage;
  }

  /**
   * Reset monthly usage counters
   */
  static async resetMonthlyUsage(userId: string): Promise<Usage> {
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return await prisma.usage.update({
      where: { userId },
      data: {
        currentTracks: 0,
        currentBandwidth: 0,
        currentPlays: 0,
        periodStart: now,
        periodEnd
      }
    });
  }

  /**
   * Get tier limits for a user
   */
  static async getTierLimits(tier: string): Promise<TierLimit> {
    let limits = await prisma.tierLimit.findUnique({
      where: { tier }
    });

    if (!limits) {
      // Create default limits if they don't exist
      const defaultLimit = DEFAULT_LIMITS[tier] || DEFAULT_LIMITS.free;
      limits = await prisma.tierLimit.create({
        data: {
          tier: defaultLimit.tier,
          maxTracks: defaultLimit.maxTracks,
          maxStorageGB: defaultLimit.maxStorageGB,
          maxBandwidthGB: defaultLimit.maxBandwidthGB,
          maxTrackSizeMB: defaultLimit.maxTrackSizeMB,
          maxTrackDuration: defaultLimit.maxTrackDuration,
          features: defaultLimit.features as any // Prisma JSON type requires this cast
        }
      });
    }

    return limits;
  }

  /**
   * Track a file upload
   */
  static async trackUpload(userId: string, fileSize: number, trackId: string): Promise<void> {
    const usage = await this.getOrCreateUsage(userId);

    await Promise.all([
      // Update usage
      prisma.usage.update({
        where: { userId },
        data: {
          currentTracks: { increment: 1 },
          currentStorage: { increment: fileSize },
          totalTracks: { increment: 1 },
          totalStorage: { increment: fileSize }
        }
      }),
      // Log the action
      prisma.usageLog.create({
        data: {
          userId,
          action: 'upload',
          resource: trackId,
          amount: BigInt(fileSize),
          metadata: { trackId, fileSize }
        }
      })
    ]);
  }

  /**
   * Track a file deletion
   */
  static async trackDeletion(userId: string, fileSize: number, trackId: string): Promise<void> {
    await Promise.all([
      // Update usage
      prisma.usage.update({
        where: { userId },
        data: {
          currentTracks: { decrement: 1 },
          currentStorage: { decrement: fileSize }
        }
      }),
      // Log the action
      prisma.usageLog.create({
        data: {
          userId,
          action: 'delete',
          resource: trackId,
          amount: BigInt(fileSize),
          metadata: { trackId, fileSize }
        }
      })
    ]);
  }

  /**
   * Track a play/stream
   */
  static async trackPlay(userId: string, trackId: string, bandwidth: number): Promise<void> {
    await Promise.all([
      // Update usage
      prisma.usage.update({
        where: { userId },
        data: {
          currentPlays: { increment: 1 },
          currentBandwidth: { increment: bandwidth },
          totalPlays: { increment: 1 },
          totalBandwidth: { increment: bandwidth }
        }
      }),
      // Log the action
      prisma.usageLog.create({
        data: {
          userId,
          action: 'play',
          resource: trackId,
          amount: BigInt(bandwidth),
          metadata: { trackId, bandwidth }
        }
      })
    ]);
  }

  /**
   * Check if user can upload based on limits
   */
  static async canUpload(userId: string, fileSize: number): Promise<{ allowed: boolean; reason?: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true }
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    const [usage, limits] = await Promise.all([
      this.getOrCreateUsage(userId),
      this.getTierLimits(user.tier)
    ]);

    // Check track count limit
    if (limits.maxTracks !== -1 && usage.currentTracks >= limits.maxTracks) {
      return { allowed: false, reason: `Track limit reached (${limits.maxTracks} tracks)` };
    }

    // Check storage limit
    const maxStorageBytes = limits.maxStorageGB * 1024 * 1024 * 1024;
    if (Number(usage.currentStorage) + fileSize > maxStorageBytes) {
      return { allowed: false, reason: `Storage limit reached (${limits.maxStorageGB}GB)` };
    }

    // Check file size limit
    const maxFileSizeBytes = limits.maxTrackSizeMB * 1024 * 1024;
    if (fileSize > maxFileSizeBytes) {
      return { allowed: false, reason: `File too large (max ${limits.maxTrackSizeMB}MB)` };
    }

    return { allowed: true };
  }

  /**
   * Get usage stats for a user
   */
  static async getUserUsageStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const [usage, limits] = await Promise.all([
      this.getOrCreateUsage(userId),
      this.getTierLimits(user.tier)
    ]);

    // Convert BigInt to numbers for JSON serialization
    const currentStorageGB = Number(usage.currentStorage) / (1024 * 1024 * 1024);
    const currentBandwidthGB = Number(usage.currentBandwidth) / (1024 * 1024 * 1024);

    return {
      tier: user.tier,
      usage: {
        tracks: {
          current: usage.currentTracks,
          limit: limits.maxTracks,
          percentage: limits.maxTracks === -1 ? 0 : (usage.currentTracks / limits.maxTracks) * 100
        },
        storage: {
          current: currentStorageGB,
          limit: limits.maxStorageGB,
          percentage: (currentStorageGB / limits.maxStorageGB) * 100,
          unit: 'GB'
        },
        bandwidth: {
          current: currentBandwidthGB,
          limit: limits.maxBandwidthGB,
          percentage: (currentBandwidthGB / limits.maxBandwidthGB) * 100,
          unit: 'GB'
        },
        plays: {
          current: usage.currentPlays,
          total: usage.totalPlays
        }
      },
      limits: {
        maxTrackSizeMB: limits.maxTrackSizeMB,
        maxTrackDuration: limits.maxTrackDuration,
        features: limits.features
      },
      period: {
        start: usage.periodStart,
        end: usage.periodEnd,
        daysRemaining: Math.ceil((usage.periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      }
    };
  }
}

export default UsageService;