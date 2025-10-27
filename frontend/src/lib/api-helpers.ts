/**
 * API Helper Functions
 * 
 * Helper functions to update your backend database after blockchain transactions.
 * These should be called after successful escrow operations to keep your database in sync.
 */

import { apiClient } from "@/lib/api-client";

// ============================================================================
// JOB FUNDING WITH BACKEND VERIFICATION
// ============================================================================

export interface FundJobData {
    jobId: string;
    recruiterWallet: string;
    freelancerWallet: string;
    txSignature: string;
    expectedTotal: number;
    milestoneAmounts: [number, number, number];
}

/**
 * Verify and update database after funding a job
 * This calls the backend to verify the escrow on-chain before updating the database
 */
export async function verifyAndFundJob(data: FundJobData) {
    try {
        const response = await apiClient.request("/escrow/verify-funding", {
            method: "POST",
            body: JSON.stringify(data),
        });

        if (response.error) {
            return {
                success: false,
                error: response.error
            };
        }

        return { success: true, data: response.data };
    } catch (error: any) {
        console.error("Error verifying job funding:", error);
        return {
            success: false,
            error: error.message || "Failed to verify job funding"
        };
    }
}

// ============================================================================
// MILESTONE APPROVAL WITH BACKEND VERIFICATION
// ============================================================================

export interface ApproveMilestoneData {
    jobId: string;
    milestoneIndex: number;
    txSignature: string;
}

/**
 * Verify and update database after approving a milestone
 */
export async function verifyAndApproveMilestone(data: ApproveMilestoneData) {
    try {
        const response = await apiClient.request("/escrow/verify-approval", {
            method: "POST",
            body: JSON.stringify(data),
        });

        if (response.error) {
            return {
                success: false,
                error: response.error
            };
        }

        return { success: true, data: response.data };
    } catch (error: any) {
        console.error("Error verifying milestone approval:", error);
        return {
            success: false,
            error: error.message || "Failed to verify milestone approval"
        };
    }
}

// ============================================================================
// MILESTONE CLAIM WITH BACKEND VERIFICATION
// ============================================================================

export interface ClaimMilestoneData {
    jobId: string;
    milestoneIndex: number;
    txSignature: string;
}

/**
 * Verify and update database after claiming a milestone
 */
export async function verifyAndClaimMilestone(data: ClaimMilestoneData) {
    try {
        const response = await apiClient.request("/escrow/verify-claim", {
            method: "POST",
            body: JSON.stringify(data),
        });

        if (response.error) {
            return {
                success: false,
                error: response.error
            };
        }

        return { success: true, data: response.data };
    } catch (error: any) {
        console.error("Error verifying milestone claim:", error);
        return {
            success: false,
            error: error.message || "Failed to verify milestone claim"
        };
    }
}

// ============================================================================
// GET ESCROW STATUS FROM BACKEND
// ============================================================================

/**
 * Get escrow status from backend (which fetches from blockchain)
 */
export async function getEscrowStatus(jobId: string) {
    try {
        const response = await apiClient.request(`/escrow/status/${jobId}`, {
            method: "GET",
        });

        if (response.error) {
            return {
                success: false,
                error: response.error
            };
        }

        return { success: true, data: response.data };
    } catch (error: any) {
        console.error("Error fetching escrow status:", error);
        return {
            success: false,
            error: error.message || "Failed to fetch escrow status"
        };
    }
}

// ============================================================================
// JOB CANCELLATION (LEGACY - keeping for reference)
// ============================================================================

export interface CancelJobData {
    jobId: string;
    txSignature: string;
}

/**
 * Update database after cancelling a job
 */
export async function updateJobCancelled(data: CancelJobData) {
    try {
        const response = await apiClient.request("/jobs/cancel", {
            method: "POST",
            body: JSON.stringify(data),
        });

        if (response.error) {
            return { success: false, error: response.error };
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating job cancelled:", error);
        return { success: false, error };
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get escrow data from database
 */
export async function getJobEscrowData(jobId: string) {
    try {
        const response = await apiClient.request(`/jobs/${jobId}/escrow`, {
            method: "GET",
        });
        return response.error ? null : response.data;
    } catch (error) {
        console.error("Error fetching escrow data:", error);
        return null;
    }
}

/**
 * Get freelancer wallet address from database
 */
export async function getFreelancerWallet(freelancerId: string): Promise<string | null> {
    try {
        const response = await apiClient.request(`/profiles/${freelancerId}/wallet`, {
            method: "GET",
        });
        return response.error ? null : response.data?.walletAddress;
    } catch (error) {
        console.error("Error fetching freelancer wallet:", error);
        return null;
    }
}

/**
 * Get recruiter wallet address from database
 */
export async function getRecruiterWallet(recruiterId: string): Promise<string | null> {
    try {
        const response = await apiClient.request(`/profiles/${recruiterId}/wallet`, {
            method: "GET",
        });
        return response.error ? null : response.data?.walletAddress;
    } catch (error) {
        console.error("Error fetching recruiter wallet:", error);
        return null;
    }
}
