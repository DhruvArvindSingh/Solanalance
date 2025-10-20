import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Create staking (recruiters only)
router.post('/', authenticateToken, requireRole('recruiter'), async (req, res) => {
    try {
        const {
            jobId,
            freelancerId,
            totalStaked,
            walletAddress,
            transactionSignature
        } = req.body;

        // Verify job belongs to recruiter
        const job = await req.prisma.job.findFirst({
            where: {
                id: jobId,
                recruiterId: req.user!.id
            }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Validate required fields
        if (!freelancerId) {
            return res.status(400).json({ error: 'freelancerId is required' });
        }

        // Create project
        const project = await req.prisma.project.create({
            data: {
                jobId,
                recruiterId: req.user!.id,
                freelancerId,
                currentStage: 1,
                status: 'in_progress'
            }
        });

        // Create staking record
        const staking = await req.prisma.staking.create({
            data: {
                projectId: project.id,
                recruiterId: req.user!.id,
                totalStaked: parseFloat(totalStaked),
                totalReleased: 0,
                walletAddress,
                transactionSignature
            }
        });

        // Create initial milestones for the project
        const stages = await req.prisma.jobStage.findMany({
            where: { jobId },
            orderBy: { stageNumber: 'asc' }
        });

        if (stages.length > 0) {
            const milestones = stages.map(stage => ({
                projectId: project.id,
                stageId: stage.id,
                stageNumber: stage.stageNumber,
                status: stage.stageNumber === 1 ? 'in_progress' : 'pending',
                paymentAmount: stage.payment
            }));

            await req.prisma.milestone.createMany({
                data: milestones
            });
        }

        // Record transaction
        await req.prisma.transaction.create({
            data: {
                projectId: project.id,
                fromUserId: req.user!.id,
                amount: parseFloat(totalStaked),
                type: 'stake',
                walletSignature: transactionSignature,
                walletFrom: walletAddress,
                status: 'confirmed'
            }
        });

        // Create notification for freelancer
        await req.prisma.notification.create({
            data: {
                userId: freelancerId,
                title: "You've been selected!",
                message: `You have been selected for "${job.title}". The recruiter has staked ${totalStaked} SOL.`,
                type: 'application',
                relatedId: project.id
            }
        });

        // Update job status
        await req.prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'in_progress',
                selectedFreelancerId: freelancerId
            }
        });

        // Update application status to selected
        await req.prisma.application.updateMany({
            where: {
                jobId,
                freelancerId
            },
            data: {
                status: 'selected'
            }
        });

        // Reject other applications
        await req.prisma.application.updateMany({
            where: {
                jobId,
                freelancerId: {
                    not: freelancerId
                }
            },
            data: {
                status: 'rejected'
            }
        });

        res.status(201).json({
            message: 'Staking successful! Project started.',
            projectId: project.id,
            stakingId: staking.id
        });
    } catch (error) {
        console.error('Create staking error:', error);
        res.status(500).json({ error: 'Failed to create staking' });
    }
});

// Get staking info for project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;

        const staking = await req.prisma.staking.findFirst({
            where: { projectId },
            include: {
                project: {
                    select: {
                        recruiterId: true,
                        freelancerId: true
                    }
                }
            }
        });

        if (!staking) {
            return res.status(404).json({ error: 'Staking not found' });
        }

        // Verify user has access to this project
        if (staking.project.recruiterId !== req.user!.id && staking.project.freelancerId !== req.user!.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const response = {
            id: staking.id,
            project_id: staking.projectId,
            recruiter_id: staking.recruiterId,
            total_staked: staking.totalStaked,
            total_released: staking.totalReleased,
            wallet_address: staking.walletAddress,
            transaction_signature: staking.transactionSignature,
            created_at: staking.createdAt
        };

        res.json(response);
    } catch (error) {
        console.error('Get staking error:', error);
        res.status(500).json({ error: 'Failed to get staking info' });
    }
});

export default router;
