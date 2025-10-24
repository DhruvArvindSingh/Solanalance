import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { verifyEscrowTransaction } from '../utils/solana-verification';

const router = express.Router();

/**
 * Verify and store escrow transaction
 * Checks if PDA exists, verifies funds, and stores in database if not already present
 */
router.post('/verify', authenticateToken, async (req, res) => {
    try {
        const {
            jobId,
            escrowPDA,
            transactionSignature,
            freelancerId,
            totalStaked
        } = req.body;

        // Validate required fields
        if (!jobId || !escrowPDA || !freelancerId) {
            return res.status(400).json({
                error: 'Missing required fields: jobId, escrowPDA, freelancerId'
            });
        }

        // Check if transaction already exists in database
        const existingTransaction = transactionSignature
            ? await req.prisma.transaction.findFirst({
                where: {
                    walletSignature: transactionSignature
                }
            })
            : null;

        if (existingTransaction) {
            console.log(`Transaction ${transactionSignature} already exists in database`);
            return res.json({
                message: 'Transaction already recorded',
                alreadyExists: true,
                transaction: existingTransaction
            });
        }

        // Verify escrow on Solana blockchain
        const verification = await verifyEscrowTransaction(
            escrowPDA,
            req.user!.id, // recruiter ID
            freelancerId
        );

        if (!verification.success) {
            return res.status(400).json({
                error: 'Escrow verification failed',
                details: verification.error
            });
        }

        // Check if project already exists for this job
        const existingProject = await req.prisma.project.findFirst({
            where: {
                jobId,
                recruiterId: req.user!.id,
                freelancerId
            }
        });

        let projectId: string;

        if (existingProject) {
            console.log(`Project already exists: ${existingProject.id}`);
            projectId = existingProject.id;
        } else {
            // Create new project
            const project = await req.prisma.project.create({
                data: {
                    jobId,
                    recruiterId: req.user!.id,
                    freelancerId,
                    currentStage: 1,
                    status: 'active'
                }
            });
            projectId = project.id;

            // Create initial milestones
            const stages = await req.prisma.jobStage.findMany({
                where: { jobId },
                orderBy: { stageNumber: 'asc' }
            });

            if (stages.length > 0) {
                const milestones = stages.map(stage => ({
                    projectId: project.id,
                    stageId: stage.id,
                    stageNumber: stage.stageNumber,
                    status: 'pending',
                    paymentAmount: stage.payment
                }));

                await req.prisma.milestone.createMany({
                    data: milestones
                });
            }

            console.log(`Created new project: ${projectId}`);
        }

        // Check if staking record exists
        const existingStaking = await req.prisma.staking.findFirst({
            where: { projectId }
        });

        if (!existingStaking) {
            // Create staking record
            await req.prisma.staking.create({
                data: {
                    projectId,
                    recruiterId: req.user!.id,
                    walletAddress: verification.recruiterWallet || '',
                    totalStaked: verification.totalStaked || totalStaked || 0,
                    totalReleased: 0,
                    transactionSignature: transactionSignature || 'verified-on-chain'
                }
            });
        }

        // Record transaction if signature provided
        if (transactionSignature && transactionSignature !== 'already-created') {
            await req.prisma.transaction.create({
                data: {
                    fromUserId: req.user!.id,
                    toUserId: freelancerId,
                    projectId,
                    type: 'stake',
                    amount: verification.totalStaked || totalStaked || 0,
                    walletFrom: verification.recruiterWallet || '',
                    walletTo: verification.freelancerWallet || '',
                    walletSignature: transactionSignature,
                    status: 'confirmed'
                }
            });
        }

        // Update job status
        await req.prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'active',
                selectedFreelancerId: freelancerId
            }
        });

        // Update application status
        await req.prisma.application.updateMany({
            where: { jobId, freelancerId },
            data: { status: 'selected' }
        });

        // Create notification for freelancer
        await req.prisma.notification.create({
            data: {
                userId: freelancerId,
                title: "Project Started!",
                message: `Your project has been funded. ${verification.totalStaked} SOL is locked in escrow.`,
                type: 'project',
                relatedId: projectId
            }
        });

        res.json({
            message: 'Escrow verified and recorded successfully',
            verified: true,
            escrowData: {
                pda: escrowPDA,
                totalStaked: verification.totalStaked,
                milestones: verification.milestones,
                recruiter: verification.recruiterWallet,
                freelancer: verification.freelancerWallet
            },
            projectId
        });

    } catch (error) {
        console.error('Escrow verification error:', error);
        res.status(500).json({
            error: 'Failed to verify escrow',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Check escrow status for a job
 */
router.get('/status/:jobId', authenticateToken, async (req, res) => {
    try {
        const { jobId } = req.params;

        // Find project for this job
        const project = await req.prisma.project.findFirst({
            where: {
                jobId,
                OR: [
                    { recruiterId: req.user!.id },
                    { freelancerId: req.user!.id }
                ]
            },
            include: {
                stakings: true,
                milestones: {
                    orderBy: { stageNumber: 'asc' }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const staking = project.stakings[0];

        if (!staking) {
            return res.status(404).json({ error: 'No staking record found' });
        }

        res.json({
            projectId: project.id,
            status: project.status,
            currentStage: project.currentStage,
            totalStaked: staking.totalStaked,
            totalReleased: staking.totalReleased,
            milestones: project.milestones.map(m => ({
                stageNumber: m.stageNumber,
                status: m.status,
                paymentAmount: m.paymentAmount,
                paymentReleased: m.paymentReleased
            }))
        });

    } catch (error) {
        console.error('Get escrow status error:', error);
        res.status(500).json({ error: 'Failed to get escrow status' });
    }
});

export default router;
