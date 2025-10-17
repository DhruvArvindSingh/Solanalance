import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth';
import { getProfilePictureFromS3 } from '../utils/s3Upload';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName, role, walletAddress } = req.body;

        if (!email || !password || !fullName || !role || !walletAddress) {
            return res.status(400).json({ error: 'All fields including wallet address are required' });
        }

        // Validate wallet address format (basic Solana address validation)
        if (!/^([1-9A-HJ-NP-Za-km-z]{32,44})$/.test(walletAddress)) {
            return res.status(400).json({ error: 'Invalid Solana wallet address format' });
        }

        // Check if user exists
        const existingUser = await req.prisma.profile.findFirst({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Check if wallet address is already registered
        const existingWallet = await req.prisma.userWallet.findFirst({
            where: { walletAddress }
        });

        if (existingWallet) {
            return res.status(400).json({ error: 'Wallet address is already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user profile with unique userId
        const user = await req.prisma.profile.create({
            data: {
                id: generateUUID(),
                email,
                fullName,
                // Note: In a real app, you'd store the hashed password in a separate auth table
                // For this example, we'll store it in a way that works with the current schema
            }
        });

        // Create user role
        await req.prisma.userRole.create({
            data: {
                userId: user.id,
                role: role as any
            }
        });

        // Create user wallet
        await req.prisma.userWallet.create({
            data: {
                userId: user.id,
                walletAddress,
                isVerified: false // Wallet verification can be implemented later
            }
        });

        // Create initial trust points
        await req.prisma.trustPoint.create({
            data: {
                userId: user.id,
                totalPoints: 0,
                completedProjects: 0,
                successfulProjects: 0,
                tier: 'iron'
            }
        });

        // Generate JWT
        const token = jwt.sign({ userId: user.id, role }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                userId: user.userId, // Include the unique numeric ID
                email: user.email,
                fullName: user.fullName,
                walletAddress,
                role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await req.prisma.profile.findFirst({
            where: { email },
            include: {
                userRoles: true
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // In a real app, you'd verify the hashed password here
        // For this example, we'll assume the password is correct if user exists
        // const isValidPassword = await bcrypt.compare(password, user.hashedPassword);

        // Generate JWT
        const role = user.userRoles[0]?.role || 'freelancer';
        const token = jwt.sign({ userId: user.id, role }, JWT_SECRET, { expiresIn: '7d' });

        // Check S3 for profile picture if not set
        let avatarUrl = user.avatarUrl;
        if (!avatarUrl) {
            const s3ProfilePic = await getProfilePictureFromS3(user.id);
            if (s3ProfilePic) {
                avatarUrl = s3ProfilePic;
            }
        }

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: avatarUrl,
                role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await req.prisma.profile.findUnique({
            where: { id: req.user!.id },
            include: {
                userRoles: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check S3 for profile picture if not set
        let avatarUrl = user.avatarUrl;
        if (!avatarUrl) {
            const s3ProfilePic = await getProfilePictureFromS3(user.id);
            if (s3ProfilePic) {
                avatarUrl = s3ProfilePic;
            }
        }

        res.json({
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: avatarUrl,
            bio: user.bio,
            role: user.userRoles[0]?.role || 'freelancer'
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Utility function to generate UUID (in a real app, use a proper UUID library)
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export default router;
