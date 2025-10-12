import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get profile by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const profile = await req.prisma.profile.findUnique({
            where: { id },
            include: {
                userRoles: true,
                trustPoints: true
            }
        });

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        // Get public ratings
        const ratings = await req.prisma.rating.findMany({
            where: {
                rateeId: id,
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
            take: 10
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

        const response = {
            id: profile.id,
            full_name: profile.fullName,
            email: profile.email,
            avatar_url: profile.avatarUrl,
            bio: profile.bio,
            skills: profile.skills,
            hourly_rate: profile.hourlyRate,
            company_name: profile.companyName,
            created_at: profile.createdAt,
            role: profile.userRoles[0]?.role || null,
            trust_points: profile.trustPoints[0] || null,
            ratings: transformedRatings
        };

        res.json(response);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update profile
router.put('/update', authenticateToken, async (req, res) => {
    try {
        const { fullName, bio, companyName, hourlyRate, skills, avatarUrl } = req.body;

        const updatedProfile = await req.prisma.profile.update({
            where: { id: req.user!.id },
            data: {
                fullName,
                bio,
                companyName,
                hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
                skills: skills || [],
                avatarUrl
            }
        });

        res.json({
            message: 'Profile updated successfully',
            profile: {
                id: updatedProfile.id,
                full_name: updatedProfile.fullName,
                bio: updatedProfile.bio,
                company_name: updatedProfile.companyName,
                hourly_rate: updatedProfile.hourlyRate,
                skills: updatedProfile.skills,
                avatar_url: updatedProfile.avatarUrl
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

export default router;
