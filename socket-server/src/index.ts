import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Set default values for Firebase config (you should set these in your .env file)
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-firebase-project-id';
process.env.FIREBASE_PRIVATE_KEY_ID = process.env.FIREBASE_PRIVATE_KEY_ID || 'your-private-key-id';
process.env.FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n';
process.env.FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com';
process.env.FIREBASE_CLIENT_ID = process.env.FIREBASE_CLIENT_ID || 'your-client-id';
process.env.FIREBASE_CLIENT_X509_CERT_URL = process.env.FIREBASE_CLIENT_X509_CERT_URL || 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com';

// Initialize Firebase Admin SDK
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();

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
            "http://127.0.0.1:8080",
            "http://127.0.0.1:8081",
            "http://127.0.0.1:3000"
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
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

// Socket.IO connection handling
io.on('connection', (socket) => {
    const userId = socket.data.user.userId;
    const userRole = socket.data.user.role || 'freelancer'; // Default role if not provided

    console.log(`User ${userId} connected with socket ${socket.id}`);

    // Store user's socket ID
    activeUsers.set(userId, socket.id);

    // Handle joining project rooms
    socket.on('join-project', async (projectId: string) => {
        try {
            // Verify user has access to this project (you might want to check against your database)
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
    }) => {
        try {
            const { projectId, content, messageType = 'text', recipientId } = data;

            // Create message document in Firestore
            const messageData: any = {
                id: uuidv4(),
                projectId,
                senderId: userId,
                content,
                messageType,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                readBy: [userId] // Mark as read by sender
            };

            if (recipientId) {
                messageData.recipientId = recipientId;
            }

            // Add message to Firestore
            const messageRef = await db.collection('messages').add(messageData);

            // Get the message with timestamp
            const messageDoc = await messageRef.get();
            const messageDataFromDb = messageDoc.data();

            // Fetch sender profile information from backend API
            let senderProfile = null;
            try {
                // Make HTTP request to backend to get sender profile
                const response = await fetch(`http://localhost:3000/api/profile/${userId}`);
                if (response.ok) {
                    const profileData = await response.json() as any;
                    senderProfile = {
                        id: profileData.id,
                        full_name: profileData.fullName || 'Unknown User',
                        avatar_url: profileData.avatarUrl
                    };
                } else {
                    console.error(`Failed to fetch sender profile: ${response.status} ${response.statusText}`);
                }
            } catch (error) {
                console.error('Error fetching sender profile:', error);
                // Provide fallback sender profile
                senderProfile = {
                    id: userId,
                    full_name: 'Unknown User',
                    avatar_url: null
                };
            }

            const message = {
                id: messageDoc.id,
                projectId: projectId, // Add projectId to the message object
                sender_id: messageDataFromDb?.senderId || userId,
                content: messageDataFromDb?.content || '',
                created_at: messageDataFromDb?.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
                sender: senderProfile
            };

            // Emit message to other users in the project room
            socket.to(`project-${projectId}`).emit('new-message', message);

            // Create notification for recipient if specified
            if (recipientId && recipientId !== userId) {
                const notificationData = {
                    id: uuidv4(),
                    userId: recipientId,
                    title: 'New Message',
                    message: 'You have received a new message',
                    type: 'message',
                    relatedId: projectId,
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('notifications').add(notificationData);

                // Send real-time notification if user is online
                const recipientSocketId = activeUsers.get(recipientId);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('notification', notificationData);
                }
            }

            // Send confirmation with the full message to sender
            socket.emit('message-sent', message);

        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    // Handle marking messages as read
    socket.on('mark-messages-read', async (data: { projectId: string }) => {
        try {
            const { projectId } = data;

            // Update messages in Firestore to mark as read by this user
            const messagesRef = db.collection('messages')
                .where('projectId', '==', projectId)
                .where('recipientId', '==', userId);

            const snapshot = await messagesRef.get();

            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                const readBy = doc.data().readBy || [];
                if (!readBy.includes(userId)) {
                    batch.update(doc.ref, {
                        readBy: [...readBy, userId]
                    });
                }
            });

            await batch.commit();

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

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected`);

        // Remove from active users
        activeUsers.delete(userId);

        // Clean up user's room tracking
        if (userRooms.has(userId)) {
            userRooms.delete(userId);
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        activeConnections: io.engine.clientsCount
    });
});

// Get messages for a project (REST API fallback)
app.get('/api/messages/project/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { limit = 100, offset = 0 } = req.query;

        // Verify JWT token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        // Get messages from Firestore
        let query = db.collection('messages')
            .where('projectId', '==', projectId)
            .orderBy('createdAt', 'desc')
            .limit(parseInt(limit as string));

        if (offset) {
            // For pagination, you'd need to implement cursor-based pagination
        }

        const snapshot = await query.get();

        // Get all unique sender IDs
        const senderIds = [...new Set(snapshot.docs.map(doc => doc.data().senderId).filter(id => id))];

        // Fetch sender profiles
        const senderProfiles: { [key: string]: any } = {};
        for (const senderId of senderIds) {
            try {
                const response = await fetch(`http://localhost:3000/api/profile/${senderId}`);
                if (response.ok) {
                    const profileData = await response.json() as any;
                    senderProfiles[senderId] = {
                        id: profileData.id,
                        full_name: profileData.fullName || 'Unknown User',
                        avatar_url: profileData.avatarUrl
                    };
                } else {
                    console.error(`Failed to fetch profile for sender ${senderId}: ${response.status} ${response.statusText}`);
                    // Provide fallback sender profile
                    senderProfiles[senderId] = {
                        id: senderId,
                        full_name: 'Unknown User',
                        avatar_url: null
                    };
                }
            } catch (error) {
                console.error(`Error fetching profile for sender ${senderId}:`, error);
                // Provide fallback sender profile
                senderProfiles[senderId] = {
                    id: senderId,
                    full_name: 'Unknown User',
                    avatar_url: null
                };
            }
        }

        const messages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                sender_id: data.senderId,
                content: data.content,
                created_at: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
                sender: senderProfiles[data.senderId] || null
            };
        });

        // Reverse to get chronological order
        messages.reverse();

        res.json(messages);

    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send message via REST API
app.post('/api/messages', async (req, res) => {
    try {
        const { projectId, content, messageType = 'text', recipientId } = req.body;

        // Verify JWT token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const senderId = decoded.id;

        // Create message in Firestore
        const messageData = {
            id: uuidv4(),
            projectId,
            senderId,
            content,
            messageType,
            recipientId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            readBy: [senderId]
        };

        const messageRef = await db.collection('messages').add(messageData);

        // Emit real-time message if users are connected
        io.to(`project-${projectId}`).emit('new-message', {
            ...messageData,
            id: messageRef.id,
            createdAt: new Date().toISOString()
        });

        res.json({ success: true, messageId: messageRef.id });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Get notifications for user
app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Verify JWT token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        // Ensure user can only access their own notifications
        if (decoded.id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get notifications from Firestore
        const snapshot = await db.collection('notifications')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
        }));

        res.json(notifications);

    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark notification as read
app.put('/api/notifications/:notificationId/read', async (req, res) => {
    try {
        const { notificationId } = req.params;

        // Verify JWT token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        await db.collection('notifications').doc(notificationId).update({
            read: true
        });

        res.json({ success: true });

    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Start server
const PORT = process.env.SOCKET_PORT || 3001;

server.listen(PORT, () => {
    console.log(`🚀 Socket server running on port ${PORT}`);
    console.log(`📱 WebSocket endpoint: ws://localhost:${PORT}`);
    console.log(`🔥 Firebase project: ${process.env.FIREBASE_PROJECT_ID}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down socket server gracefully...');
    io.close(() => {
        console.log('Socket.IO server closed');
        process.exit(0);
    });
});
