import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get messages for a project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        // Verify user has access to this project
        const project = await req.prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.recruiterId !== req.user!.id && project.freelancerId !== req.user!.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const messages = await req.prisma.message.findMany({
            where: { projectId },
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
            take: parseInt(limit as string),
            skip: parseInt(offset as string)
        });

        // Mark messages as read for the current user
        await req.prisma.message.updateMany({
            where: {
                projectId,
                senderId: {
                    not: req.user!.id
                },
                isRead: false
            },
            data: {
                isRead: true
            }
        });

        const transformedMessages = messages.map(message => ({
            id: message.id,
            content: message.content,
            message_type: message.messageType,
            file_url: message.fileUrl,
            file_name: message.fileName,
            file_size: message.fileSize,
            is_read: message.isRead,
            created_at: message.createdAt,
            sender_id: message.senderId,
            sender: {
                full_name: message.sender.fullName,
                avatar_url: message.sender.avatarUrl
            }
        }));

        res.json(transformedMessages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});

// Send message
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            projectId,
            content,
            messageType = 'text',
            fileUrl,
            fileName,
            fileSize
        } = req.body;

        // Verify user has access to this project
        const project = await req.prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.recruiterId !== req.user!.id && project.freelancerId !== req.user!.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const message = await req.prisma.message.create({
            data: {
                projectId,
                senderId: req.user!.id,
                content,
                messageType,
                fileUrl,
                fileName,
                fileSize: fileSize ? parseInt(fileSize) : null
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
        const recipientId = project.recruiterId === req.user!.id
            ? project.freelancerId
            : project.recruiterId;

        await req.prisma.notification.create({
            data: {
                userId: recipientId,
                title: 'New Message',
                message: `You have a new message in your project`,
                type: 'message',
                relatedId: message.id
            }
        });

        const response = {
            id: message.id,
            content: message.content,
            message_type: message.messageType,
            file_url: message.fileUrl,
            file_name: message.fileName,
            file_size: message.fileSize,
            is_read: message.isRead,
            created_at: message.createdAt,
            sender_id: message.senderId,
            sender: {
                full_name: message.sender.fullName,
                avatar_url: message.sender.avatarUrl
            }
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

export default router;
