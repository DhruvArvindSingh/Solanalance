import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useToast } from "@/hooks/use-toast";
import {
    fundJob,
    approveMilestone,
    claimMilestone,
    verifyJobFunding,
    cancelJob,
    getMilestoneStatus,
    type EscrowOperationResult,
    type EscrowVerificationResult,
} from "@/lib/escrow-operations";
import {
    verifyAndFundJob,
    verifyAndApproveMilestone,
    verifyAndClaimMilestone,
    getEscrowStatus,
} from "@/lib/api-helpers";

/**
 * Enhanced React Hook for Escrow Operations with Backend Verification
 * 
 * This hook performs blockchain transactions AND verifies them on the backend
 * before updating the database. This ensures data integrity.
 */
export function useEscrowWithVerification() {
    const wallet = useWallet();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Fund a job by creating an escrow and locking FULL job amount
     * 
     * FLOW:
     * 1. Recruiter signs transaction (creates PDA + stakes 100% of job amount)
     * 2. Frontend verifies PDA was created
     * 3. Frontend verifies full amount was staked
     * 4. Send transaction signature + PDA to backend for verification
     * 5. Backend verifies on blockchain
     * 6. Only then: Update database & allocate job to freelancer
     */
    const fundJobEscrow = useCallback(
        async (
            jobId: string,
            freelancerWallet: string,
            milestones: [number, number, number],
            onSuccess?: (result: any) => void
        ) => {
            setIsLoading(true);
            try {
                if (!wallet.publicKey) {
                    toast({
                        title: "Wallet Not Connected",
                        description: "Please connect your Solana wallet",
                        variant: "destructive",
                    });
                    return { success: false, error: "Wallet not connected" };
                }

                const recruiterWallet = wallet.publicKey.toBase58();
                const totalAmount = milestones.reduce((a, b) => a + b, 0);

                // Step 1: Sign transaction to create PDA and stake FULL job amount
                toast({
                    title: "Transaction Required",
                    description: `Please sign transaction to stake ${totalAmount} SOL`,
                });

                const blockchainResult = await fundJob(
                    wallet,
                    jobId,
                    freelancerWallet,
                    milestones
                );

                if (!blockchainResult.success) {
                    toast({
                        title: "Transaction Failed",
                        description: blockchainResult.error,
                        variant: "destructive",
                    });
                    return blockchainResult;
                }

                // Step 2: Frontend has already verified locally that:
                // ✓ PDA was created
                // ✓ Full amount was staked
                console.log("✓ Local verification passed");
                console.log(`✓ Transaction: ${blockchainResult.txSignature}`);
                console.log(`✓ Escrow PDA: ${blockchainResult.escrowPDA}`);

                // Step 3: Send to backend for verification
                toast({
                    title: "Verifying on Backend",
                    description: "Backend is verifying the escrow on-chain...",
                });

                const expectedTotal = milestones.reduce((a, b) => a + b, 0);
                const verificationResult = await verifyAndFundJob({
                    jobId,
                    recruiterWallet,
                    freelancerWallet,
                    txSignature: blockchainResult.txSignature!,
                    expectedTotal,
                    milestoneAmounts: milestones,
                });

                if (!verificationResult.success) {
                    toast({
                        title: "Backend Verification Failed",
                        description: verificationResult.error || "Backend could not verify escrow",
                        variant: "destructive",
                    });
                    return verificationResult;
                }

                // Step 4: Success - Backend has verified and updated database
                toast({
                    title: "Job Funded & Verified!",
                    description: `${totalAmount} SOL locked. Job allocated to freelancer.`,
                });

                console.log("✓ Backend verification passed");
                console.log("✓ Database updated");
                console.log("✓ Job allocated to freelancer");

                onSuccess?.({
                    ...blockchainResult,
                    ...verificationResult.data,
                });

                return {
                    success: true,
                    ...blockchainResult,
                    ...verificationResult.data,
                };
            } catch (error: any) {
                console.error("Error funding job:", error);
                toast({
                    title: "Error",
                    description: error.message || "Failed to fund job",
                    variant: "destructive",
                });
                return { success: false, error: error.message };
            } finally {
                setIsLoading(false);
            }
        },
        [wallet, toast]
    );

    /**
     * Approve a milestone (recruiter only) with backend verification
     */
    const approveMilestonePayment = useCallback(
        async (
            jobId: string,
            milestoneIndex: number,
            onSuccess?: (result: any) => void
        ) => {
            setIsLoading(true);
            try {
                if (!wallet.publicKey) {
                    toast({
                        title: "Wallet Not Connected",
                        description: "Please connect your Solana wallet",
                        variant: "destructive",
                    });
                    return { success: false, error: "Wallet not connected" };
                }

                // Step 1: Approve on blockchain
                toast({
                    title: "Approving Milestone",
                    description: "Please confirm the transaction in your wallet...",
                });

                const blockchainResult = await approveMilestone(
                    wallet,
                    jobId,
                    milestoneIndex
                );

                if (!blockchainResult.success) {
                    toast({
                        title: "Transaction Failed",
                        description: blockchainResult.error,
                        variant: "destructive",
                    });
                    return blockchainResult;
                }

                // Step 2: Verify on backend
                toast({
                    title: "Verifying Approval",
                    description: "Verifying milestone approval on-chain...",
                });

                const verificationResult = await verifyAndApproveMilestone({
                    jobId,
                    milestoneIndex,
                    txSignature: blockchainResult.txSignature!,
                });

                if (!verificationResult.success) {
                    toast({
                        title: "Verification Failed",
                        description: verificationResult.error || "Failed to verify approval",
                        variant: "destructive",
                    });
                    return verificationResult;
                }

                // Step 3: Success
                toast({
                    title: "Milestone Approved!",
                    description: `Milestone ${milestoneIndex + 1} approved. Freelancer can now claim payment.`,
                });

                onSuccess?.({
                    ...blockchainResult,
                    ...verificationResult.data,
                });

                return {
                    success: true,
                    ...blockchainResult,
                    ...verificationResult.data,
                };
            } catch (error: any) {
                console.error("Error approving milestone:", error);
                toast({
                    title: "Error",
                    description: error.message || "Failed to approve milestone",
                    variant: "destructive",
                });
                return { success: false, error: error.message };
            } finally {
                setIsLoading(false);
            }
        },
        [wallet, toast]
    );

    /**
     * Claim milestone payment (freelancer only) with backend verification
     */
    const claimMilestonePayment = useCallback(
        async (
            jobId: string,
            recruiterWallet: string,
            milestoneIndex: number,
            onSuccess?: (result: any) => void
        ) => {
            setIsLoading(true);
            try {
                if (!wallet.publicKey) {
                    toast({
                        title: "Wallet Not Connected",
                        description: "Please connect your Solana wallet",
                        variant: "destructive",
                    });
                    return { success: false, error: "Wallet not connected" };
                }

                // Step 1: Claim on blockchain
                toast({
                    title: "Claiming Payment",
                    description: "Please confirm the transaction in your wallet...",
                });

                const blockchainResult = await claimMilestone(
                    wallet,
                    jobId,
                    recruiterWallet,
                    milestoneIndex
                );

                if (!blockchainResult.success) {
                    toast({
                        title: "Transaction Failed",
                        description: blockchainResult.error,
                        variant: "destructive",
                    });
                    return blockchainResult;
                }

                // Step 2: Verify on backend
                toast({
                    title: "Verifying Claim",
                    description: "Verifying milestone claim on-chain...",
                });

                const verificationResult = await verifyAndClaimMilestone({
                    jobId,
                    milestoneIndex,
                    txSignature: blockchainResult.txSignature!,
                });

                if (!verificationResult.success) {
                    toast({
                        title: "Verification Failed",
                        description: verificationResult.error || "Failed to verify claim",
                        variant: "destructive",
                    });
                    return verificationResult;
                }

                // Step 3: Success
                toast({
                    title: "Payment Claimed!",
                    description: `Milestone ${milestoneIndex + 1} payment claimed successfully!`,
                });

                onSuccess?.({
                    ...blockchainResult,
                    ...verificationResult.data,
                });

                return {
                    success: true,
                    ...blockchainResult,
                    ...verificationResult.data,
                };
            } catch (error: any) {
                console.error("Error claiming milestone:", error);
                toast({
                    title: "Error",
                    description: error.message || "Failed to claim milestone",
                    variant: "destructive",
                });
                return { success: false, error: error.message };
            } finally {
                setIsLoading(false);
            }
        },
        [wallet, toast]
    );

    /**
     * Verify that a job has been funded (read-only)
     */
    const verifyEscrowFunding = useCallback(
        async (
            recruiterWallet: string,
            jobId: string,
            expectedTotal?: number
        ): Promise<EscrowVerificationResult> => {
            setIsLoading(true);
            try {
                const result = await verifyJobFunding(
                    recruiterWallet,
                    jobId,
                    expectedTotal
                );

                if (!result.verified) {
                    toast({
                        title: "Verification Failed",
                        description: result.error || "Could not verify escrow funding",
                        variant: "destructive",
                    });
                }

                return result;
            } finally {
                setIsLoading(false);
            }
        },
        [toast]
    );

    /**
     * Cancel a job and refund the recruiter
     */
    const cancelJobEscrow = useCallback(
        async (
            jobId: string,
            onSuccess?: (result: EscrowOperationResult) => void
        ) => {
            setIsLoading(true);
            try {
                const result = await cancelJob(wallet, jobId);

                if (result.success) {
                    toast({
                        title: "Job Cancelled",
                        description: result.message,
                    });
                    onSuccess?.(result);
                } else {
                    toast({
                        title: "Failed to Cancel Job",
                        description: result.error,
                        variant: "destructive",
                    });
                }

                return result;
            } finally {
                setIsLoading(false);
            }
        },
        [wallet, toast]
    );

    /**
     * Get escrow status from backend (verified on-chain)
     */
    const fetchEscrowStatus = useCallback(
        async (jobId: string) => {
            setIsLoading(true);
            try {
                return await getEscrowStatus(jobId);
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    /**
     * Get the status of all milestones (read-only)
     */
    const fetchMilestoneStatus = useCallback(
        async (recruiterWallet: string, jobId: string) => {
            setIsLoading(true);
            try {
                return await getMilestoneStatus(recruiterWallet, jobId);
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    return {
        // States
        isLoading,
        isWalletConnected: !!wallet.connected,
        walletAddress: wallet.publicKey?.toBase58(),

        // Operations (with backend verification)
        fundJobEscrow,
        approveMilestonePayment,
        claimMilestonePayment,
        verifyEscrowFunding,
        cancelJobEscrow,
        fetchEscrowStatus,
        fetchMilestoneStatus,
    };
}

