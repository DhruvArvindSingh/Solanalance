import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';

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

        const response = {
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
        };

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
            applicants_count: job._count.applications
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
                    estimated_completion_days: app.estimatedCompletionDays,
                    portfolio_urls: app.portfolioUrls,
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
                total_payment: job.totalPayment
            },
            applications: applicationsWithTrustPoints
        });
    } catch (error) {
        console.error('Get job applicants error:', error);
        res.status(500).json({ error: 'Failed to get job applicants' });
    }
});

export default router;
