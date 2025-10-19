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

/**
 * React Hook for Escrow Operations
 * Provides easy-to-use functions for all escrow contract interactions
 * Includes loading states, error handling, and toast notifications
 */
export function useEscrow() {
    const wallet = useWallet();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Fund a job by creating an escrow and locking funds
     */
    const fundJobEscrow = useCallback(
        async (
            jobId: string,
            freelancerWallet: string,
            milestones: [number, number, number],
            onSuccess?: (result: EscrowOperationResult) => void
        ) => {
            setIsLoading(true);
            try {
                const result = await fundJob(wallet, jobId, freelancerWallet, milestones);

                if (result.success) {
                    toast({
                        title: "Job Funded Successfully",
                        description: result.message || "Funds locked in escrow",
                    });
                    onSuccess?.(result);
                } else {
                    toast({
                        title: "Failed to Fund Job",
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
     * Approve a milestone (recruiter only)
     */
    const approveMilestonePayment = useCallback(
        async (
            jobId: string,
            milestoneIndex: number,
            onSuccess?: (result: EscrowOperationResult) => void
        ) => {
            setIsLoading(true);
            try {
                const result = await approveMilestone(wallet, jobId, milestoneIndex);

                if (result.success) {
                    toast({
                        title: "Milestone Approved",
                        description: result.message,
                    });
                    onSuccess?.(result);
                } else {
                    toast({
                        title: "Failed to Approve Milestone",
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
     * Claim milestone payment (freelancer only)
     */
    const claimMilestonePayment = useCallback(
        async (
            jobId: string,
            recruiterWallet: string,
            milestoneIndex: number,
            onSuccess?: (result: EscrowOperationResult) => void
        ) => {
            setIsLoading(true);
            try {
                const result = await claimMilestone(
                    wallet,
                    jobId,
                    recruiterWallet,
                    milestoneIndex
                );

                if (result.success) {
                    toast({
                        title: "Payment Claimed",
                        description: result.message,
                    });
                    onSuccess?.(result);
                } else {
                    toast({
                        title: "Failed to Claim Payment",
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
     * Verify that a job has been funded (read-only, no wallet needed)
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
     * Cancel a job and refund the recruiter (only if no milestones approved)
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

        // Operations
        fundJobEscrow,
        approveMilestonePayment,
        claimMilestonePayment,
        verifyEscrowFunding,
        cancelJobEscrow,
        fetchMilestoneStatus,
    };
}


