import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { uploadMessageFileToS3 } from './utils/s3Upload';

// Load environment variables
dotenv.config();

// Initialize Prisma Client
const prisma = new PrismaClient();

// Profile cache to reduce database queries
interface CachedProfile {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    cachedAt: number;
}

const profileCache = new Map<string, CachedProfile>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Create Express app
const app = express();
const server = createServer(app);

// Configure CORS for Socket.IO
const io = new SocketIOServer(server, {
    cors: {
        origin: [
            "http://localhost:8080",
            "http://localhost:8081",
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:8080",
            "http://127.0.0.1:8081",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173"
        ],
        methods: ["GET", "POST", "PATCH", "DELETE"],
        credentials: true
    }
});

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit for message files
    },
    fileFilter: (req, file, cb) => {
        // Allowed file types for messages
        const allowedMimes = [
            // Images
            'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
            // Documents
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain', 'text/csv',
            // Archives
            'application/zip', 'application/x-zip-compressed',
            'application/x-rar-compressed', 'application/x-7z-compressed',
            // Audio
            'audio/mpeg', 'audio/wav', 'audio/ogg',
            // Video
            'video/mp4', 'video/webm', 'video/ogg',
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type not allowed: ${file.mimetype}`));
        }
    },
});

// Middleware
app.use(cors());
app.use(express.json());

// JWT Authentication middleware for Socket.IO
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.data.user = decoded;
        next();
    } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
    }
});

// Store active users and their socket connections
const activeUsers = new Map<string, string>(); // userId -> socketId
const userRooms = new Map<string, Set<string>>(); // userId -> Set of roomIds

// Helper function to get profile from cache or database
async function getProfile(userId: string): Promise<CachedProfile | null> {
    // Check cache first
    const cached = profileCache.get(userId);
    if (cached && (Date.now() - cached.cachedAt < CACHE_TTL)) {
        return cached;
    }

    // Fetch from database
    try {
        const profile = await prisma.profile.findUnique({
            where: { id: userId },
            select: {
                id: true,
                fullName: true,
                avatarUrl: true
            }
        });

        if (profile) {
            const cachedProfile: CachedProfile = {
                ...profile,
                cachedAt: Date.now()
            };
            profileCache.set(userId, cachedProfile);
            return cachedProfile;
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
    }

    return null;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    const userId = socket.data.user.userId;
    const userRole = socket.data.user.role || 'freelancer';

    console.log(`User ${userId} connected with socket ${socket.id}`);

    // Store user's socket ID
    activeUsers.set(userId, socket.id);

    // Broadcast user online status
    io.emit('user:online', { userId, status: 'online' });

    // Handle joining project rooms
    socket.on('join-project', async (projectId: string) => {
        try {
            // Verify user has access to this project
            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    OR: [
                        { recruiterId: userId },
                        { freelancerId: userId }
                    ]
                }
            });

            if (!project) {
                socket.emit('error', { message: 'Unauthorized access to project' });
                return;
            }

            socket.join(`project-${projectId}`);

            // Add to user's room tracking
            if (!userRooms.has(userId)) {
                userRooms.set(userId, new Set());
            }
            userRooms.get(userId)!.add(`project-${projectId}`);

            console.log(`User ${userId} joined project room: project-${projectId}`);

            // Send confirmation
            socket.emit('joined-project', { projectId });
        } catch (error) {
            console.error('Error joining project room:', error);
            socket.emit('error', { message: 'Failed to join project room' });
        }
    });

    // Handle joining multiple projects at once
    socket.on('join-projects', async (projectIds: string[]) => {
        for (const projectId of projectIds) {
            try {
                const project = await prisma.project.findFirst({
                    where: {
                        id: projectId,
                        OR: [
                            { recruiterId: userId },
                            { freelancerId: userId }
                        ]
                    }
                });

                if (project) {
                    socket.join(`project-${projectId}`);
                    if (!userRooms.has(userId)) {
                        userRooms.set(userId, new Set());
                    }
                    userRooms.get(userId)!.add(`project-${projectId}`);
                }
            } catch (error) {
                console.error(`Error joining project ${projectId}:`, error);
            }
        }
    });

    // Handle leaving project rooms
    socket.on('leave-project', (projectId: string) => {
        socket.leave(`project-${projectId}`);

        // Remove from user's room tracking
        if (userRooms.has(userId)) {
            userRooms.get(userId)!.delete(`project-${projectId}`);
        }

        console.log(`User ${userId} left project room: project-${projectId}`);
    });

    // Handle sending messages
    socket.on('send-message', async (data: {
        projectId: string;
        content: string;
        messageType?: string;
        recipientId?: string;
        fileUrl?: string;
        fileName?: string;
        fileSize?: number;
    }) => {
        try {
            const { projectId, content, messageType = 'text', recipientId, fileUrl, fileName, fileSize } = data;

            // Verify user has access to this project
            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    OR: [
                        { recruiterId: userId },
                        { freelancerId: userId }
                    ]
                }
            });

            if (!project) {
                socket.emit('error', { message: 'Unauthorized access to project' });
                return;
            }

            // Create message in database
            const message = await prisma.message.create({
                data: {
                    projectId,
                    senderId: userId,
                    content,
                    messageType,
                    fileUrl,
                    fileName,
                    fileSize,
                    isRead: false
                }
            });

            // Get sender profile from cache
            const senderProfile = await getProfile(userId);

            const messageData = {
                id: message.id,
                projectId: message.projectId,
                sender_id: message.senderId,
                content: message.content,
                created_at: message.createdAt.toISOString(),
                messageType: message.messageType,
                fileUrl: message.fileUrl,
                fileName: message.fileName,
                fileSize: message.fileSize,
                sender: senderProfile ? {
                    full_name: senderProfile.fullName,
                    avatar_url: senderProfile.avatarUrl
                } : null
            };

            // Emit message to other users in the project room
            socket.to(`project-${projectId}`).emit('new-message', messageData);

            // Also send back to sender for confirmation
            socket.emit('message-sent', messageData);

            // Create notification for recipient
            const recipientUserId = project.recruiterId === userId
                ? project.freelancerId
                : project.recruiterId;

            if (recipientUserId) {
                await prisma.notification.create({
                    data: {
                        userId: recipientUserId,
                        title: 'New Message',
                        message: `${senderProfile?.fullName || 'Someone'} sent you a message`,
                        type: 'new_message',
                        relatedId: projectId,
                        isRead: false
                    }
                });

                // Send real-time notification if user is online
                const recipientSocketId = activeUsers.get(recipientUserId);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('notification', {
                        title: 'New Message',
                        message: `${senderProfile?.fullName || 'Someone'} sent you a message`,
                        type: 'new_message',
                        relatedId: projectId
                    });
                }
            }

        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    // Handle message editing
    socket.on('edit-message', async (data: {
        messageId: string;
        content: string;
    }) => {
        try {
            const { messageId, content } = data;

            // Verify message belongs to user
            const existingMessage = await prisma.message.findFirst({
                where: {
                    id: messageId,
                    senderId: userId
                }
            });

            if (!existingMessage) {
                socket.emit('error', { message: 'Message not found or unauthorized' });
                return;
            }

            // Update message
            const updatedMessage = await prisma.message.update({
                where: { id: messageId },
                data: {
                    content,
                    updatedAt: new Date()
                }
            });

            const senderProfile = await getProfile(userId);

            const messageData = {
                id: updatedMessage.id,
                projectId: updatedMessage.projectId,
                sender_id: updatedMessage.senderId,
                content: updatedMessage.content,
                created_at: updatedMessage.createdAt.toISOString(),
                updated_at: updatedMessage.updatedAt.toISOString(),
                messageType: updatedMessage.messageType,
                sender: senderProfile ? {
                    full_name: senderProfile.fullName,
                    avatar_url: senderProfile.avatarUrl
                } : null
            };

            // Broadcast edit to all users in room
            io.to(`project-${updatedMessage.projectId}`).emit('message-edited', messageData);
            socket.emit('message-edited', messageData);

        } catch (error) {
            console.error('Error editing message:', error);
            socket.emit('error', { message: 'Failed to edit message' });
        }
    });

    // Handle message deletion
    socket.on('delete-message', async (data: {
        messageId: string;
    }) => {
        try {
            const { messageId } = data;

            // Verify message belongs to user
            const existingMessage = await prisma.message.findFirst({
                where: {
                    id: messageId,
                    senderId: userId
                }
            });

            if (!existingMessage) {
                socket.emit('error', { message: 'Message not found or unauthorized' });
                return;
            }

            // Soft delete - mark as deleted
            await prisma.message.update({
                where: { id: messageId },
                data: {
                    deletedAt: new Date(),
                    content: 'This message has been deleted'
                }
            });

            // Broadcast deletion to all users in room
            io.to(`project-${existingMessage.projectId}`).emit('message-deleted', {
                messageId,
                projectId: existingMessage.projectId
            });

            socket.emit('message-deleted', {
                messageId,
                projectId: existingMessage.projectId
            });

        } catch (error) {
            console.error('Error deleting message:', error);
            socket.emit('error', { message: 'Failed to delete message' });
        }
    });

    // Handle marking messages as read
    socket.on('mark-messages-read', async (data: { projectId: string }) => {
        try {
            const { projectId } = data;

            // Update messages to mark as read by this user
            await prisma.message.updateMany({
                where: {
                    projectId,
                    senderId: {
                        not: userId
                    },
                    isRead: false
                },
                data: {
                    isRead: true
                }
            });

            socket.emit('messages-marked-read', { projectId });

        } catch (error) {
            console.error('Error marking messages as read:', error);
            socket.emit('error', { message: 'Failed to mark messages as read' });
        }
    });

    // Handle typing indicators
    socket.on('typing-start', (data: { projectId: string }) => {
        socket.to(`project-${data.projectId}`).emit('user-typing', {
            userId,
            projectId: data.projectId
        });
    });

    socket.on('typing-stop', (data: { projectId: string }) => {
        socket.to(`project-${data.projectId}`).emit('user-stopped-typing', {
            userId,
            projectId: data.projectId
        });
    });

    // Handle direct message sending
    socket.on('send-direct-message', async (data: {
        recipientId: string;
        content: string;
        messageType?: string;
        fileUrl?: string;
        fileName?: string;
        fileSize?: number;
    }) => {
        try {
            const { recipientId, content, messageType = 'text', fileUrl, fileName, fileSize } = data;

            if (!content?.trim()) {
                socket.emit('error', { message: 'Message content is required' });
                return;
            }

            // Create the direct message
            const directMessage = await prisma.directMessage.create({
                data: {
                    senderId: userId,
                    recipientId,
                    content: content.trim(),
                    messageType,
                    fileUrl,
                    fileName,
                    fileSize,
                    isRead: false
                }
            });

            // Get sender profile from cache
            const senderProfile = await getProfile(userId);

            // Create notification for recipient
            await prisma.notification.create({
                data: {
                    userId: recipientId,
                    title: 'New Direct Message',
                    message: `${senderProfile?.fullName || 'Someone'}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
                    type: 'direct_message',
                    relatedId: userId,
                    isRead: false
                }
            });

            // Prepare message for broadcasting
            const messageForBroadcast = {
                id: directMessage.id,
                sender_id: directMessage.senderId,
                content: directMessage.content,
                created_at: directMessage.createdAt.toISOString(),
                updated_at: directMessage.updatedAt.toISOString(),
                sender: {
                    full_name: senderProfile?.fullName || 'Unknown User',
                    avatar_url: senderProfile?.avatarUrl || null
                },
                messageType: directMessage.messageType,
                fileUrl: directMessage.fileUrl,
                fileName: directMessage.fileName,
                fileSize: directMessage.fileSize,
                isRead: directMessage.isRead,
                directMessageUserId: recipientId // This helps the frontend identify it as a direct message
            };

            // Emit to sender
            socket.emit('direct-message-sent', messageForBroadcast);

            // Emit to recipient if they're online
            const recipientSockets = Array.from(io.sockets.sockets.values())
                .filter(s => s.data.userId === recipientId);

            recipientSockets.forEach(recipientSocket => {
                recipientSocket.emit('new-direct-message', {
                    ...messageForBroadcast,
                    directMessageUserId: userId // For recipient, the other user is the sender
                });
            });

        } catch (error) {
            console.error('Error sending direct message:', error);
            socket.emit('error', { message: 'Failed to send direct message' });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected`);

        // Remove from active users
        activeUsers.delete(userId);

        // Broadcast user offline status
        io.emit('user:online', { userId, status: 'offline' });

        // Clean up user's room tracking
        if (userRooms.has(userId)) {
            userRooms.delete(userId);
        }
    });
});

// File upload endpoint for messages
app.post('/upload-message-file', (req, res) => {
    console.log('File upload request received');

    upload.single('file')(req, res, async (err) => {
        try {
            if (err) {
                console.error('Multer error:', err);
                return res.status(400).json({ error: err.message });
            }

            if (!req.file) {
                console.log('No file in request');
                return res.status(400).json({ error: 'No file uploaded' });
            }

            console.log('File received:', {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            });

            const { userId, conversationType, conversationId } = req.body;
            console.log('Request body:', { userId, conversationType, conversationId });

            if (!userId || !conversationType || !conversationId) {
                return res.status(400).json({
                    error: 'Missing required fields: userId, conversationType, conversationId'
                });
            }

            if (!['project', 'direct'].includes(conversationType)) {
                return res.status(400).json({
                    error: 'Invalid conversationType. Must be "project" or "direct"'
                });
            }

            // Upload file to S3
            console.log('Uploading to S3...');
            const fileData = await uploadMessageFileToS3({
                userId,
                file: {
                    buffer: req.file.buffer,
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                },
                conversationType: conversationType as 'project' | 'direct',
                conversationId,
            });

            console.log('S3 upload successful:', fileData);

            res.json({
                success: true,
                fileUrl: fileData.url,
                fileName: fileData.fileName,
                fileSize: fileData.fileSize,
                mimetype: req.file.mimetype,
            });

        } catch (error: any) {
            console.error('File upload error:', error);

            if (error.message.includes('File size exceeds')) {
                return res.status(400).json({ error: error.message });
            }

            if (error.message.includes('File type not allowed')) {
                return res.status(400).json({ error: error.message });
            }

            res.status(500).json({ error: 'Failed to upload file' });
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        activeConnections: io.engine.clientsCount,
        database: 'PostgreSQL',
        cacheSize: profileCache.size
    });
});

// Get messages for a project (REST API fallback) with pagination
app.get('/api/messages/project/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { limit = '50', page = '1' } = req.query;

        // Verify JWT token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const userId = decoded.userId || decoded.id;

        // Verify user has access to this project
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [
                    { recruiterId: userId },
                    { freelancerId: userId }
                ]
            }
        });

        if (!project) {
            return res.status(403).json({ error: 'Unauthorized access to project' });
        }

        const limitNum = parseInt(limit as string);
        const pageNum = parseInt(page as string);
        const skip = (pageNum - 1) * limitNum;

        // Get messages with pagination
        const [messages, totalCount] = await Promise.all([
            prisma.message.findMany({
                where: {
                    projectId,
                    deletedAt: null // Exclude deleted messages
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
            }),
            prisma.message.count({
                where: {
                    projectId,
                    deletedAt: null
                }
            })
        ]);

        const transformedMessages = messages.map((msg: any) => ({
            id: msg.id,
            sender_id: msg.senderId,
            content: msg.content,
            created_at: msg.createdAt.toISOString(),
            updated_at: msg.updatedAt.toISOString(),
            messageType: msg.messageType,
            fileUrl: msg.fileUrl,
            fileName: msg.fileName,
            fileSize: msg.fileSize,
            sender: {
                full_name: msg.sender.fullName,
                avatar_url: msg.sender.avatarUrl
            }
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

// Start server
const PORT = process.env.SOCKET_PORT || 3001;

server.listen(PORT, () => {
    console.log(`🚀 Socket server running on port ${PORT}`);
    console.log(`📱 WebSocket endpoint: ws://localhost:${PORT}`);
    console.log(`💾 Database: PostgreSQL with Prisma`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down socket server gracefully...');
    await prisma.$disconnect();
    io.close(() => {
        console.log('Socket.IO server closed');
        process.exit(0);
    });
});

// Clear profile cache periodically (every 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [userId, profile] of profileCache.entries()) {
        if (now - profile.cachedAt > CACHE_TTL) {
            profileCache.delete(userId);
        }
    }
    console.log(`Profile cache cleaned. Current size: ${profileCache.size}`);
}, 10 * 60 * 1000);
