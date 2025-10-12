import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

export const authenticateToken = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;

        // Get user role from database
        const userRole = await req.prisma.userRole.findFirst({
            where: { userId: decoded.userId }
        });

        req.user = {
            id: decoded.userId,
            role: userRole?.role || 'freelancer'
        };

        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

export const requireRole = (role: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (req.user.role !== role) {
            return res.status(403).json({ error: `${role} role required` });
        }

        next();
    };
};
