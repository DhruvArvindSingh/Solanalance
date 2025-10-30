import express from 'express';
import { authenticateToken } from '../middleware/auth';
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { uploadProfilePictureToS3, getProfilePictureFromS3 } from '../utils/s3Upload';

const router = express.Router();

// Configure multer for profile picture uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
        }
    }
});

// Upload profile picture
router.post('/picture/upload', authenticateToken, upload.single('profilePicture'), async (req: any, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Upload to S3
        const profilePicUrl = await uploadProfilePictureToS3(userId, req.file);

        // Update profile with new avatar URL
        const updatedProfile = await req.prisma.profile.update({
            where: { id: userId },
            data: { avatarUrl: profilePicUrl }
        });

        res.json({
            message: 'Profile picture uploaded successfully',
            avatar_url: updatedProfile.avatarUrl
        });
    } catch (error: any) {
        console.error('Profile picture upload error:', error);
        res.status(500).json({ error: error.message || 'Failed to upload profile picture' });
    }
});

// Get profile by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({ error: 'Invalid user ID format. Please provide a valid UUID.' });
        }

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

        // Check S3 for profile picture if avatarUrl is not set
        let avatarUrl = profile.avatarUrl;
        if (!avatarUrl) {
            const s3ProfilePic = await getProfilePictureFromS3(id);
            if (s3ProfilePic) {
                avatarUrl = s3ProfilePic;
                // Optionally update the profile with the S3 URL
                await req.prisma.profile.update({
                    where: { id },
                    data: { avatarUrl: s3ProfilePic }
                }).catch(err => console.error('Error updating profile with S3 URL:', err));
            }
        }

        const response = {
            id: profile.id,
            user_id: profile.userId,
            full_name: profile.fullName,
            email: profile.email,
            avatar_url: avatarUrl,
            bio: profile.bio,
            skills: profile.skills,
            hourly_rate: profile.hourlyRate,
            company_name: profile.companyName,
            github_url: profile.githubUrl,
            linkedin_url: profile.linkedinUrl,
            portfolio_email: profile.portfolioEmail,
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
        const { fullName, bio, companyName, hourlyRate, skills, avatarUrl, walletAddress, githubUrl, linkedinUrl, portfolioEmail } = req.body;

        // Validate social media URLs if provided
        if (githubUrl && githubUrl.trim()) {
            const githubPattern = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/;
            if (!githubPattern.test(githubUrl.trim())) {
                return res.status(400).json({ error: 'Invalid GitHub URL format. Please use: https://github.com/username' });
            }
        }

        if (linkedinUrl && linkedinUrl.trim()) {
            const linkedinPattern = /^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9_-]+\/?$/;
            if (!linkedinPattern.test(linkedinUrl.trim())) {
                return res.status(400).json({ error: 'Invalid LinkedIn URL format. Please use: https://linkedin.com/in/username' });
            }
        }

        if (portfolioEmail && portfolioEmail.trim()) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(portfolioEmail.trim())) {
                return res.status(400).json({ error: 'Invalid email format' });
            }
        }

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
                avatarUrl,
                githubUrl: githubUrl?.trim() || null,
                linkedinUrl: linkedinUrl?.trim() || null,
                portfolioEmail: portfolioEmail?.trim() || null
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
                github_url: updatedProfile.githubUrl,
                linkedin_url: updatedProfile.linkedinUrl,
                portfolio_email: updatedProfile.portfolioEmail,
                wallet_address: userWallet?.walletAddress || null
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

export default router;
