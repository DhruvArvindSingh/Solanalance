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

        // Validate token format before verification
        if (!token || token === 'undefined' || token === 'null' || token.split('.').length !== 3) {
            console.error('Auth error: Malformed token format', { 
                tokenPreview: token ? token.substring(0, 20) + '...' : 'empty',
                path: req.path 
            });
            return res.status(401).json({ error: 'Invalid token format' });
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
        if (error instanceof jwt.JsonWebTokenError) {
            console.error('Auth error: JWT verification failed', { 
                message: error.message,
                path: req.path 
            });
        } else {
            console.error('Auth error:', error);
        }
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
