import { Router } from 'express';
import { authenticateFirebase as authenticate } from '../middleware/firebase-auth';
import { UsageController } from '../controllers/usageController';

const router = Router();

// All usage routes require authentication
router.use(authenticate);

// Get current usage stats
router.get('/stats', UsageController.getUserUsage);

export { router as usageRouter };