import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Create rating
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            projectId,
            rateeId,
            overallRating,
            qualityRating,
            communicationRating,
            professionalismRating,
            reviewText,
            isPublic
        } = req.body;

        // Verify project exists and user is part of it
        const project = await req.prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.recruiterId !== req.user!.id && project.freelancerId !== req.user!.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Check if user already rated this project
        const existingRating = await req.prisma.rating.findFirst({
            where: {
                projectId,
                raterId: req.user!.id
            }
        });

        if (existingRating) {
            return res.status(400).json({ error: 'Already rated this project' });
        }

        const rating = await req.prisma.rating.create({
            data: {
                projectId,
                raterId: req.user!.id,
                rateeId,
                overallRating: parseInt(overallRating),
                qualityRating: parseInt(qualityRating),
                communicationRating: parseInt(communicationRating),
                professionalismRating: parseInt(professionalismRating),
                reviewText,
                isPublic: isPublic !== false
            }
        });

        // Update user's trust points and average rating
        const userRatings = await req.prisma.rating.findMany({
            where: { rateeId }
        });

        const averageRating = userRatings.reduce((sum, r) => sum + r.overallRating, 0) / userRatings.length;

        // Check if trust points exist
        const existingTrustPoints = await req.prisma.trustPoint.findFirst({
            where: { userId: rateeId }
        });

        if (existingTrustPoints) {
            await req.prisma.trustPoint.update({
                where: { id: existingTrustPoints.id },
                data: {
                    averageRating
                }
            });
        } else {
            await req.prisma.trustPoint.create({
                data: {
                    userId: rateeId,
                    totalPoints: 0,
                    completedProjects: 0,
                    successfulProjects: 0,
                    averageRating,
                    tier: 'iron'
                }
            });
        }

        res.status(201).json({
            message: 'Rating created successfully',
            ratingId: rating.id
        });
    } catch (error) {
        console.error('Create rating error:', error);
        res.status(500).json({ error: 'Failed to create rating' });
    }
});

// Get ratings for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 10, offset = 0 } = req.query;

        const ratings = await req.prisma.rating.findMany({
            where: {
                rateeId: userId,
                isPublic: true
            },
            include: {
                rater: {
                    select: {
                        fullName: true,
                        avatarUrl: true
                    }
                },
                project: {
                    include: {
                        job: {
                            select: {
                                title: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: parseInt(limit as string),
            skip: parseInt(offset as string)
        });

        const transformedRatings = ratings.map(rating => ({
            id: rating.id,
            overall_rating: rating.overallRating,
            communication_rating: rating.communicationRating,
            quality_rating: rating.qualityRating,
            professionalism_rating: rating.professionalismRating,
            review_text: rating.reviewText,
            created_at: rating.createdAt,
            rater: {
                full_name: rating.rater.fullName,
                avatar_url: rating.rater.avatarUrl
            },
            project: {
                job_title: rating.project.job?.title || 'Unknown Project'
            }
        }));

        res.json(transformedRatings);
    } catch (error) {
        console.error('Get ratings error:', error);
        res.status(500).json({ error: 'Failed to get ratings' });
    }
});

// Check if user has rated a project
router.get('/check/:projectId', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;

        const rating = await req.prisma.rating.findFirst({
            where: {
                projectId,
                raterId: req.user!.id
            }
        });

        res.json({
            hasRated: !!rating,
            ratingId: rating?.id || null
        });
    } catch (error) {
        console.error('Check rating error:', error);
        res.status(500).json({ error: 'Failed to check rating status' });
    }
});

export default router;
