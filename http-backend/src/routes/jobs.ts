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
        console.log('Extracted jobId from params:', jobId);
        const userId = req.user!.id;
        console.log('Extracted userId from request:', userId);

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
        console.log('Job query result:', job ? `Found job: ${job.id}` : 'Job not found');

        if (!job) {
            console.log('Job not found or access denied, returning 404');
            return res.status(404).json({ error: 'Job not found or access denied' });
        }

        if (job.status !== 'active' && job.status !== 'completed') {
            console.log('Job status is not active or completed:', job.status);
            return res.status(400).json({ error: 'Can only sync active or completed jobs' });
        }

        if (!job.recruiterWallet) {
            console.log('Job does not have a recruiter wallet address');
            return res.status(400).json({ error: 'Job does not have a recruiter wallet address' });
        }

        console.log(`Job found: ${job.title}, Recruiter wallet: ${job.recruiterWallet}`);

        // Get blockchain data
        const escrowDetails = await getEscrowDetails(job.recruiterWallet, jobId);
        console.log('Escrow details fetched from blockchain:', escrowDetails.success ? 'Success' : 'Failed');

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
        console.log('Project extracted:', project ? `Project ID: ${project.id}` : 'No project found');
        if (!project) {
            console.log('No project found for this job, returning 400');
            return res.status(400).json({ error: 'No project found for this job' });
        }
        // Check if all milestones are approved on blockchain
        const allMilestonesApproved = escrowDetails.milestones?.every((m: any) => m.approved === true) || false;
        console.log('All milestones approved on blockchain:', allMilestonesApproved);

        if (allMilestonesApproved && project.status !== 'completed') {
            console.log('All milestones approved but project status is not completed. Updating project status to completed.');
            await req.prisma.project.update({
                where: { id: project.id },
                data: { status: 'completed' }
            });
            console.log('Project status updated to completed');
        }

        const currentStaking = project.stakings[0];
        console.log('Current staking:', currentStaking ? `Staking ID: ${currentStaking.id}` : 'No staking found');
        const milestones = project.milestones;
        console.log('Milestones count:', milestones.length);

        // Check if milestone payment amounts are 0 and fix them
        const totalMilestonePayments = milestones.reduce((sum, m) => sum + parseFloat(m.paymentAmount.toString()), 0);
        console.log('Total milestone payments:', totalMilestonePayments);
        console.log('Job total payment:', job.totalPayment);

        if (totalMilestonePayments === 0 && parseFloat(job.totalPayment.toString()) > 0) {
            console.log('Milestone payments are 0 but job has payment amount. Fixing milestone payments...');

            // Calculate equal distribution of payments across milestones
            const jobTotalPayment = parseFloat(job.totalPayment.toString());
            const paymentPerMilestone = jobTotalPayment / milestones.length;

            // Update milestone payment amounts
            for (let i = 0; i < milestones.length; i++) {
                const milestone = milestones[i];
                await req.prisma.milestone.update({
                    where: { id: milestone.id },
                    data: { paymentAmount: paymentPerMilestone }
                });
                console.log(`Updated milestone ${i + 1} payment amount to ${paymentPerMilestone}`);
            }

            console.log('Milestone payment amounts fixed');
        }

        // Compare blockchain data with database
        let needsUpdate = false;
        console.log('Initialized needsUpdate:', needsUpdate);
        const updates: any = {};
        console.log('Initialized updates object:', updates);

        // Check total staked amount
        const blockchainTotalStaked = escrowDetails.milestones?.reduce((sum: number, m: any) => sum + m.amount, 0) || 0;
        console.log('Blockchain total staked:', blockchainTotalStaked);
        const dbTotalStaked = currentStaking?.totalStaked ? parseFloat(currentStaking.totalStaked.toString()) : 0;
        console.log('Database total staked:', dbTotalStaked);

        if (Math.abs(blockchainTotalStaked - dbTotalStaked) > 0.001) {
            console.log(`Total staked mismatch: DB=${dbTotalStaked}, Blockchain=${blockchainTotalStaked}`);
            needsUpdate = true;
            console.log('Set needsUpdate to true');
            updates.totalStaked = blockchainTotalStaked;
            console.log('Added totalStaked to updates:', blockchainTotalStaked);
        }

        // Check milestone statuses
        const milestoneUpdates: any[] = [];
        console.log('Initialized milestoneUpdates array');
        if (escrowDetails.milestones) {
            console.log('Processing blockchain milestones, count:', escrowDetails.milestones.length);
            escrowDetails.milestones.forEach((blockchainMilestone: any, index: number) => {
                console.log(`Processing milestone ${index + 1}`);
                const dbMilestone = milestones[index];
                console.log(`DB milestone ${index + 1}:`, dbMilestone ? `ID: ${dbMilestone.id}` : 'Not found');
                if (dbMilestone) {
                    const milestoneUpdate: any = {};
                    console.log(`Initialized milestoneUpdate for milestone ${index + 1}`);
                    let milestoneNeedsUpdate = false;
                    console.log(`Initialized milestoneNeedsUpdate for milestone ${index + 1}:`, milestoneNeedsUpdate);

                    // Check payment amount
                    const dbPaymentAmount = parseFloat(dbMilestone.paymentAmount.toString());
                    console.log(`Milestone ${index + 1} DB payment amount:`, dbPaymentAmount);
                    console.log(`Milestone ${index + 1} blockchain amount:`, blockchainMilestone.amount);
                    if (Math.abs(blockchainMilestone.amount - dbPaymentAmount) > 0.001) {
                        console.log(`Milestone ${index + 1} amount mismatch: DB=${dbMilestone.paymentAmount}, Blockchain=${blockchainMilestone.amount}`);
                        milestoneUpdate.paymentAmount = blockchainMilestone.amount;
                        console.log(`Added paymentAmount to milestoneUpdate for milestone ${index + 1}`);
                        milestoneNeedsUpdate = true;
                        console.log(`Set milestoneNeedsUpdate to true for milestone ${index + 1}`);
                    }

                    // Check if milestone is claimed on blockchain but not in DB
                    console.log(`Milestone ${index + 1} blockchain claimed:`, blockchainMilestone.claimed);
                    console.log(`Milestone ${index + 1} DB paymentReleased:`, dbMilestone.paymentReleased);
                    if (blockchainMilestone.claimed && !dbMilestone.paymentReleased) {
                        console.log(`Milestone ${index + 1} claimed on blockchain but not in DB`);
                        milestoneUpdate.paymentReleased = true;
                        console.log(`Set paymentReleased to true for milestone ${index + 1}`);
                        milestoneUpdate.status = 'completed';
                        console.log(`Set status to completed for milestone ${index + 1}`);
                        milestoneNeedsUpdate = true;
                        console.log(`Set milestoneNeedsUpdate to true for milestone ${index + 1}`);
                        needsUpdate = true;
                        console.log('Set needsUpdate to true');
                    }

                    // Check if milestone is approved on blockchain but not in DB
                    console.log(`Milestone ${index + 1} blockchain approved:`, blockchainMilestone.approved);
                    console.log(`Milestone ${index + 1} DB status:`, dbMilestone.status);
                    if (blockchainMilestone.approved && dbMilestone.status !== 'approved' && !dbMilestone.paymentReleased) {
                        console.log(`Milestone ${index + 1} approved on blockchain but not in DB`);
                        milestoneUpdate.status = 'approved';
                        console.log(`Set status to approved for milestone ${index + 1}`);
                        milestoneNeedsUpdate = true;
                        console.log(`Set milestoneNeedsUpdate to true for milestone ${index + 1}`);
                        needsUpdate = true;
                        console.log('Set needsUpdate to true');
                    }

                    if (milestoneNeedsUpdate) {
                        console.log(`Milestone ${index + 1} needs update, adding to milestoneUpdates`);
                        milestoneUpdates.push({
                            id: dbMilestone.id,
                            updates: milestoneUpdate
                        });
                        console.log(`Added milestone ${index + 1} to milestoneUpdates array`);
                    }
                }
            });
        }

        // Calculate total released from blockchain
        const blockchainTotalReleased = escrowDetails.milestones?.reduce((sum: number, m: any) =>
            m.claimed ? sum + m.amount : sum, 0) || 0;
        console.log('Blockchain total released:', blockchainTotalReleased);
        const dbTotalReleased = currentStaking?.totalReleased ? parseFloat(currentStaking.totalReleased.toString()) : 0;
        console.log('Database total released:', dbTotalReleased);

        if (Math.abs(blockchainTotalReleased - dbTotalReleased) > 0.001) {
            console.log(`Total released mismatch: DB=${dbTotalReleased}, Blockchain=${blockchainTotalReleased}`);
            needsUpdate = true;
            console.log('Set needsUpdate to true');
            updates.totalReleased = blockchainTotalReleased;
            console.log('Added totalReleased to updates:', blockchainTotalReleased);
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
            console.log('Transaction started');
            // Update staking if needed
            if (Object.keys(updates).length > 0) {
                console.log('Updating staking with:', updates);
                await tx.staking.update({
                    where: { id: currentStaking.id },
                    data: updates
                });
                console.log('Staking updated successfully');
            }

            // Update milestones if needed
            for (const milestoneUpdate of milestoneUpdates) {
                console.log('Updating milestone:', milestoneUpdate.id, 'with:', milestoneUpdate.updates);
                await tx.milestone.update({
                    where: { id: milestoneUpdate.id },
                    data: milestoneUpdate.updates
                });
                console.log('Milestone updated successfully:', milestoneUpdate.id);
            }
            console.log('Transaction completed');
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
        console.log('Response sent to client');

    } catch (error) {
        console.error('Blockchain sync error:', error);
        res.status(500).json({ error: 'Failed to sync with blockchain' });
        console.log('Error response sent to client');
    }
});

// Fix milestone payment amounts for jobs with 0 payments
router.post('/:id/fix-milestone-payments', authenticateToken, async (req, res) => {
    try {
        const { id: jobId } = req.params;
        const userId = req.user!.id;

        console.log(`=== FIX MILESTONE PAYMENTS START for Job ${jobId} ===`);

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

        const project = job.projects[0];
        if (!project) {
            return res.status(400).json({ error: 'No project found for this job' });
        }

        const milestones = project.milestones;
        const totalMilestonePayments = milestones.reduce((sum, m) => sum + parseFloat(m.paymentAmount.toString()), 0);
        const jobTotalPayment = parseFloat(job.totalPayment.toString());

        console.log('Current milestone payments total:', totalMilestonePayments);
        console.log('Job total payment:', jobTotalPayment);

        if (totalMilestonePayments === 0 && jobTotalPayment > 0) {
            console.log('Fixing milestone payment amounts...');

            // Calculate equal distribution of payments across milestones
            const paymentPerMilestone = jobTotalPayment / milestones.length;

            // Update milestone payment amounts
            const updatedMilestones = [];
            for (let i = 0; i < milestones.length; i++) {
                const milestone = milestones[i];
                const updatedMilestone = await req.prisma.milestone.update({
                    where: { id: milestone.id },
                    data: { paymentAmount: paymentPerMilestone }
                });
                updatedMilestones.push(updatedMilestone);
                console.log(`Updated milestone ${i + 1} payment amount to ${paymentPerMilestone}`);
            }

            console.log('Milestone payment amounts fixed successfully');
            console.log(`=== FIX MILESTONE PAYMENTS END (SUCCESS) ===`);

            res.json({
                success: true,
                message: 'Milestone payment amounts fixed successfully',
                updatedMilestones: updatedMilestones.map(m => ({
                    id: m.id,
                    stageNumber: m.stageNumber,
                    paymentAmount: m.paymentAmount
                })),
                totalFixed: jobTotalPayment
            });
        } else if (totalMilestonePayments > 0) {
            console.log('Milestone payments already set correctly');
            res.json({
                success: true,
                message: 'Milestone payment amounts are already set correctly',
                currentTotal: totalMilestonePayments
            });
        } else {
            console.log('Job has no payment amount to distribute');
            res.json({
                success: false,
                message: 'Job has no payment amount to distribute to milestones',
                jobTotalPayment
            });
        }

    } catch (error) {
        console.error('Fix milestone payments error:', error);
        res.status(500).json({ error: 'Failed to fix milestone payments' });
    }
});

export default router;
