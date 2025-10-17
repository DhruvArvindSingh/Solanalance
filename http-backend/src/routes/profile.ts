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
                trustPoints: true,
                userWallets: true
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
            user_id: profile.userId,
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
            wallet_address: profile.userWallets[0]?.walletAddress || null,
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
        const { fullName, bio, companyName, hourlyRate, skills, avatarUrl, walletAddress } = req.body;

        // Handle wallet address update if provided
        if (walletAddress !== undefined) {
            // Validate wallet address format
            if (!/^([1-9A-HJ-NP-Za-km-z]{32,44})$/.test(walletAddress)) {
                return res.status(400).json({ error: 'Invalid Solana wallet address format' });
            }

            // Check if wallet address is already registered to another user
            const existingWallet = await req.prisma.userWallet.findFirst({
                where: {
                    walletAddress,
                    userId: { not: req.user!.id }
                }
            });

            if (existingWallet) {
                return res.status(400).json({ error: 'Wallet address is already registered to another user' });
            }

            // First check if user already has a wallet record
            const currentWallet = await req.prisma.userWallet.findFirst({
                where: { userId: req.user!.id }
            });

            if (currentWallet) {
                // Update existing wallet
                await req.prisma.userWallet.update({
                    where: { id: currentWallet.id },
                    data: { walletAddress, updatedAt: new Date() }
                });
            } else {
                // Create new wallet record
                await req.prisma.userWallet.create({
                    data: {
                        userId: req.user!.id,
                        walletAddress,
                        isVerified: false
                    }
                });
            }
        }

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

        // Get the updated wallet information
        const userWallet = await req.prisma.userWallet.findFirst({
            where: { userId: req.user!.id }
        });

        res.json({
            message: 'Profile updated successfully',
            profile: {
                id: updatedProfile.id,
                user_id: updatedProfile.userId,
                full_name: updatedProfile.fullName,
                bio: updatedProfile.bio,
                company_name: updatedProfile.companyName,
                hourly_rate: updatedProfile.hourlyRate,
                skills: updatedProfile.skills,
                avatar_url: updatedProfile.avatarUrl,
                wallet_address: userWallet?.walletAddress || null
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

export default router;
