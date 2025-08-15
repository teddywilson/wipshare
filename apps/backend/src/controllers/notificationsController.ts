import { Request, Response } from 'express'
import { prisma } from '../utils/database'

export class NotificationsController {
  // Get user's notifications
  static async getUserNotifications(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user!.id
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const unreadOnly = req.query.unread === 'true'
      const skip = (page - 1) * limit

      const where = {
        userId,
        ...(unreadOnly && { read: false })
      }

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })

      const total = await prisma.notification.count({ where })

      res.json({
        notifications,
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

  // Get unread notification count
  static async getUnreadCount(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user!.id

      const count = await prisma.notification.count({
        where: {
          userId,
          read: false
        }
      })

      res.json({ count })
    } catch (error) {
      throw error
    }
  }

  // Mark notification as read
  static async markAsRead(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user!.id
      const { notificationId } = req.params

      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId
        }
      })

      if (!notification) {
        return res.status(404).json({
          error: 'Notification not found',
          message: 'The notification you are trying to mark as read does not exist'
        })
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          read: true,
          readAt: new Date()
        }
      })

      res.json({
        message: 'Notification marked as read'
      })
    } catch (error) {
      throw error
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user!.id

      await prisma.notification.updateMany({
        where: {
          userId,
          read: false
        },
        data: {
          read: true,
          readAt: new Date()
        }
      })

      res.json({
        message: 'All notifications marked as read'
      })
    } catch (error) {
      throw error
    }
  }

  // Create notification (internal helper)
  static async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: any,
    actionUrl?: string
  ) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: type as any,
          title,
          message,
          data,
          actionUrl
        }
      })

      return notification
    } catch (error) {
      console.error('Failed to create notification:', error)
      throw error
    }
  }
}