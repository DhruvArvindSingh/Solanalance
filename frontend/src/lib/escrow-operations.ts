import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
    getProgram,
    deriveEscrowPDA,
    solToLamports,
    lamportsToSol,
    getEscrowAccount,
    getEscrowBalance,
    connection,
    PROGRAM_ID
} from "./solana";

export interface EscrowOperationResult {
    success: boolean;
    txSignature?: string;
    escrowPDA?: string;
    error?: string;
    message?: string;
}

export interface EscrowVerificationResult {
    verified: boolean;
    balance?: number;
    recruiter?: string;
    freelancer?: string;
    milestoneAmounts?: number[];
    milestonesApproved?: boolean[];
    milestonesClaimed?: boolean[];
    error?: string;
    escrowPDA?: string;
    totalStaked?: number;
}

/**
 * Create Job Escrow - Creates PDA and locks FULL job amount
 * 
 * IMPORTANT: This is ONE atomic transaction that:
 * 1. Creates the escrow PDA account
 * 2. Stakes the FULL job amount (100% - no partial payments)
 * 
 * Either both succeed or both fail (atomic operation).
 * 
 * Call this when: Recruiter selects freelancer and clicks "Hire & Fund Job"
 * 
 * @param wallet - Connected wallet adapter instance (must be recruiter)
 * @param jobId - Job ID from database (max 50 characters)
 * @param freelancerWallet - Freelancer's Solana wallet address
 * @param milestones - Array of 3 milestone amounts in SOL [1.5, 2.0, 1.5]
 * @returns Operation result with transaction signature and escrow PDA
 */
export async function fundJob(
    wallet: any,
    jobId: string,
    freelancerWallet: string,
    milestones: [number, number, number]
): Promise<EscrowOperationResult> {
    try {
        // Validation
        if (!wallet.publicKey) {
            return { success: false, error: "Wallet not connected" };
        }

        if (jobId.length > 50) {
            return { success: false, error: "Job ID must be 50 characters or less" };
        }

        if (milestones.length !== 3) {
            return { success: false, error: "Must provide exactly 3 milestones" };
        }

        if (milestones.some(amount => amount <= 0)) {
            return { success: false, error: "All milestone amounts must be greater than 0" };
        }

        // Calculate total amount (FULL job payment required)
        const totalAmount = milestones.reduce((a, b) => a + b, 0);

        const program = getProgram(wallet);
        console.log("3. Recruiter Key = ", wallet.publicKey.toString());
        console.log("3. Job ID = ", jobId);
        const [escrowPDA] = await deriveEscrowPDA(wallet.publicKey, jobId);

        // Check if escrow already exists
        console.log("Checking if escrow already exists...");
        const existingAccount = await connection.getAccountInfo(escrowPDA);
        if (existingAccount) {
            console.log("✓ Escrow already exists (from previous successful transaction)");
            // Verify it has the correct data
            try {
                const escrowData = await (program.account as any).escrow.fetch(escrowPDA);
                const escrowBalance = await connection.getBalance(escrowPDA);
                const stakedSOL = lamportsToSol(escrowBalance);

                return {
                    success: true,
                    txSignature: "already-created",
                    escrowPDA: escrowPDA.toBase58(),
                    message: `Escrow already exists with ${stakedSOL.toFixed(4)} SOL staked`,
                };
            } catch (fetchError) {
                return {
                    success: false,
                    error: `Escrow account exists but cannot be read. It may be corrupted. PDA: ${escrowPDA.toBase58()}`,
                };
            }
        }

        // Check if recruiter has sufficient balance
        const balance = await connection.getBalance(wallet.publicKey);
        const balanceSOL = lamportsToSol(balance);

        if (balanceSOL < totalAmount + 0.01) { // +0.01 for transaction fees
            return {
                success: false,
                error: `Insufficient balance. Required: ${totalAmount.toFixed(4)} SOL, Available: ${balanceSOL.toFixed(4)} SOL`,
            };
        }

        console.log("Creating escrow and staking full amount...");
        console.log(`Total job amount: ${totalAmount} SOL`);
        console.log(`Escrow PDA: ${escrowPDA.toBase58()}`);

        // Convert SOL amounts to lamports
        const milestoneAmounts = milestones.map(sol => solToLamports(sol));

        let tx: string;

        try {
            // Execute transaction: Creates PDA + Stakes full amount (atomic operation)
            tx = await program.methods
                .createJobEscrow(
                    jobId,
                    new PublicKey(freelancerWallet),
                    milestoneAmounts as any
                )
                .accounts({
                    escrow: escrowPDA,
                    recruiter: wallet.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .rpc();

            console.log("Transaction sent:", tx);
        } catch (rpcError: any) {
            // Check if error is because account already exists
            if (rpcError.message?.includes("already in use") ||
                rpcError.message?.includes("already been processed")) {
                console.log("Transaction may have succeeded in a previous attempt, checking...");

                // Wait a bit for blockchain to update
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Check if escrow was actually created
                const checkAccount = await connection.getAccountInfo(escrowPDA);
                if (checkAccount) {
                    console.log("✓ Escrow exists! Previous transaction succeeded.");
                    const escrowBalance = await connection.getBalance(escrowPDA);
                    const stakedSOL = lamportsToSol(escrowBalance);

                    return {
                        success: true,
                        txSignature: "already-created",
                        escrowPDA: escrowPDA.toBase58(),
                        message: `Escrow created successfully with ${stakedSOL.toFixed(4)} SOL`,
                    };
                }
            }

            // Re-throw if it's a different error
            throw rpcError;
        }

        console.log("Transaction successful:", tx);

        // Wait for confirmation
        console.log("Waiting for transaction confirmation...");
        const confirmation = await connection.confirmTransaction(tx, "confirmed");

        if (confirmation.value.err) {
            return {
                success: false,
                error: "Transaction failed on-chain",
            };
        }

        // Verify PDA was created
        console.log("Verifying PDA creation...");
        const escrowAccount = await connection.getAccountInfo(escrowPDA);
        if (!escrowAccount) {
            return {
                success: false,
                error: "Escrow PDA was not created",
            };
        }

        // Verify full amount was staked
        console.log("Verifying full amount staked...");
        const escrowBalance = await connection.getBalance(escrowPDA);
        const stakedSOL = lamportsToSol(escrowBalance);

        // Allow small tolerance for rent
        const tolerance = 0.01;
        if (stakedSOL < (totalAmount - tolerance)) {
            return {
                success: false,
                error: `Insufficient funds staked. Expected: ${totalAmount} SOL, Found: ${stakedSOL.toFixed(4)} SOL`,
            };
        }

        console.log(`✓ PDA created successfully`);
        console.log(`✓ Full amount staked: ${stakedSOL.toFixed(4)} SOL`);

        return {
            success: true,
            txSignature: tx,
            escrowPDA: escrowPDA.toBase58(),
            message: `Job funded successfully! ${totalAmount} SOL locked in escrow.`,
        };
    } catch (error: any) {
        console.error("Error funding job:", error);

        // Parse specific error messages
        if (error.message?.includes("insufficient funds")) {
            return {
                success: false,
                error: "Insufficient funds to complete transaction",
            };
        }

        return {
            success: false,
            error: error.message || "Failed to fund job",
        };
    }
}

/**
 * Approve Milestone - Recruiter approves completed work
 * Call this when: Recruiter reviews work and clicks "Approve Milestone X"
 * 
 * @param wallet - Connected wallet adapter instance (must be recruiter)
 * @param jobId - Job ID from database
 * @param milestoneIndex - Milestone index (0, 1, or 2)
 * @returns Operation result with transaction signature
 */
export async function approveMilestone(
    wallet: any,
    jobId: string,
    milestoneIndex: number
): Promise<EscrowOperationResult> {
    console.log("approveMilestone called with params:", { wallet, jobId, milestoneIndex });
    try {
        if (!wallet.publicKey) {
            return { success: false, error: "Wallet not connected" };
        }

        if (milestoneIndex < 0 || milestoneIndex > 2) {
            return { success: false, error: "Milestone index must be 0, 1, or 2" };
        }

        const program = getProgram(wallet);
        console.log("4. Recruiter Key = ", wallet.publicKey.toString());
        console.log("4. Job ID = ", jobId);
        const [escrowPDA] = await deriveEscrowPDA(wallet.publicKey, jobId);

        const tx = await program.methods
            .approveMilestone(milestoneIndex)
            .accounts({
                escrow: escrowPDA,
                recruiter: wallet.publicKey,
            })
            .rpc();

        return {
            success: true,
            txSignature: tx,
            message: `Milestone ${milestoneIndex + 1} approved! Freelancer can now claim payment.`,
        };
    } catch (error: any) {
        console.error("Error approving milestone:", error);

        // Parse specific errors
        if (error.message?.includes("MilestoneAlreadyApproved")) {
            return { success: false, error: "This milestone has already been approved" };
        }

        return {
            success: false,
            error: error.message || "Failed to approve milestone",
        };
    }
}


/**
 * Claim Milestone - Freelancer claims payment for approved work
 * Call this when: Freelancer sees approved milestone and clicks "Claim Payment"
 * 
 * @param wallet - Connected wallet adapter instance (must be freelancer)
 * @param jobId - Job ID from database
 * @param recruiterWallet - Recruiter's Solana wallet address
 * @param milestoneIndex - Milestone index (0, 1, or 2)
 * @returns Operation result with transaction signature
 */
export async function claimMilestone(
    wallet: any,
    jobId: string,
    recruiterWallet: string,
    milestoneIndex: number
): Promise<EscrowOperationResult> {
    console.log("=== ESCROW CLAIM MILESTONE START ===");
    console.log("Input params:", {
        jobId,
        recruiterWallet,
        milestoneIndex,
        freelancerWallet: wallet.publicKey?.toBase58()
    });

    try {
        if (!wallet.publicKey) {
            console.error("Wallet not connected");
            return { success: false, error: "Wallet not connected" };
        }

        if (milestoneIndex < 0 || milestoneIndex > 2) {
            console.error("Invalid milestone index:", milestoneIndex);
            return { success: false, error: "Milestone index must be 0, 1, or 2" };
        }

        console.log("Getting program...");
        const program = getProgram(wallet);
        console.log("Program ID:", PROGRAM_ID.toBase58());

        console.log("Deriving escrow PDA...");
        const recruiterPubkey = new PublicKey(recruiterWallet);
        console.log("Recruiter pubkey:", recruiterPubkey.toBase58());

        const [escrowPDA] = await deriveEscrowPDA(recruiterPubkey, jobId);
        console.log("Escrow PDA:", escrowPDA.toBase58());

        // Check if escrow account exists
        console.log("Checking if escrow account exists...");
        const escrowAccount = await connection.getAccountInfo(escrowPDA);

        if (!escrowAccount) {
            console.error("Escrow account does not exist!");
            return {
                success: false,
                error: "Escrow account does not exist. Funds have not been staked yet.",
                escrowPDA: escrowPDA.toBase58()
            };
        }

        console.log("Escrow account found:", {
            owner: escrowAccount.owner.toBase58(),
            lamports: escrowAccount.lamports,
            dataLength: escrowAccount.data.length
        });

        // Try to fetch and decode escrow data
        try {
            console.log("Fetching escrow data...");
            const escrowData = await (program.account as any).escrow.fetch(escrowPDA);
            console.log("Escrow data:", {
                recruiter: escrowData.recruiter.toBase58(),
                freelancer: escrowData.freelancer.toBase58(),
                jobId: escrowData.jobId,
                milestoneAmounts: escrowData.milestoneAmounts.map((amt: any) => amt.toString()),
                milestonesApproved: escrowData.milestonesApproved,
                milestonesClaimed: escrowData.milestonesClaimed
            });

            // Verify milestone is approved
            if (!escrowData.milestonesApproved[milestoneIndex]) {
                console.error(`Milestone ${milestoneIndex} is not approved yet`);
                return {
                    success: false,
                    error: `Milestone ${milestoneIndex + 1} has not been approved by the recruiter yet`
                };
            }

            // Verify milestone not already claimed
            if (escrowData.milestonesClaimed[milestoneIndex]) {
                console.error(`Milestone ${milestoneIndex} already claimed`);
                return {
                    success: false,
                    error: `Milestone ${milestoneIndex + 1} has already been claimed`
                };
            }

            console.log(`Milestone ${milestoneIndex} is approved and not yet claimed. Proceeding...`);
        } catch (fetchError: any) {
            console.error("Error fetching escrow data:", fetchError);
            console.error("This might indicate the escrow account structure is invalid");
        }

        console.log("Calling claimMilestone on smart contract...");

        // Get fresh blockhash to avoid stale transaction issues
        const { blockhash } = await connection.getLatestBlockhash('confirmed');

        const tx = await program.methods
            .claimMilestone(milestoneIndex)
            .accounts({
                escrow: escrowPDA,
                freelancer: wallet.publicKey,
            })
            .rpc({
                commitment: 'confirmed',
                preflightCommitment: 'confirmed'
            });

        console.log("Transaction successful:", tx);
        console.log("=== ESCROW CLAIM MILESTONE END (SUCCESS) ===");

        return {
            success: true,
            txSignature: tx,
            message: `Milestone ${milestoneIndex + 1} payment claimed successfully!`,
        };
    } catch (error: any) {
        console.error("=== ESCROW CLAIM MILESTONE ERROR ===");
        console.error("Error type:", error.constructor?.name);
        console.error("Error message:", error.message);
        console.error("Error logs:", error.logs);
        console.error("Full error:", error);
        console.error("=== ESCROW CLAIM MILESTONE END (ERROR) ===");

        // Parse specific errors
        if (error.message?.includes("MilestoneNotApproved")) {
            return { success: false, error: "This milestone has not been approved yet" };
        }
        if (error.message?.includes("MilestoneAlreadyClaimed")) {
            return { success: false, error: "This milestone has already been claimed" };
        }
        if (error.message?.includes("Account does not exist")) {
            return { success: false, error: "Escrow account does not exist. Funds have not been staked yet." };
        }
        if (error.message?.includes("already been processed") || error.message?.includes("Transaction simulation failed")) {
            return { success: false, error: "This milestone payment has already been processed. Please refresh the page to see the updated status." };
        }
        if (error.message?.includes("SendTransactionError")) {
            return { success: false, error: "Transaction failed to send. This might be due to network issues or the transaction already being processed." };
        }

        return {
            success: false,
            error: error.message || "Failed to claim milestone",
        };
    }
}

/**
 * Verify Job Funding - Check if funds are properly locked
 * Call this when: Freelancer wants to verify funds before starting work
 * This is a read-only operation, no wallet signature required
 * 
 * @param recruiterWallet - Recruiter's Solana wallet address
 * @param jobId - Job ID from database
 * @param expectedTotal - Expected total amount in SOL (optional validation)
 * @returns Verification result with escrow details
 */
export async function verifyJobFunding(
    recruiterWallet: string,
    jobId: string,
    expectedTotal?: number
): Promise<EscrowVerificationResult> {
    try {
        // Get escrow account data
        const escrowAccount = await getEscrowAccount(recruiterWallet, jobId);

        if (!escrowAccount) {
            return {
                verified: false,
                error: "Escrow account not found. Job may not be funded yet.",
            };
        }

        // Get actual SOL balance
        const balance = await getEscrowBalance(recruiterWallet, jobId);

        if (balance === null) {
            return {
                verified: false,
                error: "Could not fetch escrow balance",
            };
        }

        // Calculate total from milestones
        const totalMilestones = escrowAccount.milestoneAmounts.reduce((a, b) => a + b, 0);

        // Verify balance is sufficient
        const verified = balance >= totalMilestones &&
            (!expectedTotal || balance >= expectedTotal);

        return {
            verified,
            balance,
            recruiter: escrowAccount.recruiter,
            freelancer: escrowAccount.freelancer,
            milestoneAmounts: escrowAccount.milestoneAmounts,
            milestonesApproved: escrowAccount.milestonesApproved,
            milestonesClaimed: escrowAccount.milestonesClaimed,
        };
    } catch (error: any) {
        console.error("Error verifying job funding:", error);
        return {
            verified: false,
            error: error.message || "Failed to verify job funding",
        };
    }
}

/**
 * Cancel Job - Refund recruiter if no milestones approved
 * Call this when: Recruiter cancels job before any milestone is approved
 * 
 * @param wallet - Connected wallet adapter instance (must be recruiter)
 * @param jobId - Job ID from database
 * @returns Operation result with transaction signature
 */
export async function cancelJob(
    wallet: any,
    jobId: string
): Promise<EscrowOperationResult> {
    try {
        if (!wallet.publicKey) {
            return { success: false, error: "Wallet not connected" };
        }

        const program = getProgram(wallet);

        const [escrowPDA] = await deriveEscrowPDA(wallet.publicKey, jobId);

        const tx = await program.methods
            .cancelJob()
            .accounts({
                escrow: escrowPDA,
                recruiter: wallet.publicKey,
            })
            .rpc();

        return {
            success: true,
            txSignature: tx,
            message: "Job cancelled successfully. Funds have been refunded.",
        };
    } catch (error: any) {
        console.error("Error cancelling job:", error);

        // Parse specific errors
        if (error.message?.includes("CannotCancelAfterApproval")) {
            return {
                success: false,
                error: "Cannot cancel job after a milestone has been approved"
            };
        }

        return {
            success: false,
            error: error.message || "Failed to cancel job",
        };
    }
}

/**
 * Get Milestone Status - Get detailed status of all milestones
 * Read-only operation to display milestone progress
 * 
 * @param recruiterWallet - Recruiter's wallet address
 * @param jobId - Job ID from database
 * @returns Array of milestone statuses
 */
export async function getMilestoneStatus(
    recruiterWallet: string,
    jobId: string
) {
    try {
        const escrowAccount = await getEscrowAccount(recruiterWallet, jobId);

        if (!escrowAccount) {
            return null;
        }

        return escrowAccount.milestoneAmounts.map((amount, index) => ({
            index,
            amount,
            approved: escrowAccount.milestonesApproved[index],
            claimed: escrowAccount.milestonesClaimed[index],
            status: escrowAccount.milestonesClaimed[index]
                ? "claimed"
                : escrowAccount.milestonesApproved[index]
                    ? "approved"
                    : "pending"
        }));
    } catch (error) {
        console.error("Error getting milestone status:", error);
        return null;
    }
}

/**
 * Verify Escrow Funds - Check if escrow exists and has correct funds staked
 * 
 * Use this to verify that funds are properly locked on-chain for a job
 * 
 * @param recruiterWallet - Recruiter's wallet address (who created the escrow)
 * @param jobId - Job ID from database
 * @param expectedFreelancer - Expected freelancer wallet address
 * @param expectedAmount - Expected total amount in SOL
 * @returns Verification result with escrow details
 */
export async function verifyEscrowFunds(
    recruiterWallet: string,
    jobId: string,
    expectedFreelancer?: string,
    expectedAmount?: number
): Promise<EscrowVerificationResult> {
    try {
        if (!recruiterWallet) {
            return { verified: false, error: "Recruiter wallet address is required" };
        }

        const recruiterPubkey = new PublicKey(recruiterWallet);
        const [escrowPDA] = await deriveEscrowPDA(recruiterPubkey, jobId);

        console.log("Verifying escrow funds...");
        console.log(`Escrow PDA: ${escrowPDA.toBase58()}`);

        // Check if escrow account exists
        const escrowAccount = await connection.getAccountInfo(escrowPDA);

        if (!escrowAccount) {
            return {
                verified: false,
                error: "Escrow account does not exist. Funds have not been staked yet.",
                escrowPDA: escrowPDA.toBase58()
            };
        }

        console.log("✓ Escrow account exists");

        // Fetch escrow data using dummy wallet (read-only operation)
        const dummyWallet = {
            publicKey: recruiterPubkey,
            signTransaction: async (tx: any) => tx,
            signAllTransactions: async (txs: any) => txs,
        };
        const program = getProgram(dummyWallet);
        const escrowData = await (program.account as any).escrow.fetch(escrowPDA);

        // Get escrow balance
        const escrowBalance = await connection.getBalance(escrowPDA);
        const stakedSOL = lamportsToSol(escrowBalance);

        console.log(`✓ Escrow balance: ${stakedSOL.toFixed(4)} SOL`);

        // Verify freelancer matches (if provided)
        if (expectedFreelancer) {
            const freelancerMatch = escrowData.freelancer.toBase58() === expectedFreelancer;
            if (!freelancerMatch) {
                return {
                    verified: false,
                    error: `Freelancer mismatch. Expected: ${expectedFreelancer}, Found: ${escrowData.freelancer.toBase58()}`,
                    escrowPDA: escrowPDA.toBase58()
                };
            }
            console.log("✓ Freelancer verified");
        }

        // Verify amount (if provided)
        if (expectedAmount) {
            const tolerance = 0.01; // Allow small difference for rent
            if (stakedSOL < (expectedAmount - tolerance)) {
                return {
                    verified: false,
                    error: `Insufficient funds staked. Expected: ${expectedAmount} SOL, Found: ${stakedSOL.toFixed(4)} SOL`,
                    escrowPDA: escrowPDA.toBase58(),
                    balance: stakedSOL
                };
            }
            console.log("✓ Amount verified");
        }

        // Calculate total milestone amounts
        const milestoneAmounts = escrowData.milestoneAmounts.map((bn: any) => lamportsToSol(bn));
        const totalMilestones = milestoneAmounts.reduce((a: number, b: number) => a + b, 0);

        console.log("✓ All verifications passed");

        return {
            verified: true,
            escrowPDA: escrowPDA.toBase58(),
            recruiter: escrowData.recruiter.toBase58(),
            freelancer: escrowData.freelancer.toBase58(),
            balance: stakedSOL,
            totalStaked: totalMilestones,
            milestoneAmounts,
            milestonesApproved: escrowData.milestonesApproved,
            milestonesClaimed: escrowData.milestonesClaimed
        };

    } catch (error: any) {
        console.error("Error verifying escrow funds:", error);
        return {
            verified: false,
            error: error.message || "Failed to verify escrow funds"
        };
    }
}

