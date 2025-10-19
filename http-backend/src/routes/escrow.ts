/**
 * Escrow Verification Routes
 * 
 * API endpoints to verify Solana escrow accounts before updating database
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { PrismaClient } from "../generated/prisma";
import { authenticateToken } from "../middleware/auth";
import {
    verifyEscrowFunding,
    verifyTransactionSignature,
    getMilestoneStatus,
    calculateEscrowAddress,
} from "../utils/solana-verification";

const router = Router();
const prisma = new PrismaClient();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const verifyEscrowSchema = z.object({
    jobId: z.string().uuid(),
    recruiterWallet: z.string().min(32).max(44), // Base58 Solana address
    freelancerWallet: z.string().min(32).max(44),
    txSignature: z.string().min(64).max(128),
    expectedTotal: z.number().positive(),
    milestoneAmounts: z.array(z.number().positive()).length(3),
});

const approveMilestoneSchema = z.object({
    jobId: z.string().uuid(),
    milestoneIndex: z.number().int().min(0).max(2),
    txSignature: z.string().min(64).max(128),
});

const claimMilestoneSchema = z.object({
    jobId: z.string().uuid(),
    milestoneIndex: z.number().int().min(0).max(2),
    txSignature: z.string().min(64).max(128),
});

// ============================================================================
// VERIFY ESCROW FUNDING
// ============================================================================

/**
 * POST /api/escrow/verify-funding
 * 
 * Verify that a job has been properly funded on-chain before marking it active.
 * This is called after the frontend creates the escrow and stakes funds.
 */
router.post("/verify-funding", authenticateToken, async (req: Request, res: Response) => {
    try {
        const {
            jobId,
            recruiterWallet,
            freelancerWallet,
            txSignature,
            expectedTotal,
            milestoneAmounts,
        } = verifyEscrowSchema.parse(req.body);

        const userId = (req as any).userId;

        // Get job from database
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                recruiter: true,
                selectedFreelancer: true,
            },
        });

        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        // Verify user is the recruiter
        if (job.recruiterId !== userId) {
            return res.status(403).json({ error: "Only the recruiter can fund this job" });
        }

        // Verify job is in correct status
        if (job.status !== "open" && job.status !== "draft") {
            return res.status(400).json({ error: "Job is not available for funding" });
        }

        // Verify transaction signature
        const txVerification = await verifyTransactionSignature(txSignature);
        if (!txVerification.verified) {
            return res.status(400).json({
                error: "Transaction verification failed",
                details: txVerification.error,
            });
        }

        // Verify escrow funding on-chain
        const escrowVerification = await verifyEscrowFunding(
            recruiterWallet,
            jobId,
            expectedTotal,
            freelancerWallet
        );

        if (!escrowVerification.verified) {
            return res.status(400).json({
                error: "Escrow verification failed",
                details: escrowVerification.error,
            });
        }

        // Get freelancer from database
        const freelancer = await prisma.profile.findFirst({
            where: {
                userWallets: {
                    some: { walletAddress: freelancerWallet },
                },
            },
        });

        if (!freelancer) {
            return res.status(400).json({
                error: "Freelancer not found with provided wallet address",
            });
        }

        // Update job status and escrow info
        const updatedJob = await prisma.job.update({
            where: { id: jobId },
            data: {
                status: "in_progress",
                selectedFreelancerId: freelancer.id,
            },
        });

        // Create project record
        const project = await prisma.project.create({
            data: {
                jobId: jobId,
                recruiterId: userId,
                freelancerId: freelancer.id,
                status: "active",
            },
        });

        // Get or create job stages
        let jobStages = await prisma.jobStage.findMany({
            where: { jobId },
            orderBy: { stageNumber: "asc" },
        });

        // If no stages exist, create them from milestone amounts
        if (jobStages.length === 0) {
            jobStages = await Promise.all(
                milestoneAmounts.map((amount: number, index: number) =>
                    prisma.jobStage.create({
                        data: {
                            jobId,
                            name: `Milestone ${index + 1}`,
                            description: `Milestone ${index + 1}`,
                            stageNumber: index + 1,
                            payment: amount,
                        },
                    })
                )
            );
        }

        // Create milestone records linked to stages
        const milestones = await Promise.all(
            jobStages.map((stage, index) =>
                prisma.milestone.create({
                    data: {
                        projectId: project.id,
                        stageId: stage.id,
                        stageNumber: index + 1,
                        paymentAmount: milestoneAmounts[index],
                        status: "pending",
                    },
                })
            )
        );

        // Create staking record
        await prisma.staking.create({
            data: {
                projectId: project.id,
                recruiterId: userId,
                walletAddress: recruiterWallet,
                totalStaked: expectedTotal,
                transactionSignature: txSignature,
            },
        });

        // Create transaction record
        await prisma.transaction.create({
            data: {
                fromUserId: userId,
                toUserId: freelancer.id,
                projectId: project.id,
                type: "escrow_funding",
                amount: expectedTotal,
                walletFrom: recruiterWallet,
                walletTo: freelancerWallet,
                walletSignature: txSignature,
                status: "completed",
            },
        });

        // Create notification for freelancer
        await prisma.notification.create({
            data: {
                userId: freelancer.id,
                title: "Job Funded!",
                message: `${job.recruiter.fullName} has funded the job "${job.title}". You can now start working!`,
                type: "job_funded",
                relatedId: jobId,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Escrow verified and job activated",
            data: {
                job: updatedJob,
                project,
                escrowAddress: escrowVerification.escrowAddress,
                balance: escrowVerification.balance,
                milestones,
            },
        });
    } catch (error: any) {
        console.error("Error verifying escrow funding:", error);

        if (error.name === "ZodError") {
            return res.status(400).json({
                error: "Validation error",
                details: error.errors,
            });
        }

        return res.status(500).json({
            error: "Failed to verify escrow funding",
            details: error.message,
        });
    }
});

// ============================================================================
// VERIFY MILESTONE APPROVAL
// ============================================================================

/**
 * POST /api/escrow/verify-approval
 * 
 * Verify that a milestone has been approved on-chain before updating database
 */
router.post("/verify-approval", authenticateToken, async (req: Request, res: Response) => {
    try {
        const { jobId, milestoneIndex, txSignature } = approveMilestoneSchema.parse(req.body);
        const userId = (req as any).userId;

        // Get project and job
        const project = await prisma.project.findFirst({
            where: {
                jobId,
                recruiterId: userId,
            },
            include: {
                job: {
                    include: {
                        recruiter: {
                            include: {
                                userWallets: true,
                            },
                        },
                    },
                },
                milestones: {
                    where: { stageNumber: milestoneIndex + 1 },
                },
            },
        });

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const recruiterWallet = project.job.recruiter.userWallets[0]?.walletAddress;
        if (!recruiterWallet) {
            return res.status(400).json({ error: "Recruiter wallet not found" });
        }

        // Verify transaction
        const txVerification = await verifyTransactionSignature(txSignature);
        if (!txVerification.verified) {
            return res.status(400).json({
                error: "Transaction verification failed",
                details: txVerification.error,
            });
        }

        // Verify milestone status on-chain
        const milestoneStatus = await getMilestoneStatus(recruiterWallet, jobId);
        if (!milestoneStatus.success) {
            return res.status(400).json({
                error: "Failed to get milestone status",
                details: milestoneStatus.error,
            });
        }

        const onChainMilestone = milestoneStatus.milestones?.[milestoneIndex];
        if (!onChainMilestone?.approved) {
            return res.status(400).json({
                error: "Milestone not approved on-chain",
            });
        }

        // Update milestone in database
        const milestone = project.milestones[0];
        if (!milestone) {
            return res.status(404).json({ error: "Milestone not found" });
        }

        const updatedMilestone = await prisma.milestone.update({
            where: { id: milestone.id },
            data: {
                status: "approved",
                reviewedAt: new Date(),
            },
        });

        // Create notification for freelancer
        await prisma.notification.create({
            data: {
                userId: project.freelancerId,
                title: "Milestone Approved!",
                message: `Milestone ${milestoneIndex + 1} has been approved. You can now claim your payment!`,
                type: "milestone_approved",
                relatedId: project.id,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Milestone approval verified",
            data: {
                milestone: updatedMilestone,
            },
        });
    } catch (error: any) {
        console.error("Error verifying milestone approval:", error);
        return res.status(500).json({
            error: "Failed to verify milestone approval",
            details: error.message,
        });
    }
});

// ============================================================================
// VERIFY MILESTONE CLAIM
// ============================================================================

/**
 * POST /api/escrow/verify-claim
 * 
 * Verify that a milestone has been claimed on-chain before updating database
 */
router.post("/verify-claim", authenticateToken, async (req: Request, res: Response) => {
    try {
        const { jobId, milestoneIndex, txSignature } = claimMilestoneSchema.parse(req.body);
        const userId = (req as any).userId;

        // Get project
        const project = await prisma.project.findFirst({
            where: {
                jobId,
                freelancerId: userId,
            },
            include: {
                job: {
                    include: {
                        recruiter: {
                            include: {
                                userWallets: true,
                            },
                        },
                    },
                },
                freelancer: {
                    include: {
                        userWallets: true,
                    },
                },
                milestones: {
                    where: { stageNumber: milestoneIndex + 1 },
                },
            },
        });

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const recruiterWallet = project.job.recruiter.userWallets[0]?.walletAddress;
        if (!recruiterWallet) {
            return res.status(400).json({ error: "Recruiter wallet not found" });
        }

        // Verify transaction
        const txVerification = await verifyTransactionSignature(txSignature);
        if (!txVerification.verified) {
            return res.status(400).json({
                error: "Transaction verification failed",
                details: txVerification.error,
            });
        }

        // Verify milestone status on-chain
        const milestoneStatus = await getMilestoneStatus(recruiterWallet, jobId);
        if (!milestoneStatus.success) {
            return res.status(400).json({
                error: "Failed to get milestone status",
                details: milestoneStatus.error,
            });
        }

        const onChainMilestone = milestoneStatus.milestones?.[milestoneIndex];
        if (!onChainMilestone?.claimed) {
            return res.status(400).json({
                error: "Milestone not claimed on-chain",
            });
        }

        // Update milestone in database
        const milestone = project.milestones[0];
        if (!milestone) {
            return res.status(404).json({ error: "Milestone not found" });
        }

        const updatedMilestone = await prisma.milestone.update({
            where: { id: milestone.id },
            data: {
                paymentReleased: true,
                status: "completed",
            },
        });

        // Create transaction record
        const freelancerWallet = project.freelancer.userWallets[0]?.walletAddress;
        await prisma.transaction.create({
            data: {
                fromUserId: project.recruiterId,
                toUserId: userId,
                projectId: project.id,
                milestoneId: milestone.id,
                type: "milestone_payment",
                amount: milestone.paymentAmount,
                walletFrom: recruiterWallet,
                walletTo: freelancerWallet,
                walletSignature: txSignature,
                status: "completed",
            },
        });

        // Update staking total released
        await prisma.staking.updateMany({
            where: { projectId: project.id },
            data: {
                totalReleased: {
                    increment: milestone.paymentAmount,
                },
            },
        });

        // Create notification for recruiter
        await prisma.notification.create({
            data: {
                userId: project.recruiterId,
                title: "Milestone Payment Claimed",
                message: `Freelancer has claimed payment for milestone ${milestoneIndex + 1}.`,
                type: "milestone_claimed",
                relatedId: project.id,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Milestone claim verified",
            data: {
                milestone: updatedMilestone,
            },
        });
    } catch (error: any) {
        console.error("Error verifying milestone claim:", error);
        return res.status(500).json({
            error: "Failed to verify milestone claim",
            details: error.message,
        });
    }
});

// ============================================================================
// GET ESCROW STATUS
// ============================================================================

/**
 * GET /api/escrow/status/:jobId
 * 
 * Get current escrow status from blockchain (read-only)
 */
router.get("/status/:jobId", authenticateToken, async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;

        // Get job and project
        const project = await prisma.project.findFirst({
            where: { jobId },
            include: {
                job: {
                    include: {
                        recruiter: {
                            include: {
                                userWallets: true,
                            },
                        },
                    },
                },
            },
        });

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const recruiterWallet = project.job.recruiter.userWallets[0]?.walletAddress;
        if (!recruiterWallet) {
            return res.status(400).json({ error: "Recruiter wallet not found" });
        }

        // Get milestone status from blockchain
        const milestoneStatus = await getMilestoneStatus(recruiterWallet, jobId);
        if (!milestoneStatus.success) {
            return res.status(400).json({
                error: "Failed to get escrow status",
                details: milestoneStatus.error,
            });
        }

        // Calculate escrow address
        const escrowAddress = calculateEscrowAddress(recruiterWallet, jobId);

        return res.status(200).json({
            success: true,
            data: {
                escrowAddress,
                milestones: milestoneStatus.milestones,
            },
        });
    } catch (error: any) {
        console.error("Error getting escrow status:", error);
        return res.status(500).json({
            error: "Failed to get escrow status",
            details: error.message,
        });
    }
});

export default router;

