import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get all conversations for the current user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user!.id;
        const { search } = req.query;

        // Build search conditions
        const searchConditions = search ? {
            OR: [
                { job: { title: { contains: search as string, mode: 'insensitive' as any } } },
                { recruiter: { fullName: { contains: search as string, mode: 'insensitive' as any } } },
                { freelancer: { fullName: { contains: search as string, mode: 'insensitive' as any } } },
                { messages: { some: { content: { contains: search as string, mode: 'insensitive' as any } } } }
            ]
        } : {};

        const projects = await req.prisma.project.findMany({
            where: {
                OR: [
                    { recruiterId: userId },
                    { freelancerId: userId }
                ],
                status: { in: ['active', 'completed'] },
                ...searchConditions
            },
            include: {
                job: {
                    select: {
                        title: true
                    }
                },
                recruiter: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true
                    }
                },
                freelancer: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true
                    }
                },
                messages: {
                    where: {
                        deletedAt: null // Exclude deleted messages
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        content: true,
                        createdAt: true,
                        isRead: true,
                        senderId: true
                    }
                },
                _count: {
                    select: {
                        messages: {
                            where: {
                                isRead: false,
                                senderId: { not: userId },
                                deletedAt: null
                            }
                        }
                    }
                }
            },
            orderBy: [
                {
                    messages: {
                        _count: 'desc'
                    }
                },
                {
                    createdAt: 'desc'
                }
            ]
        });

        // Transform the data for frontend consumption
        const conversations = projects.map((project: any) => {
            const isRecruiter = project.recruiterId === userId;
            const otherUser = isRecruiter ? project.freelancer : project.recruiter;
            const lastMessage = project.messages[0];

            return {
                id: project.id,
                job: project.job,
                otherUser: {
                    id: otherUser.id,
                    full_name: otherUser.fullName,
                    avatar_url: otherUser.avatarUrl
                },
                lastMessage: lastMessage ? {
                    content: lastMessage.content,
                    created_at: lastMessage.createdAt.toISOString(),
                    isRead: lastMessage.isRead,
                    sender_id: lastMessage.senderId
                } : null,
                unreadCount: project._count.messages
            };
        });

        res.json(conversations);

    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Get messages for a specific conversation/project with pagination
router.get('/:projectId/messages', authenticateToken, async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId } = req.params;
        const { page = '1', limit = '50', before } = req.query;

        // Verify user has access to this project
        const project = await req.prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [
                    { recruiterId: userId },
                    { freelancerId: userId }
                ]
            }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        // Build where clause for cursor-based pagination if 'before' is provided
        const whereClause: any = {
            projectId,
            deletedAt: null // Exclude soft-deleted messages
        };

        if (before) {
            // Get messages before a certain message ID (for infinite scroll)
            const beforeMessage = await req.prisma.message.findUnique({
                where: { id: before as string },
                select: { createdAt: true }
            });

            if (beforeMessage) {
                whereClause.createdAt = {
                    lt: beforeMessage.createdAt
                };
            }
        }

        // Get total count for pagination info
        const totalCount = await req.prisma.message.count({
            where: {
                projectId,
                deletedAt: null
            }
        });

        // Fetch messages
        const messages = await req.prisma.message.findMany({
            where: whereClause,
            include: {
                sender: {
                    select: {
                        fullName: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: {
                createdAt: 'asc' // Chronological order
            },
            skip: before ? 0 : skip, // Don't skip if using cursor
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
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a message
router.post('/:projectId/messages', authenticateToken, async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId } = req.params;
        const { content, messageType = 'text', fileUrl, fileName, fileSize } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify user has access to this project
        const project = await req.prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [
                    { recruiterId: userId },
                    { freelancerId: userId }
                ]
            },
            include: {
                recruiter: { select: { id: true, fullName: true } },
                freelancer: { select: { id: true, fullName: true } },
                job: { select: { title: true } }
            }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Create the message
        const message = await req.prisma.message.create({
            data: {
                projectId,
                senderId: userId,
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

        // Determine recipient
        const recipientId = project.recruiterId === userId
            ? project.freelancerId
            : project.recruiterId;

        const recipientName = project.recruiterId === userId
            ? project.freelancer.fullName
            : project.recruiter.fullName;

        // Create notification for recipient
        await req.prisma.notification.create({
            data: {
                userId: recipientId,
                title: 'New Message',
                message: `${message.sender.fullName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
                type: 'new_message',
                relatedId: projectId,
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
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Edit a message
router.patch('/:projectId/messages/:messageId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId, messageId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify user owns the message
        const message = await req.prisma.message.findFirst({
            where: {
                id: messageId,
                projectId,
                senderId: userId,
                deletedAt: null
            }
        });

        if (!message) {
            return res.status(404).json({ error: 'Message not found or unauthorized' });
        }

        // Update the message
        const updatedMessage = await req.prisma.message.update({
            where: { id: messageId },
            data: {
                content: content.trim(),
                updatedAt: new Date()
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

        res.json({
            id: updatedMessage.id,
            sender_id: updatedMessage.senderId,
            content: updatedMessage.content,
            created_at: updatedMessage.createdAt.toISOString(),
            updated_at: updatedMessage.updatedAt.toISOString(),
            sender: {
                full_name: updatedMessage.sender.fullName,
                avatar_url: updatedMessage.sender.avatarUrl
            },
            messageType: updatedMessage.messageType,
            fileUrl: updatedMessage.fileUrl,
            fileName: updatedMessage.fileName,
            fileSize: updatedMessage.fileSize,
            isRead: updatedMessage.isRead
        });

    } catch (error) {
        console.error('Error editing message:', error);
        res.status(500).json({ error: 'Failed to edit message' });
    }
});

// Delete a message (soft delete)
router.delete('/:projectId/messages/:messageId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId, messageId } = req.params;

        // Verify user owns the message
        const message = await req.prisma.message.findFirst({
            where: {
                id: messageId,
                projectId,
                senderId: userId,
                deletedAt: null
            }
        });

        if (!message) {
            return res.status(404).json({ error: 'Message not found or unauthorized' });
        }

        // Soft delete - mark as deleted
        await req.prisma.message.update({
            where: { id: messageId },
            data: {
                deletedAt: new Date(),
                content: 'This message has been deleted'
            }
        });

        res.json({ success: true, messageId });

    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// Mark messages as read
router.patch('/:projectId/read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user!.id;
        const { projectId } = req.params;

        // Verify user has access to this project
        const project = await req.prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [
                    { recruiterId: userId },
                    { freelancerId: userId }
                ]
            }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Mark all messages in this project as read for the current user
        // (Only messages not sent by the current user)
        await req.prisma.message.updateMany({
            where: {
                projectId,
                senderId: { not: userId },
                isRead: false,
                deletedAt: null
            },
            data: {
                isRead: true
            }
        });

        res.json({ success: true });

    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});

export default router;
