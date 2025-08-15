import { Request, Response } from 'express';
import SimpleUsageService from '../services/simpleUsageService';

export class UsageController {
  /**
   * Get current usage stats for the authenticated user
   */
  static async getUserUsage(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const usage = await SimpleUsageService.getUserUsage(userId);
      
      res.json(usage);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      res.status(500).json({
        error: 'Failed to fetch usage stats',
        message: 'Unable to retrieve your usage information'
      });
    }
  }
}

export default UsageController;