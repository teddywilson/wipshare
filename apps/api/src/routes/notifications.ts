import { Router } from 'express'
import { NotificationsController } from '../controllers/notificationsController'
import { requireAuth } from '../middleware/clerk-auth'

export const notificationsRouter = Router()

// Get user's notifications
notificationsRouter.get('/', requireAuth, NotificationsController.getUserNotifications)

// Get unread notification count
notificationsRouter.get('/unread-count', requireAuth, NotificationsController.getUnreadCount)

// Mark notification as read
notificationsRouter.post('/:notificationId/read', requireAuth, NotificationsController.markAsRead)

// Mark all notifications as read
notificationsRouter.post('/mark-all-read', requireAuth, NotificationsController.markAllAsRead)