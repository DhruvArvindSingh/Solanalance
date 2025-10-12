import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get user's transactions
router.get('/my-transactions', authenticateToken, async (req, res) => {
    try {
        const transactions = await req.prisma.transaction.findMany({
            where: {
                OR: [
                    { fromUserId: req.user!.id },
                    { toUserId: req.user!.id }
                ]
            },
            include: {
                project: {
                    include: {
                        job: {
                            select: {
                                title: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const transformedTransactions = transactions.map(transaction => ({
            id: transaction.id,
            amount: transaction.amount,
            type: transaction.type,
            wallet_signature: transaction.walletSignature,
            wallet_from: transaction.walletFrom,
            wallet_to: transaction.walletTo,
            status: transaction.status,
            created_at: transaction.createdAt,
            project: transaction.project ? {
                job_title: transaction.project.job?.title || 'Unknown Project'
            } : null
        }));

        res.json(transformedTransactions);
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to get transactions' });
    }
});

// Get transaction by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const transaction = await req.prisma.transaction.findFirst({
            where: {
                id,
                OR: [
                    { fromUserId: req.user!.id },
                    { toUserId: req.user!.id }
                ]
            },
            include: {
                fromUser: {
                    select: {
                        fullName: true
                    }
                },
                toUser: {
                    select: {
                        fullName: true
                    }
                },
                project: {
                    include: {
                        job: {
                            select: {
                                title: true
                            }
                        }
                    }
                }
            }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const response = {
            id: transaction.id,
            amount: transaction.amount,
            type: transaction.type,
            wallet_signature: transaction.walletSignature,
            wallet_from: transaction.walletFrom,
            wallet_to: transaction.walletTo,
            status: transaction.status,
            created_at: transaction.createdAt,
            from_user: transaction.fromUser?.fullName,
            to_user: transaction.toUser?.fullName,
            project: transaction.project ? {
                job_title: transaction.project.job?.title || 'Unknown Project'
            } : null
        };

        res.json(response);
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ error: 'Failed to get transaction' });
    }
});

export default router;
