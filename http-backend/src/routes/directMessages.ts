import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get all users that the current user has direct message conversations with
router.get('/users', authenticateToken, async (req, res) => {
    try {
        const userId = req.user!.id;

        // Find all direct messages where the user is either sender or recipient
        const directMessages = await req.prisma.directMessage.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { recipientId: userId }
                ]
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true
                    }
                },
                recipient: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Group messages by conversation partner and get the latest message for each
        const conversationMap = new Map();

        directMessages.forEach(message => {
            const partnerId = message.senderId === userId ? message.recipientId : message.senderId;
            const partner = message.senderId === userId ? message.recipient : message.sender;

            if (!conversationMap.has(partnerId)) {
                conversationMap.set(partnerId, {
                    id: partnerId,
                    full_name: partner.fullName,
                    avatar_url: partner.avatarUrl,
                    lastMessage: {
                        content: message.content,
                        created_at: message.createdAt.toISOString(),
                        isRead: message.isRead,
                        sender_id: message.senderId
                    },
                    unreadCount: 0
                });
            }
        });

        // Count unread messages for each conversation partner
        for (const [partnerId, conversation] of conversationMap) {
            const unreadCount = await req.prisma.directMessage.count({
                where: {
                    senderId: partnerId,
                    recipientId: userId,
                    isRead: false
                }
            });
            conversation.unreadCount = unreadCount;
        }

        const users = Array.from(conversationMap.values());
        res.json(users);

    } catch (error) {
        console.error('Error fetching direct message users:', error);
        res.status(500).json({ error: 'Failed to fetch direct message users' });
    }
});

// Get direct messages with a specific user
router.get('/:userId', authenticateToken, async (req, res) => {
    try {
        const currentUserId = req.user!.id;
        const { userId } = req.params;
        const { page = '1', limit = '50' } = req.query;

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        // Get total count for pagination info
        const totalCount = await req.prisma.directMessage.count({
            where: {
                OR: [
                    { senderId: currentUserId, recipientId: userId },
                    { senderId: userId, recipientId: currentUserId }
                ]
            }
        });

        // Fetch direct messages
        const messages = await req.prisma.directMessage.findMany({
            where: {
                OR: [
                    { senderId: currentUserId, recipientId: userId },
                    { senderId: userId, recipientId: currentUserId }
                ]
            },
            include: {
                sender: {
                    select: {
                        fullName: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            },
            skip,
            take: limitNum
        });

        // Transform messages for frontend
        const transformedMessages = messages.map(message => ({
            id: message.id,
            sender_id: message.senderId,
            content: message.content,
            created_at: message.createdAt.toISOString(),
            updated_at: message.updatedAt?.toISOString(),
            sender: {
                full_name: message.sender.fullName,
                avatar_url: message.sender.avatarUrl
            },
            messageType: message.messageType,
            fileUrl: message.fileUrl,
            fileName: message.fileName,
            fileSize: message.fileSize,
            isRead: message.isRead
        }));

        res.json({
            messages: transformedMessages,
            pagination: {
                total: totalCount,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(totalCount / limitNum),
                hasMore: skip + limitNum < totalCount
            }
        });

    } catch (error) {
        console.error('Error fetching direct messages:', error);
        res.status(500).json({ error: 'Failed to fetch direct messages' });
    }
});

// Send a direct message
router.post('/:userId', authenticateToken, async (req, res) => {
    try {
        const senderId = req.user!.id;
        const { userId: recipientId } = req.params;
        const { content, messageType = 'text', fileUrl, fileName, fileSize } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify recipient exists
        const recipient = await req.prisma.profile.findUnique({
            where: { id: recipientId },
            select: { id: true, fullName: true }
        });

        if (!recipient) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        // Create the direct message
        const message = await req.prisma.directMessage.create({
            data: {
                senderId,
                recipientId,
                content: content.trim(),
                messageType,
                fileUrl,
                fileName,
                fileSize: fileSize ? parseInt(fileSize) : null,
                isRead: false
            },
            include: {
                sender: {
                    select: {
                        fullName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        // Create notification for recipient
        await req.prisma.notification.create({
            data: {
                userId: recipientId,
                title: 'New Direct Message',
                message: `${message.sender.fullName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
                type: 'direct_message',
                relatedId: senderId,
                isRead: false
            }
        });

        // Transform message for response
        const transformedMessage = {
            id: message.id,
            sender_id: message.senderId,
            content: message.content,
            created_at: message.createdAt.toISOString(),
            updated_at: message.updatedAt?.toISOString(),
            sender: {
                full_name: message.sender.fullName,
                avatar_url: message.sender.avatarUrl
            },
            messageType: message.messageType,
            fileUrl: message.fileUrl,
            fileName: message.fileName,
            fileSize: message.fileSize,
            isRead: message.isRead
        };

        res.status(201).json(transformedMessage);

    } catch (error) {
        console.error('Error sending direct message:', error);
        res.status(500).json({ error: 'Failed to send direct message' });
    }
});

// Mark direct messages as read
router.patch('/:userId/read', authenticateToken, async (req, res) => {
    try {
        const currentUserId = req.user!.id;
        const { userId } = req.params;

        // Mark all messages from the specified user as read
        await req.prisma.directMessage.updateMany({
            where: {
                senderId: userId,
                recipientId: currentUserId,
                isRead: false
            },
            data: {
                isRead: true
            }
        });

        res.json({ success: true });

    } catch (error) {
        console.error('Error marking direct messages as read:', error);
        res.status(500).json({ error: 'Failed to mark direct messages as read' });
    }
});

export default router;
