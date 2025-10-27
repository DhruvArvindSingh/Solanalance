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
        console.log('=== ESCROW VERIFICATION START ===');
        const {
            jobId,
            escrowPDA,
            transactionSignature,
            freelancerId,
            totalStaked
        } = req.body;
        console.log('Request body:', { jobId, escrowPDA, transactionSignature, freelancerId, totalStaked });

        // Validate required fields
        if (!jobId || !escrowPDA || !freelancerId) {
            console.log('Validation failed: Missing required fields');
            return res.status(400).json({
                error: 'Missing required fields: jobId, escrowPDA, freelancerId'
            });
        }
        console.log('Validation passed: All required fields present');

        // Check if transaction already exists in database
        console.log('Checking for existing transaction...');
        const existingTransaction = transactionSignature
            ? await req.prisma.transaction.findFirst({
                where: {
                    walletSignature: transactionSignature
                }
            })
            : null;
        console.log('Existing transaction check result:', existingTransaction ? 'Found' : 'Not found');

        if (existingTransaction) {
            console.log(`Transaction ${transactionSignature} already exists in database`);
            return res.json({
                message: 'Transaction already recorded',
                alreadyExists: true,
                transaction: existingTransaction
            });
        }

        // Get wallet addresses from user profiles as fallback
        console.log('Fetching recruiter profile...');
        const recruiterProfile = await req.prisma.profile.findUnique({
            where: { id: req.user!.id },
            include: { userWallets: true }
        });
        console.log('Recruiter profile fetched:', recruiterProfile?.id);

        console.log('Fetching freelancer profile...');
        const freelancerProfile = await req.prisma.profile.findUnique({
            where: { id: freelancerId },
            include: { userWallets: true }
        });
        console.log('Freelancer profile fetched:', freelancerProfile?.id);

        const recruiterWallet = recruiterProfile?.userWallets?.[0]?.walletAddress;
        const freelancerWallet = freelancerProfile?.userWallets?.[0]?.walletAddress;
        console.log('Wallet addresses from profiles:', { recruiterWallet, freelancerWallet });

        // Verify escrow on Solana blockchain
        console.log('Verifying escrow on Solana blockchain...');
        const verification = await verifyEscrowTransaction(
            escrowPDA,
            req.user!.id, // recruiter ID
            freelancerId
        );
        console.log('Blockchain verification result:', verification);

        // Update job with recruiter wallet address if available
        if (verification.recruiterWallet) {
            console.log('Updating job with recruiter wallet...');
            await req.prisma.job.update({
                where: { id: jobId },
                data: {
                    recruiterWallet: verification.recruiterWallet
                }
            });
            console.log(`Updated job ${jobId} with recruiter wallet: ${verification.recruiterWallet}`);
        }


        if (!verification.success) {
            console.log('Verification failed:', verification.error);
            return res.status(400).json({
                error: 'Escrow verification failed',
                details: verification.error
            });
        }
        console.log('Verification successful');

        // Check if project already exists for this job
        console.log('Checking for existing project...');
        const existingProject = await req.prisma.project.findFirst({
            where: {
                jobId,
                recruiterId: req.user!.id,
                freelancerId
            }
        });
        console.log('Existing project check result:', existingProject ? `Found: ${existingProject.id}` : 'Not found');

        let projectId: string;

        if (existingProject) {
            console.log(`Project already exists: ${existingProject.id}`);
            projectId = existingProject.id;
        } else {
            // Create new project
            console.log('Creating new project...');
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
            console.log(`Created new project: ${projectId}`);

            // Create initial milestones
            console.log('Fetching job stages...');
            const stages = await req.prisma.jobStage.findMany({
                where: { jobId },
                orderBy: { stageNumber: 'asc' }
            });
            console.log(`Found ${stages.length} stages`);

            if (stages.length > 0) {
                console.log('Creating milestones...');
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
                console.log(`Created ${milestones.length} milestones`);
            }

            console.log(`Created new project: ${projectId}`);
        }

        // Check if staking record exists
        console.log('Checking for existing staking record...');
        const existingStaking = await req.prisma.staking.findFirst({
            where: { projectId }
        });
        console.log('Existing staking check result:', existingStaking ? 'Found' : 'Not found');

        if (!existingStaking) {
            // Create staking record
            console.log('Creating staking record...');
            await req.prisma.staking.create({
                data: {
                    projectId,
                    recruiterId: req.user!.id,
                    walletAddress: verification.recruiterWallet || recruiterWallet || '',
                    totalStaked: verification.totalStaked || totalStaked || 0,
                    totalReleased: 0,
                    transactionSignature: transactionSignature || 'verified-on-chain'
                }
            });
            console.log('Staking record created');
        }

        // Record transaction if signature provided
        if (transactionSignature && transactionSignature !== 'already-created') {
            console.log('Recording transaction...');
            await req.prisma.transaction.create({
                data: {
                    fromUserId: req.user!.id,
                    toUserId: freelancerId,
                    projectId,
                    type: 'stake',
                    amount: verification.totalStaked || totalStaked || 0,
                    walletFrom: verification.recruiterWallet || recruiterWallet || '',
                    walletTo: verification.freelancerWallet || freelancerWallet || '',
                    walletSignature: transactionSignature,
                    status: 'confirmed'
                }
            });
            console.log('Transaction recorded');
        }

        // Update job status and wallet addresses
        console.log('Updating job status...');
        await req.prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'active',
                selectedFreelancerId: freelancerId,
                recruiterWallet: verification.recruiterWallet || recruiterWallet || null,
                freelancerWallet: verification.freelancerWallet || freelancerWallet || null
            }
        });
        console.log('Job status updated to active');

        // Update application status
        console.log('Updating application status...');
        await req.prisma.application.updateMany({
            where: { jobId, freelancerId },
            data: { status: 'selected' }
        });
        console.log('Application status updated to selected');

        // Create notification for freelancer
        console.log('Creating notification for freelancer...');
        await req.prisma.notification.create({
            data: {
                userId: freelancerId,
                title: "Project Started!",
                message: `Your project has been funded. ${verification.totalStaked} SOL is locked in escrow.`,
                type: 'project',
                relatedId: projectId
            }
        });
        console.log('Notification created');

        console.log('=== ESCROW VERIFICATION SUCCESS ===');
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
        console.error('=== ESCROW VERIFICATION ERROR ===');
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
