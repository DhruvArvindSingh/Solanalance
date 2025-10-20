import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

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
router.put('/milestone/:id/submit', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { submissionDescription, submissionLinks } = req.body;

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

        if (milestone.status !== 'in_progress' && milestone.status !== 'revision_requested') {
            return res.status(400).json({ error: 'Milestone cannot be submitted in current state' });
        }

        // Only allow submission of the current stage milestone
        if (milestone.stageNumber !== milestone.project.currentStage) {
            return res.status(400).json({
                error: `Can only submit milestone for current stage (${milestone.project.currentStage}). This milestone is for stage ${milestone.stageNumber}.`
            });
        }

        const links = submissionLinks
            ? submissionLinks.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
            : [];

        await req.prisma.milestone.update({
            where: { id },
            data: {
                status: 'submitted',
                submissionDescription,
                submissionLinks: links,
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

                // Set next milestone to in_progress
                await req.prisma.milestone.updateMany({
                    where: {
                        projectId: milestone.projectId,
                        stageNumber: milestone.stageNumber + 1
                    },
                    data: {
                        status: 'in_progress'
                    }
                });
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

export default router;
