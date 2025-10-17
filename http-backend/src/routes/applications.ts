import express, { Request, Response, NextFunction } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import multer, { FileFilterCallback } from 'multer';
import { uploadFileToS3 } from '../utils/s3Upload';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Create application with file uploads
router.post('/',
    authenticateToken,
    requireRole('freelancer'),
    upload.fields([
        { name: 'resume', maxCount: 1 },
        { name: 'coverLetter', maxCount: 1 }
    ]),
    async (req: any, res: Response) => {
        try {
            const {
                jobId,
                coverLetterText,
                estimatedCompletionDays,
                portfolioUrls
            } = req.body;

            const freelancerId = req.user?.id;
            const files = (req.files as Record<string, Express.Multer.File[]>) || {};
            const resumeFile = files['resume']?.[0];
            const coverLetterFile = files['coverLetter']?.[0];

            // Check if job exists and is open
            const job = await req.prisma.job.findUnique({
                where: { id: jobId }
            });

            if (!job) {
                return res.status(404).json({ error: 'Job not found' });
            }

            if (job.status !== 'open') {
                return res.status(400).json({ error: 'Job is not accepting applications' });
            }

            // Check if user already applied
            const existingApplication = await req.prisma.application.findFirst({
                where: {
                    jobId,
                    freelancerId
                }
            });

            if (existingApplication) {
                return res.status(400).json({ error: 'You have already applied for this job' });
            }

            let resumeFileUrl = null;
            let coverLetterFileUrl = null;

            // Upload resume if provided
            if (resumeFile) {
                try {
                    resumeFileUrl = await uploadFileToS3({
                        userId: freelancerId,
                        jobId,
                        fileType: 'resume',
                        file: resumeFile
                    });
                } catch (error) {
                    return res.status(400).json({ error: `Failed to upload resume: ${(error as Error).message}` });
                }
            }

            // Upload cover letter if provided
            if (coverLetterFile) {
                try {
                    coverLetterFileUrl = await uploadFileToS3({
                        userId: freelancerId,
                        jobId,
                        fileType: 'cover_letter',
                        file: coverLetterFile
                    });
                } catch (error) {
                    return res.status(400).json({ error: `Failed to upload cover letter: ${(error as Error).message}` });
                }
            }

            // Create application
            const application = await req.prisma.application.create({
                data: {
                    jobId,
                    freelancerId,
                    coverLetter: coverLetterText || null,
                    coverLetterFileUrl,
                    resumeFileUrl,
                    estimatedCompletionDays: parseInt(estimatedCompletionDays),
                    portfolioUrls: portfolioUrls ? JSON.parse(portfolioUrls) : []
                },
                include: {
                    job: true,
                    freelancer: true
                }
            });

            // Create notification for recruiter
            await req.prisma.notification.create({
                data: {
                    userId: job.recruiterId,
                    title: 'New Job Application',
                    message: `Someone applied to your job "${job.title}"`,
                    type: 'application',
                    relatedId: application.id
                }
            });

            // Auto-create project and initial conversation when freelancer is selected
            if (application.status === 'selected') {
                // Check if project already exists
                const existingProject = await req.prisma.project.findFirst({
                    where: {
                        jobId: application.jobId,
                        freelancerId: application.freelancerId
                    }
                });

                if (!existingProject) {
                    // Create project
                    const project = await req.prisma.project.create({
                        data: {
                            jobId: application.jobId,
                            recruiterId: application.job.recruiterId,
                            freelancerId: application.freelancerId,
                            status: 'active'
                        }
                    });

                    // Create initial system message to start the conversation
                    await req.prisma.message.create({
                        data: {
                            projectId: project.id,
                            senderId: application.job.recruiterId,
                            content: `Welcome to the project: ${application.job.title}. Looking forward to working together! 🚀`,
                            messageType: 'system',
                            isRead: false
                        }
                    });

                    // Create notification for project creation
                    await req.prisma.notification.create({
                        data: {
                            userId: application.freelancerId,
                            title: 'Project Started',
                            message: `Your project "${application.job.title}" has been created. You can now communicate with the recruiter.`,
                            type: 'project_started',
                            relatedId: project.id
                        }
                    });
                }
            }

            res.status(201).json({
                message: 'Application submitted successfully',
                application: {
                    id: application.id,
                    jobId: application.jobId,
                    status: application.status,
                    resumeFileUrl: application.resumeFileUrl,
                    coverLetterFileUrl: application.coverLetterFileUrl,
                    createdAt: application.createdAt
                }
            });

        } catch (error) {
            console.error('Error creating application:', error);
            res.status(500).json({ error: 'Failed to submit application' });
        }
    }
);

// Get user's applications
router.get('/my-applications', authenticateToken, requireRole('freelancer'), async (req, res) => {
    try {
        const applications = await req.prisma.application.findMany({
            where: {
                freelancerId: req.user!.id
            },
            include: {
                job: {
                    select: {
                        title: true,
                        totalPayment: true,
                        recruiter: {
                            select: {
                                fullName: true,
                                companyName: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const transformedApplications = applications.map(app => ({
            id: app.id,
            job_id: app.jobId,
            status: app.status,
            created_at: app.createdAt,
            job: {
                title: app.job.title,
                total_payment: parseFloat(app.job.totalPayment.toString()),
                recruiter_name: app.job.recruiter.fullName,
                company_name: app.job.recruiter.companyName
            }
        }));

        res.json(transformedApplications);
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ error: 'Failed to get applications' });
    }
});

// Update application status (recruiters only)
router.put('/:id/status', authenticateToken, requireRole('recruiter'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'shortlisted', 'selected', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const application = await req.prisma.application.findUnique({
            where: { id },
            include: {
                job: true
            }
        });

        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Verify recruiter owns the job
        if (application.job.recruiterId !== req.user!.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await req.prisma.application.update({
            where: { id },
            data: { status }
        });

        // Create notification for freelancer
        let notificationMessage = '';
        switch (status) {
            case 'shortlisted':
                notificationMessage = `You've been shortlisted for "${application.job.title}"`;
                break;
            case 'selected':
                notificationMessage = `Congratulations! You've been selected for "${application.job.title}"`;
                break;
            case 'rejected':
                notificationMessage = `Your application for "${application.job.title}" was not selected`;
                break;
        }

        if (notificationMessage) {
            await req.prisma.notification.create({
                data: {
                    userId: application.freelancerId,
                    title: 'Application Update',
                    message: notificationMessage,
                    type: 'application',
                    relatedId: application.id
                }
            });
        }

        // Auto-create project and initial conversation when freelancer is selected
        if (status === 'selected') {
            // Check if project already exists
            const existingProject = await req.prisma.project.findFirst({
                where: {
                    jobId: application.jobId,
                    freelancerId: application.freelancerId
                }
            });

            if (!existingProject) {
                // Create project
                const project = await req.prisma.project.create({
                    data: {
                        jobId: application.jobId,
                        recruiterId: application.job.recruiterId,
                        freelancerId: application.freelancerId,
                        status: 'active'
                    }
                });

                // Create initial system message to start the conversation
                await req.prisma.message.create({
                    data: {
                        projectId: project.id,
                        senderId: application.job.recruiterId,
                        content: `Welcome to the project: ${application.job.title}. Looking forward to working together! 🚀`,
                        messageType: 'system',
                        isRead: false
                    }
                });

                // Create notification for project creation
                await req.prisma.notification.create({
                    data: {
                        userId: application.freelancerId,
                        title: 'Project Started',
                        message: `Your project "${application.job.title}" has been created. You can now communicate with the recruiter.`,
                        type: 'project_started',
                        relatedId: project.id
                    }
                });
            }
        }

        res.json({ message: 'Application status updated successfully' });
    } catch (error) {
        console.error('Update application status error:', error);
        res.status(500).json({ error: 'Failed to update application status' });
    }
});

// Check if user applied to a job
router.get('/check/:jobId', authenticateToken, async (req, res) => {
    try {
        const { jobId } = req.params;

        const application = await req.prisma.application.findFirst({
            where: {
                jobId,
                freelancerId: req.user!.id
            }
        });

        res.json({
            hasApplied: !!application,
            applicationId: application?.id || null,
            status: application?.status || null
        });
    } catch (error) {
        console.error('Check application error:', error);
        res.status(500).json({ error: 'Failed to check application status' });
    }
});

export default router;
