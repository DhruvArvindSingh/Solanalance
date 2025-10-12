import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from './generated/prisma';

// Import routes
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import jobRoutes from './routes/jobs';
import applicationRoutes from './routes/applications';
import projectRoutes from './routes/projects';
import transactionRoutes from './routes/transactions';
import stakingRoutes from './routes/staking';
import ratingRoutes from './routes/ratings';
import messageRoutes from './routes/messages';
import notificationRoutes from './routes/notifications';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Make prisma available to all routes
app.use((req, res, next) => {
    req.prisma = prisma;
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/staking', stakingRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            prisma: PrismaClient;
            user?: {
                id: string;
                role: string;
            };
        }
    }
}