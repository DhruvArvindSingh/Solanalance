import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { uploadMilestoneFilesToS3 } from '../utils/s3Upload';
import { getEscrowDetails } from '../utils/solana-verification';

const router = express.Router();

// Configure multer for milestone file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 5, // Maximum 5 files
    },
});

// Get user's projects
router.get('/my-projects', authenticateToken, async (req, res) => {
    try {
        const { role } = req.user!;
        const whereClause = role === 'recruiter'
            ? { recruiterId: req.user!.id }
            : { freelancerId: req.user!.id };

        const projects = await req.prisma.project.findMany({
            where: whereClause,
            include: {
                job: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        totalPayment: true,
                        skills: true,
                        experienceLevel: true,
                        projectDuration: true,
                        status: true,
                        createdAt: true
                    }
                }
            },
            orderBy: {
                startedAt: 'desc'
            }
        });

        const transformedProjects = projects.map(project => ({
            id: project.id,
            status: project.status,
            current_stage: project.currentStage,
            started_at: project.startedAt,
            job: {
                id: project.job.id,
                title: project.job.title,
                description: project.job.description,
                total_payment: parseFloat(project.job.totalPayment.toString()),
                skills_required: project.job.skills || [],
                experience_level: project.job.experienceLevel || '',
                duration: project.job.projectDuration || '',
                status: project.job.status,
                created_at: project.job.createdAt
            }
        }));

        res.json(transformedProjects);
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ error: 'Failed to get projects' });
    }
});

// Get project by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const project = await req.prisma.project.findUnique({
            where: { id },
            include: {
                job: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        totalPayment: true,
                        skills: true,
                        experienceLevel: true,
                        projectDuration: true,
                        status: true,
                        createdAt: true
                    }
                },
                stakings: {
                    select: {
                        totalStaked: true,
                        totalReleased: true
                    }
                },
                milestones: {
                    include: {
                        stage: {
                            select: {
                                name: true,
                                description: true
                            }
                        }
                    },
                    orderBy: {
                        stageNumber: 'asc'
                    }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user has access to this project
        if (project.recruiterId !== req.user!.id && project.freelancerId !== req.user!.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const staking = project.stakings[0] || { totalStaked: 0, totalReleased: 0 };

        const transformedMilestones = project.milestones.map(milestone => ({
            id: milestone.id,
            stage_number: milestone.stageNumber,
            status: milestone.status,
            submission_description: milestone.submissionDescription,
            submission_files: milestone.submissionFiles,
            submission_links: milestone.submissionLinks,
            submitted_at: milestone.submittedAt,
            reviewed_at: milestone.reviewedAt,
            reviewer_comments: milestone.reviewerComments,
            payment_released: milestone.paymentReleased,
            payment_amount: parseFloat(milestone.paymentAmount.toString()),
            stage: {
                name: milestone.stage.name,
                description: milestone.stage.description
            }
        }));

        const response = {
            id: project.id,
            job_id: project.jobId,
            recruiter_id: project.recruiterId,
            freelancer_id: project.freelancerId,
            current_stage: project.currentStage,
            status: project.status,
            started_at: project.startedAt,
            job: {
                id: project.job.id,
                title: project.job.title,
                description: project.job.description,
                total_payment: parseFloat(project.job.totalPayment.toString()),
                skills_required: project.job.skills || [],
                experience_level: project.job.experienceLevel || '',
                duration: project.job.projectDuration || '',
                status: project.job.status,
                created_at: project.job.createdAt
            },
            staking: {
                total_staked: parseFloat(staking.totalStaked.toString()),
                total_released: parseFloat(staking.totalReleased.toString())
            },
            milestones: transformedMilestones
        };

        res.json(response);
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ error: 'Failed to get project' });
    }
});

// Submit milestone (freelancers only)
router.put('/milestone/:id/submit', authenticateToken, upload.array('files', 5), async (req, res) => {
    try {
        const { id } = req.params;
        const { submission_description, submission_links } = req.body;
        const files = req.files as Express.Multer.File[];

        if (!submission_description || !submission_description.trim()) {
            return res.status(400).json({ error: 'Submission description is required' });
        }

        const milestone = await req.prisma.milestone.findUnique({
            where: { id },
            include: {
                project: true
            }
        });

        if (!milestone) {
            return res.status(404).json({ error: 'Milestone not found' });
        }

        if (milestone.project.freelancerId !== req.user!.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (milestone.status !== 'pending' && milestone.status !== 'revision_requested' && milestone.status !== 'submitted') {
            return res.status(400).json({ error: 'Milestone cannot be submitted in current state' });
        }

        // Check if project is active
        if (milestone.project.status !== 'active') {
            return res.status(400).json({ error: 'Project is not active' });
        }

        // Parse submission links
        let links: string[] = [];
        if (submission_links) {
            try {
                // Try parsing as JSON array first
                links = JSON.parse(submission_links);
            } catch {
                // Fallback to splitting by newlines
                links = submission_links.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
            }
        }

        // Upload files to S3 if any
        let fileUrls: string[] = [];
        if (files && files.length > 0) {
            try {
                fileUrls = await uploadMilestoneFilesToS3(
                    id,
                    milestone.projectId,
                    req.user!.id,
                    files
                );
            } catch (error: any) {
                console.error('File upload error:', error);
                return res.status(500).json({ error: error.message || 'Failed to upload files' });
            }
        }

        // Update milestone with submission data
        await req.prisma.milestone.update({
            where: { id },
            data: {
                status: 'submitted',
                submissionDescription: submission_description,
                submissionLinks: links.length > 0 ? links : [],
                submissionFiles: fileUrls.length > 0 ? fileUrls : [],
                submittedAt: new Date()
            }
        });

        // Create notification for recruiter
        await req.prisma.notification.create({
            data: {
                userId: milestone.project.recruiterId,
                title: 'Milestone Submitted',
                message: `A milestone has been submitted for review`,
                type: 'milestone',
                relatedId: id
            }
        });

        res.json({ message: 'Milestone submitted successfully' });
    } catch (error) {
        console.error('Submit milestone error:', error);
        res.status(500).json({ error: 'Failed to submit milestone' });
    }
});

// Review milestone (recruiters only)
router.put('/milestone/:id/review', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, comments } = req.body; // action: 'approve' or 'request_revision'

        const milestone = await req.prisma.milestone.findUnique({
            where: { id },
            include: {
                project: true
            }
        });

        if (!milestone) {
            return res.status(404).json({ error: 'Milestone not found' });
        }

        if (milestone.project.recruiterId !== req.user!.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (milestone.status !== 'submitted') {
            return res.status(400).json({ error: 'Milestone is not ready for review' });
        }

        if (action === 'approve') {
            await req.prisma.milestone.update({
                where: { id },
                data: {
                    status: 'approved',
                    paymentReleased: true,
                    reviewedAt: new Date(),
                    reviewerComments: comments
                }
            });

            // Update staking record
            const staking = await req.prisma.staking.findFirst({
                where: { projectId: milestone.projectId }
            });

            if (staking) {
                await req.prisma.staking.update({
                    where: { id: staking.id },
                    data: {
                        totalReleased: {
                            increment: milestone.paymentAmount
                        }
                    }
                });
            }

            // Create transaction record
            await req.prisma.transaction.create({
                data: {
                    fromUserId: milestone.project.recruiterId,
                    toUserId: milestone.project.freelancerId,
                    projectId: milestone.projectId,
                    milestoneId: milestone.id,
                    type: 'payment',
                    amount: milestone.paymentAmount,
                    walletFrom: 'recruiter-wallet', // In real app, get from user wallet
                    walletTo: 'freelancer-wallet', // In real app, get from user wallet
                    walletSignature: `mock-signature-${Date.now()}`, // In real app, get from blockchain
                    status: 'confirmed'
                }
            });

            // Update project stage if needed
            if (milestone.stageNumber < 3) {
                await req.prisma.project.update({
                    where: { id: milestone.projectId },
                    data: {
                        currentStage: milestone.stageNumber + 1
                    }
                });

                // Next milestone remains pending - freelancer can submit any pending milestone
            } else {
                // Project completed
                await req.prisma.project.update({
                    where: { id: milestone.projectId },
                    data: {
                        status: 'completed',
                        completedAt: new Date()
                    }
                });

                await req.prisma.job.update({
                    where: { id: milestone.project.jobId },
                    data: {
                        status: 'completed'
                    }
                });
            }

            // Create notification for freelancer
            await req.prisma.notification.create({
                data: {
                    userId: milestone.project.freelancerId,
                    title: 'Payment Released',
                    message: `You received ${milestone.paymentAmount} SOL for completing a milestone`,
                    type: 'payment',
                    relatedId: id
                }
            });

            res.json({ message: 'Milestone approved and payment released' });
        } else if (action === 'request_revision') {
            await req.prisma.milestone.update({
                where: { id },
                data: {
                    status: 'revision_requested',
                    reviewedAt: new Date(),
                    reviewerComments: comments
                }
            });

            // Create notification for freelancer
            await req.prisma.notification.create({
                data: {
                    userId: milestone.project.freelancerId,
                    title: 'Revision Requested',
                    message: `The recruiter has requested revisions for a milestone`,
                    type: 'milestone',
                    relatedId: id
                }
            });

            res.json({ message: 'Revision requested' });
        } else {
            res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Review milestone error:', error);
        res.status(500).json({ error: 'Failed to review milestone' });
    }
});

// Claim milestone payment (freelancers only)
router.put('/milestone/:id/claim', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { transaction_signature } = req.body;

        const milestone = await req.prisma.milestone.findUnique({
            where: { id },
            include: {
                project: {
                    include: {
                        job: {
                            select: {
                                recruiterWallet: true,
                                freelancerWallet: true
                            }
                        }
                    }
                }
            }
        });

        if (!milestone) {
            return res.status(404).json({ error: 'Milestone not found' });
        }

        // Check if user is the freelancer for this project
        if (milestone.project.freelancerId !== req.user!.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (milestone.status !== 'approved') {
            return res.status(400).json({ error: 'Milestone must be approved before claiming' });
        }

        if (milestone.paymentReleased) {
            return res.status(400).json({ error: 'Milestone payment has already been claimed' });
        }

        // Update milestone to mark as claimed
        await req.prisma.milestone.update({
            where: { id },
            data: {
                status: 'claimed',
                paymentReleased: true,
                reviewedAt: new Date(),
                reviewerComments: milestone.reviewerComments || 'Payment claimed by freelancer'
            }
        });

        // Record transaction if signature provided
        if (transaction_signature) {
            await req.prisma.transaction.create({
                data: {
                    fromUserId: milestone.project.recruiterId,
                    toUserId: milestone.project.freelancerId,
                    projectId: milestone.projectId,
                    milestoneId: milestone.id,
                    type: 'milestone_payment',
                    amount: milestone.paymentAmount,
                    walletFrom: milestone.project.job.recruiterWallet || 'unknown',
                    walletTo: milestone.project.job.freelancerWallet || 'unknown',
                    walletSignature: transaction_signature,
                    status: 'confirmed'
                }
            });
        }

        res.json({ message: 'Milestone payment claimed successfully' });
    } catch (error) {
        console.error('Claim milestone error:', error);
        res.status(500).json({ error: 'Failed to claim milestone payment' });
    }
});

// Sync milestone status from blockchain to database
router.post('/milestone/:id/sync', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const milestone = await req.prisma.milestone.findUnique({
            where: { id },
            include: {
                project: {
                    include: {
                        job: {
                            select: {
                                id: true,
                                recruiterWallet: true,
                                freelancerWallet: true
                            }
                        }
                    }
                }
            }
        });

        if (!milestone) {
            return res.status(404).json({ error: 'Milestone not found' });
        }

        // Verify user has access to this milestone
        if (req.user!.role === 'recruiter' && milestone.project.recruiterId !== req.user!.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (req.user!.role === 'freelancer' && milestone.project.freelancerId !== req.user!.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!milestone.project.job.recruiterWallet) {
            return res.status(400).json({ error: 'Job does not have recruiter wallet address' });
        }

        // Get escrow details from blockchain
        const escrowDetails = await getEscrowDetails(
            milestone.project.job.recruiterWallet,
            milestone.project.job.id
        );

        if (!escrowDetails.success || !escrowDetails.milestones) {
            return res.status(400).json({ error: 'Failed to get escrow details from blockchain' });
        }

        const milestoneIndex = milestone.stageNumber - 1; // Convert to 0-indexed
        if (milestoneIndex < 0 || milestoneIndex >= escrowDetails.milestones.length) {
            return res.status(400).json({ error: 'Invalid milestone index' });
        }

        const onChainMilestone = escrowDetails.milestones[milestoneIndex];
        let updated = false;
        const updates: any = {};

        // Check if milestone is approved on blockchain but not in database
        if (onChainMilestone.approved && milestone.status !== 'approved') {
            updates.status = 'approved';
            updates.reviewedAt = new Date();
            updates.reviewerComments = updates.reviewerComments || 'Approved on blockchain';
            updated = true;
        }

        // Check if milestone is claimed on blockchain but not marked as paid in database
        if (onChainMilestone.claimed && !milestone.paymentReleased) {
            updates.status = 'claimed';
            updates.paymentReleased = true;
            updates.reviewedAt = new Date();
            updates.reviewerComments = updates.reviewerComments || 'Payment claimed on blockchain';
            updated = true;
        }

        if (updated) {
            await req.prisma.milestone.update({
                where: { id },
                data: updates
            });

            res.json({
                message: 'Milestone status synchronized with blockchain',
                updated: true,
                changes: updates
            });
        } else {
            res.json({
                message: 'Milestone status is already in sync with blockchain',
                updated: false
            });
        }

    } catch (error) {
        console.error('Sync milestone error:', error);
        res.status(500).json({ error: 'Failed to sync milestone status' });
    }
});

export default router;
