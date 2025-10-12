import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Create application
router.post('/', authenticateToken, requireRole('freelancer'), async (req, res) => {
    try {
        const {
            jobId,
            coverLetter,
            estimatedCompletionDays,
            portfolioUrls
        } = req.body;

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
                freelancerId: req.user!.id
            }
        });

        if (existingApplication) {
            return res.status(400).json({ error: 'Already applied to this job' });
        }

        const application = await req.prisma.application.create({
            data: {
                jobId,
                freelancerId: req.user!.id,
                coverLetter,
                estimatedCompletionDays: parseInt(estimatedCompletionDays),
                portfolioUrls: portfolioUrls || []
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

        res.status(201).json({
            message: 'Application submitted successfully',
            applicationId: application.id
        });
    } catch (error) {
        console.error('Create application error:', error);
        res.status(500).json({ error: 'Failed to create application' });
    }
});

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
