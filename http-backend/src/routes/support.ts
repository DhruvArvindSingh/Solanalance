import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '../generated/prisma';

const router = Router();
const prisma = new PrismaClient();

// Submit reclaim inquiry when milestones are approved
router.post('/reclaim-inquiry', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const {
            jobId,
            jobTitle,
            recruiterEmail,
            recruiterName,
            totalStaked,
            milestoneStatuses
        } = req.body;

        // Validate required fields
        if (!jobId || !jobTitle || !totalStaked || !milestoneStatuses) {
            return res.status(400).json({
                error: 'Missing required fields: jobId, jobTitle, totalStaked, milestoneStatuses'
            });
        }

        // Verify the user is the recruiter for this job
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                recruiter: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true
                    }
                }
            }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (job.recruiterId !== userId) {
            return res.status(403).json({ error: 'Unauthorized: You are not the recruiter for this job' });
        }

        // Calculate approved and claimed amounts
        const approvedMilestones = milestoneStatuses.filter((m: any) => m.approved);
        const claimedMilestones = milestoneStatuses.filter((m: any) => m.claimed);
        const approvedAmount = approvedMilestones.reduce((sum: number, m: any) => sum + m.amount, 0);
        const claimedAmount = claimedMilestones.reduce((sum: number, m: any) => sum + m.amount, 0);
        const remainingAmount = totalStaked - claimedAmount;

        // Create inquiry record in database (you may want to create a support_inquiries table)
        // For now, we'll just log it and send email notification
        
        console.log('=== RECLAIM INQUIRY SUBMITTED ===');
        console.log('Job ID:', jobId);
        console.log('Job Title:', jobTitle);
        console.log('Recruiter:', recruiterName, `(${recruiterEmail})`);
        console.log('Total Staked:', totalStaked, 'SOL');
        console.log('Approved Milestones:', approvedMilestones.length);
        console.log('Approved Amount:', approvedAmount, 'SOL');
        console.log('Claimed Amount:', claimedAmount, 'SOL');
        console.log('Remaining Amount:', remainingAmount, 'SOL');
        console.log('Milestone Status:', JSON.stringify(milestoneStatuses, null, 2));
        console.log('================================');

        // TODO: Send email to support team
        // This would typically use a service like SendGrid, AWS SES, or Nodemailer
        // Example:
        // await sendEmail({
        //     to: 'support@solanalance.com',
        //     subject: `Fund Reclaim Inquiry - Job: ${jobTitle}`,
        //     body: `
        //         Recruiter: ${recruiterName} (${recruiterEmail})
        //         Job ID: ${jobId}
        //         Job Title: ${jobTitle}
        //         Total Staked: ${totalStaked} SOL
        //         Approved Milestones: ${approvedMilestones.length}
        //         Claimed Amount: ${claimedAmount} SOL
        //         Remaining Amount: ${remainingAmount} SOL
        //         
        //         Milestone Details:
        //         ${milestoneStatuses.map((m: any, i: number) => 
        //             `Milestone ${i + 1}: ${m.amount} SOL - ${m.approved ? 'Approved' : 'Pending'} - ${m.claimed ? 'Claimed' : 'Unclaimed'}`
        //         ).join('\n')}
        //     `
        // });

        // TODO: Send confirmation email to recruiter
        // await sendEmail({
        //     to: recruiterEmail,
        //     subject: 'Fund Reclaim Inquiry Received',
        //     body: `
        //         Dear ${recruiterName},
        //         
        //         We have received your fund reclaim inquiry for job "${jobTitle}".
        //         
        //         Our support team will review your request and contact you within 24-48 hours
        //         to discuss the reclaim process.
        //         
        //         Job Details:
        //         - Total Staked: ${totalStaked} SOL
        //         - Remaining Amount: ${remainingAmount} SOL
        //         - Approved Milestones: ${approvedMilestones.length}
        //         
        //         Thank you for your patience.
        //         
        //         Best regards,
        //         SolanaLance Support Team
        //     `
        // });

        res.json({
            success: true,
            message: 'Reclaim inquiry submitted successfully. Support team will contact you within 24-48 hours.',
            data: {
                jobId,
                totalStaked,
                approvedAmount,
                claimedAmount,
                remainingAmount,
                approvedMilestonesCount: approvedMilestones.length,
                claimedMilestonesCount: claimedMilestones.length
            }
        });
    } catch (error) {
        console.error('Error submitting reclaim inquiry:', error);
        res.status(500).json({
            error: 'Failed to submit reclaim inquiry',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
