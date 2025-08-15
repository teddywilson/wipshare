import { Router } from 'express'
import { NotificationsController } from '../controllers/notificationsController'
import { authenticateFirebase } from '../middleware/firebase-auth'

export const notificationsRouter = Router()

// Get user's notifications
notificationsRouter.get('/', authenticateFirebase, NotificationsController.getUserNotifications)

// Get unread notification count
notificationsRouter.get('/unread-count', authenticateFirebase, NotificationsController.getUnreadCount)

// Mark notification as read
notificationsRouter.post('/:notificationId/read', authenticateFirebase, NotificationsController.markAsRead)

// Mark all notifications as read
notificationsRouter.post('/mark-all-read', authenticateFirebase, NotificationsController.markAllAsRead)