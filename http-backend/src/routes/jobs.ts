import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { getEscrowDetails } from '../utils/solana-verification';

const router = express.Router();

// Get all jobs with filters
router.get('/', async (req, res) => {
    try {
        const { status, category, skills, search, limit = 20, offset = 0 } = req.query;

        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (category) {
            where.category = category;
        }

        if (skills && typeof skills === 'string') {
            where.skills = {
                hasEvery: skills.split(',')
            };
        }

        if (search && typeof search === 'string') {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        const jobs = await req.prisma.job.findMany({
            where,
            include: {
                recruiter: {
                    select: {
                        fullName: true,
                        companyName: true,
                        avatarUrl: true
                    }
                },
                jobStages: {
                    orderBy: {
                        stageNumber: 'asc'
                    }
                },
                _count: {
                    select: {
                        applications: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: parseInt(limit as string),
            skip: parseInt(offset as string)
        });

        const transformedJobs = jobs.map(job => ({
            id: job.id,
            title: job.title,
            description: job.description,
            skills: job.skills,
            experience_level: job.experienceLevel,
            project_duration: job.projectDuration,
            category: job.category,
            total_payment: parseFloat(job.totalPayment.toString()),
            status: job.status,
            views_count: job.viewsCount,
            created_at: job.createdAt,
            recruiter: {
                full_name: job.recruiter.fullName,
                company_name: job.recruiter.companyName,
                avatar_url: job.recruiter.avatarUrl
            },
            stages: job.jobStages.map(stage => ({
                id: stage.id,
                name: stage.name,
                description: stage.description,
                stage_number: stage.stageNumber,
                payment: parseFloat(stage.payment.toString())
            })),
            applicants_count: job._count.applications
        }));

        res.json(transformedJobs);
    } catch (error) {
        console.error('Get jobs error:', error);
        res.status(500).json({ error: 'Failed to get jobs' });
    }
});

// Get job by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // First, fetch basic job info to check status
        const basicJob = await req.prisma.job.findUnique({
            where: { id },
            select: { status: true }
        });

        if (!basicJob) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const isActive = basicJob.status === 'active';

        // Now fetch full job data with conditional includes
        const job = await req.prisma.job.findUnique({
            where: { id },
            include: {
                recruiter: {
                    select: {
                        fullName: true,
                        companyName: true,
                        avatarUrl: true
                    }
                },
                jobStages: {
                    orderBy: {
                        stageNumber: 'asc'
                    }
                },
                selectedFreelancer: isActive ? {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        avatarUrl: true,
                        bio: true,
                        skills: true,
                        hourlyRate: true
                    }
                } : false,
                projects: isActive ? {
                    include: {
                        milestones: {
                            orderBy: {
                                stageNumber: 'asc'
                            },
                            include: {
                                stage: {
                                    select: {
                                        name: true,
                                        description: true
                                    }
                                }
                            }
                        }
                    }
                } : false,
                _count: {
                    select: {
                        applications: true
                    }
                }
            }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Increment view count
        await req.prisma.job.update({
            where: { id },
            data: {
                viewsCount: {
                    increment: 1
                }
            }
        });

        const response: any = {
            id: job.id,
            title: job.title,
            description: job.description,
            skills: job.skills,
            experience_level: job.experienceLevel,
            project_duration: job.projectDuration,
            category: job.category,
            total_payment: parseFloat(job.totalPayment.toString()),
            status: job.status,
            views_count: job.viewsCount + 1,
            created_at: job.createdAt,
            recruiter_id: job.recruiterId,
            recruiter_wallet: job.recruiterWallet,
            freelancer_wallet: job.freelancerWallet,
            recruiter: {
                full_name: job.recruiter.fullName,
                company_name: job.recruiter.companyName,
                avatar_url: job.recruiter.avatarUrl
            },
            stages: job.jobStages.map((stage: any) => ({
                id: stage.id,
                name: stage.name,
                description: stage.description,
                stage_number: stage.stageNumber,
                payment: parseFloat(stage.payment.toString())
            })),
            applicants_count: job._count.applications
        };

        // Add selected freelancer and milestone data if job is active
        if (job.status === 'active' && job.selectedFreelancer) {
            response.selected_freelancer = {
                id: job.selectedFreelancer.id,
                full_name: job.selectedFreelancer.fullName,
                email: job.selectedFreelancer.email,
                avatar_url: job.selectedFreelancer.avatarUrl,
                bio: job.selectedFreelancer.bio,
                skills: job.selectedFreelancer.skills,
                hourly_rate: job.selectedFreelancer.hourlyRate ? parseFloat(job.selectedFreelancer.hourlyRate.toString()) : null
            };

            // Add milestone submissions if project exists
            if (job.projects && job.projects.length > 0) {
                const project: any = job.projects[0];
                response.milestones = project.milestones.map((milestone: any) => ({
                    id: milestone.id,
                    stage_number: milestone.stageNumber,
                    stage_name: milestone.stage.name,
                    stage_description: milestone.stage.description,
                    status: milestone.status,
                    payment_amount: parseFloat(milestone.paymentAmount.toString()),
                    payment_released: milestone.paymentReleased,
                    submission_description: milestone.submissionDescription,
                    submission_files: milestone.submissionFiles,
                    submission_links: milestone.submissionLinks,
                    submitted_at: milestone.submittedAt,
                    reviewed_at: milestone.reviewedAt,
                    reviewer_comments: milestone.reviewerComments,
                    created_at: milestone.createdAt
                }));
            }
        }

        // Add escrow details for active jobs
        if (job.status === 'active' && job.recruiterWallet) {
            try {
                const escrowDetails = await getEscrowDetails(job.recruiterWallet, job.id);

                if (escrowDetails.success) {
                    response.escrow = {
                        pda_address: escrowDetails.escrowPDA,
                        current_funds: escrowDetails.currentFunds || 0,
                        milestones: escrowDetails.milestones || [],
                        verified_recruiter_wallet: escrowDetails.recruiterWallet,
                        verified_freelancer_wallet: escrowDetails.freelancerWallet,
                        error: escrowDetails.error || null
                    };
                } else {
                    response.escrow = {
                        error: escrowDetails.error || 'Failed to get escrow details'
                    };
                }
            } catch (escrowError) {
                console.error('Error getting escrow details:', escrowError);
                response.escrow = {
                    error: 'Failed to fetch escrow information'
                };
            }
        }

        res.json(response);
    } catch (error) {
        console.error('Get job error:', error);
        res.status(500).json({ error: 'Failed to get job' });
    }
});

// Create job (recruiters only)
router.post('/', authenticateToken, requireRole('recruiter'), async (req, res) => {
    try {
        const {
            title,
            description,
            skills,
            experienceLevel,
            projectDuration,
            category,
            totalPayment,
            status,
            stages
        } = req.body;

        // Create job
        const job = await req.prisma.job.create({
            data: {
                recruiterId: req.user!.id,
                title,
                description,
                skills: skills || [],
                experienceLevel: experienceLevel || 'intermediate',
                projectDuration: projectDuration || 'medium_term',
                category,
                totalPayment: parseFloat(totalPayment),
                status: status || 'open'
            }
        });

        // Create job stages
        if (stages && Array.isArray(stages)) {
            await Promise.all(
                stages.map((stage: any, index: number) =>
                    req.prisma.jobStage.create({
                        data: {
                            jobId: job.id,
                            name: stage.name,
                            description: stage.description,
                            stageNumber: index + 1,
                            payment: parseFloat(stage.payment)
                        }
                    })
                )
            );
        }

        res.status(201).json({
            message: 'Job created successfully',
            jobId: job.id
        });
    } catch (error) {
        console.error('Create job error:', error);
        res.status(500).json({ error: 'Failed to create job' });
    }
});

// Get jobs by recruiter
router.get('/recruiter/jobs', authenticateToken, requireRole('recruiter'), async (req, res) => {
    try {
        const jobs = await req.prisma.job.findMany({
            where: {
                recruiterId: req.user!.id
            },
            include: {
                _count: {
                    select: {
                        applications: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const transformedJobs = jobs.map(job => ({
            id: job.id,
            title: job.title,
            status: job.status,
            total_payment: parseFloat(job.totalPayment.toString()),
            created_at: job.createdAt,
            applicants_count: job._count.applications,
            recruiter_wallet: job.recruiterWallet,
            freelancer_wallet: job.freelancerWallet
        }));

        res.json(transformedJobs);
    } catch (error) {
        console.error('Get recruiter jobs error:', error);
        res.status(500).json({ error: 'Failed to get jobs' });
    }
});

// Get job applicants (recruiters only)
router.get('/:id/applicants', authenticateToken, requireRole('recruiter'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verify job belongs to recruiter
        const job = await req.prisma.job.findFirst({
            where: {
                id,
                recruiterId: req.user!.id
            }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const applications = await req.prisma.application.findMany({
            where: {
                jobId: id
            },
            include: {
                freelancer: {
                    select: {
                        fullName: true,
                        avatarUrl: true,
                        bio: true,
                        skills: true,
                        hourlyRate: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Get trust points for each freelancer
        const applicationsWithTrustPoints = await Promise.all(
            applications.map(async (app) => {
                const trustPoints = await req.prisma.trustPoint.findFirst({
                    where: { userId: app.freelancerId }
                });

                return {
                    id: app.id,
                    freelancer_id: app.freelancerId,
                    cover_letter: app.coverLetter,
                    cover_letter_file_url: app.coverLetterFileUrl,
                    resume_file_url: app.resumeFileUrl,
                    estimated_completion_days: app.estimatedCompletionDays,
                    portfolio_urls: app.portfolioUrls,
                    wallet_address: app.walletAddress,
                    status: app.status,
                    created_at: app.createdAt,
                    freelancer: {
                        full_name: app.freelancer.fullName,
                        avatar_url: app.freelancer.avatarUrl,
                        bio: app.freelancer.bio,
                        skills: app.freelancer.skills,
                        hourly_rate: app.freelancer.hourlyRate
                    },
                    trust_points: trustPoints ? {
                        total_points: trustPoints.totalPoints,
                        completed_projects: trustPoints.completedProjects,
                        tier: trustPoints.tier,
                        average_rating: trustPoints.averageRating
                    } : null
                };
            })
        );

        res.json({
            job: {
                id: job.id,
                title: job.title,
                total_payment: parseFloat(job.totalPayment.toString())
            },
            applications: applicationsWithTrustPoints
        });
    } catch (error) {
        console.error('Get job applicants error:', error);
        res.status(500).json({ error: 'Failed to get job applicants' });
    }
});

// Update job (for status updates)
router.put('/:id', authenticateToken, requireRole('recruiter'), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Verify job belongs to recruiter
        const job = await req.prisma.job.findFirst({
            where: {
                id,
                recruiterId: req.user!.id
            }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const updatedJob = await req.prisma.job.update({
            where: { id },
            data: updateData
        });

        res.json({
            id: updatedJob.id,
            title: updatedJob.title,
            description: updatedJob.description,
            status: updatedJob.status,
            selectedFreelancerId: updatedJob.selectedFreelancerId,
            updated_at: updatedJob.updatedAt
        });
    } catch (error) {
        console.error('Update job error:', error);
        res.status(500).json({ error: 'Failed to update job' });
    }
});

// Sync job data with blockchain
router.post('/:id/sync-blockchain', authenticateToken, async (req, res) => {
    try {
        const { id: jobId } = req.params;
        const userId = req.user!.id;

        console.log(`=== BLOCKCHAIN SYNC START for Job ${jobId} ===`);

        // Find the job and verify user has access
        const job = await req.prisma.job.findFirst({
            where: {
                id: jobId,
                OR: [
                    { recruiterId: userId },
                    {
                        projects: {
                            some: {
                                freelancerId: userId
                            }
                        }
                    }
                ]
            },
            include: {
                projects: {
                    include: {
                        stakings: true,
                        milestones: {
                            orderBy: { stageNumber: 'asc' }
                        }
                    }
                }
            }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found or access denied' });
        }

        if (job.status !== 'active') {
            return res.status(400).json({ error: 'Can only sync active jobs' });
        }

        if (!job.recruiterWallet) {
            return res.status(400).json({ error: 'Job does not have a recruiter wallet address' });
        }

        console.log(`Job found: ${job.title}, Recruiter wallet: ${job.recruiterWallet}`);

        // Get blockchain data
        const escrowDetails = await getEscrowDetails(job.recruiterWallet, jobId);

        if (!escrowDetails.success) {
            console.log(`No escrow found on blockchain: ${escrowDetails.error}`);
            return res.json({
                status: 'synced',
                message: 'No escrow exists on blockchain yet',
                blockchainData: null,
                databaseData: job.projects[0]?.stakings[0] || null
            });
        }

        console.log('Blockchain escrow data:', escrowDetails);

        const project = job.projects[0];
        if (!project) {
            return res.status(400).json({ error: 'No project found for this job' });
        }

        const currentStaking = project.stakings[0];
        const milestones = project.milestones;

        // Compare blockchain data with database
        let needsUpdate = false;
        const updates: any = {};

        // Check total staked amount
        const blockchainTotalStaked = escrowDetails.milestones?.reduce((sum: number, m: any) => sum + m.amount, 0) || 0;
        const dbTotalStaked = currentStaking?.totalStaked ? parseFloat(currentStaking.totalStaked.toString()) : 0;

        if (Math.abs(blockchainTotalStaked - dbTotalStaked) > 0.001) {
            console.log(`Total staked mismatch: DB=${dbTotalStaked}, Blockchain=${blockchainTotalStaked}`);
            needsUpdate = true;
            updates.totalStaked = blockchainTotalStaked;
        }

        // Check milestone statuses
        const milestoneUpdates: any[] = [];
        if (escrowDetails.milestones) {
            escrowDetails.milestones.forEach((blockchainMilestone: any, index: number) => {
                const dbMilestone = milestones[index];
                if (dbMilestone) {
                    const milestoneUpdate: any = {};
                    let milestoneNeedsUpdate = false;

                    // Check payment amount
                    const dbPaymentAmount = parseFloat(dbMilestone.paymentAmount.toString());
                    if (Math.abs(blockchainMilestone.amount - dbPaymentAmount) > 0.001) {
                        console.log(`Milestone ${index + 1} amount mismatch: DB=${dbMilestone.paymentAmount}, Blockchain=${blockchainMilestone.amount}`);
                        milestoneUpdate.paymentAmount = blockchainMilestone.amount;
                        milestoneNeedsUpdate = true;
                    }

                    // Check if milestone is claimed on blockchain but not in DB
                    if (blockchainMilestone.claimed && !dbMilestone.paymentReleased) {
                        console.log(`Milestone ${index + 1} claimed on blockchain but not in DB`);
                        milestoneUpdate.paymentReleased = true;
                        milestoneUpdate.status = 'completed';
                        milestoneNeedsUpdate = true;
                        needsUpdate = true;
                    }

                    // Check if milestone is approved on blockchain but not in DB
                    if (blockchainMilestone.approved && dbMilestone.status !== 'approved' && !dbMilestone.paymentReleased) {
                        console.log(`Milestone ${index + 1} approved on blockchain but not in DB`);
                        milestoneUpdate.status = 'approved';
                        milestoneNeedsUpdate = true;
                        needsUpdate = true;
                    }

                    if (milestoneNeedsUpdate) {
                        milestoneUpdates.push({
                            id: dbMilestone.id,
                            updates: milestoneUpdate
                        });
                    }
                }
            });
        }

        // Calculate total released from blockchain
        const blockchainTotalReleased = escrowDetails.milestones?.reduce((sum: number, m: any) =>
            m.claimed ? sum + m.amount : sum, 0) || 0;
        const dbTotalReleased = currentStaking?.totalReleased ? parseFloat(currentStaking.totalReleased.toString()) : 0;

        if (Math.abs(blockchainTotalReleased - dbTotalReleased) > 0.001) {
            console.log(`Total released mismatch: DB=${dbTotalReleased}, Blockchain=${blockchainTotalReleased}`);
            needsUpdate = true;
            updates.totalReleased = blockchainTotalReleased;
        }

        if (!needsUpdate && milestoneUpdates.length === 0) {
            console.log('Database is already in sync with blockchain');
            return res.json({
                status: 'synced',
                message: 'Database is already synchronized with blockchain',
                blockchainData: escrowDetails,
                databaseData: { staking: currentStaking, milestones }
            });
        }

        console.log('Updating database with blockchain data...');
        console.log('Staking updates:', updates);
        console.log('Milestone updates:', milestoneUpdates);

        // Perform updates in a transaction
        await req.prisma.$transaction(async (tx) => {
            // Update staking if needed
            if (Object.keys(updates).length > 0) {
                await tx.staking.update({
                    where: { id: currentStaking.id },
                    data: updates
                });
            }

            // Update milestones if needed
            for (const milestoneUpdate of milestoneUpdates) {
                await tx.milestone.update({
                    where: { id: milestoneUpdate.id },
                    data: milestoneUpdate.updates
                });
            }
        });

        console.log('Database updated successfully');
        console.log(`=== BLOCKCHAIN SYNC END (UPDATED) ===`);

        res.json({
            status: 'outdated',
            message: 'Database was outdated and has been updated with blockchain data',
            updatesApplied: {
                staking: updates,
                milestones: milestoneUpdates
            },
            blockchainData: escrowDetails
        });

    } catch (error) {
        console.error('Blockchain sync error:', error);
        res.status(500).json({ error: 'Failed to sync with blockchain' });
    }
});

export default router;
