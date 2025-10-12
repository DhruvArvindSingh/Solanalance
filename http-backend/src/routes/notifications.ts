import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get user's notifications
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { limit = 20, offset = 0, unreadOnly = false } = req.query;

        const where: any = {
            userId: req.user!.id
        };

        if (unreadOnly === 'true') {
            where.isRead = false;
        }

        const notifications = await req.prisma.notification.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            take: parseInt(limit as string),
            skip: parseInt(offset as string)
        });

        const transformedNotifications = notifications.map(notification => ({
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            related_id: notification.relatedId,
            is_read: notification.isRead,
            created_at: notification.createdAt
        }));

        res.json(transformedNotifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await req.prisma.notification.findFirst({
            where: {
                id,
                userId: req.user!.id
            }
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await req.prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
    try {
        await req.prisma.notification.updateMany({
            where: {
                userId: req.user!.id,
                isRead: false
            },
            data: {
                isRead: true
            }
        });

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

// Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const count = await req.prisma.notification.count({
            where: {
                userId: req.user!.id,
                isRead: false
            }
        });

        res.json({ count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

export default router;
