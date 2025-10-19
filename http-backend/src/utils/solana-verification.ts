/**
 * Solana Escrow Verification Utilities
 * 
 * Backend utilities to verify that escrow accounts are properly funded
 * and created by the correct wallet before updating the database.
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { createHash } from "crypto";

// Program ID from deployed contract
const PROGRAM_ID = new PublicKey("xXBP5XebxLWY2bG3691JeTbCRmcjjncAm5n7jMvVevm");

// RPC endpoint - should match your network (devnet/mainnet)
const RPC_ENDPOINT = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Create connection
const connection = new Connection(RPC_ENDPOINT, "confirmed");

/**
 * Hash jobId to create a 32-byte seed for PDA
 */
function hashJobId(jobId: string): Buffer {
    return createHash('sha256').update(jobId, 'utf8').digest();
}

/**
 * Derive the escrow PDA address using hashed jobId
 */
export function deriveEscrowPDA(
    recruiterPubkey: PublicKey,
    jobId: string
): [PublicKey, number] {
    const jobIdHash = hashJobId(jobId);
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("escrow"),
            recruiterPubkey.toBuffer(),
            jobIdHash,
        ],
        PROGRAM_ID
    );
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number | BN): number {
    const amount = typeof lamports === "number" ? lamports : lamports.toNumber();
    return amount / LAMPORTS_PER_SOL;
}

/**
 * Verify that an escrow account exists and is properly funded
 * 
 * @param recruiterWallet - Recruiter's Solana wallet address
 * @param jobId - Job ID (max 50 characters)
 * @param expectedTotal - Expected total amount in SOL
 * @param freelancerWallet - Expected freelancer wallet address
 * @returns Verification result with details
 */
export async function verifyEscrowFunding(
    recruiterWallet: string,
    jobId: string,
    expectedTotal: number,
    freelancerWallet?: string
): Promise<{
    verified: boolean;
    escrowAddress?: string;
    balance?: number;
    recruiter?: string;
    freelancer?: string;
    milestoneAmounts?: number[];
    error?: string;
}> {
    try {
        const recruiterPubkey = new PublicKey(recruiterWallet);
        const [escrowPDA] = deriveEscrowPDA(recruiterPubkey, jobId);

        // Check if account exists
        const accountInfo = await connection.getAccountInfo(escrowPDA);
        if (!accountInfo) {
            return {
                verified: false,
                error: "Escrow account does not exist",
            };
        }

        // Verify it's owned by our program
        if (accountInfo.owner.toBase58() !== PROGRAM_ID.toBase58()) {
            return {
                verified: false,
                error: "Escrow account not owned by the correct program",
            };
        }

        // Get escrow balance
        const balance = await connection.getBalance(escrowPDA);
        const balanceSOL = lamportsToSol(balance);

        // Parse escrow account data
        const escrowData = parseEscrowAccount(accountInfo.data);

        if (!escrowData) {
            return {
                verified: false,
                error: "Failed to parse escrow account data",
            };
        }

        // Verify recruiter matches
        if (escrowData.recruiter !== recruiterWallet) {
            return {
                verified: false,
                error: "Escrow recruiter does not match provided wallet",
            };
        }

        // Verify freelancer if provided
        if (freelancerWallet && escrowData.freelancer !== freelancerWallet) {
            return {
                verified: false,
                error: "Escrow freelancer does not match expected wallet",
            };
        }

        // Verify job ID matches
        if (escrowData.jobId !== jobId) {
            return {
                verified: false,
                error: "Escrow job ID does not match",
            };
        }

        // Calculate total from milestones
        const totalMilestones = escrowData.milestoneAmounts.reduce((a, b) => a + b, 0);

        // Verify balance is sufficient
        // Allow small tolerance for rent and fees
        const tolerance = 0.01; // 0.01 SOL tolerance
        const balanceSufficient = balanceSOL >= (totalMilestones - tolerance);

        // Verify expected total matches
        const expectedMatches = Math.abs(totalMilestones - expectedTotal) < tolerance;

        if (!balanceSufficient) {
            return {
                verified: false,
                error: `Insufficient escrow balance. Expected: ${expectedTotal} SOL, Found: ${balanceSOL.toFixed(4)} SOL`,
                balance: balanceSOL,
            };
        }

        if (!expectedMatches) {
            return {
                verified: false,
                error: `Milestone total mismatch. Expected: ${expectedTotal} SOL, Found: ${totalMilestones.toFixed(4)} SOL`,
            };
        }

        // All checks passed
        return {
            verified: true,
            escrowAddress: escrowPDA.toBase58(),
            balance: balanceSOL,
            recruiter: escrowData.recruiter,
            freelancer: escrowData.freelancer,
            milestoneAmounts: escrowData.milestoneAmounts,
        };
    } catch (error: any) {
        console.error("Error verifying escrow:", error);
        return {
            verified: false,
            error: error.message || "Failed to verify escrow",
        };
    }
}

/**
 * Parse escrow account data
 */
function parseEscrowAccount(data: Buffer): {
    recruiter: string;
    freelancer: string;
    jobId: string;
    milestoneAmounts: number[];
    milestonesApproved: boolean[];
    milestonesClaimed: boolean[];
} | null {
    try {
        // Skip 8 byte discriminator
        let offset = 8;

        // Read recruiter pubkey (32 bytes)
        const recruiterBytes = data.slice(offset, offset + 32);
        const recruiter = new PublicKey(recruiterBytes).toBase58();
        offset += 32;

        // Read freelancer pubkey (32 bytes)
        const freelancerBytes = data.slice(offset, offset + 32);
        const freelancer = new PublicKey(freelancerBytes).toBase58();
        offset += 32;

        // Read job_id string (4 bytes length + string)
        const jobIdLength = data.readUInt32LE(offset);
        offset += 4;
        const jobId = data.slice(offset, offset + jobIdLength).toString("utf8");
        offset += jobIdLength;

        // Read milestone_amounts array (3 u64s = 24 bytes)
        const milestoneAmounts: number[] = [];
        for (let i = 0; i < 3; i++) {
            const amount = Number(data.readBigUInt64LE(offset));
            milestoneAmounts.push(lamportsToSol(amount));
            offset += 8;
        }

        // Read milestones_approved array (3 bools = 3 bytes)
        const milestonesApproved: boolean[] = [];
        for (let i = 0; i < 3; i++) {
            milestonesApproved.push(data[offset] !== 0);
            offset += 1;
        }

        // Read milestones_claimed array (3 bools = 3 bytes)
        const milestonesClaimed: boolean[] = [];
        for (let i = 0; i < 3; i++) {
            milestonesClaimed.push(data[offset] !== 0);
            offset += 1;
        }

        // Skip bump (1 byte)
        // offset += 1;

        return {
            recruiter,
            freelancer,
            jobId,
            milestoneAmounts,
            milestonesApproved,
            milestonesClaimed,
        };
    } catch (error) {
        console.error("Error parsing escrow account:", error);
        return null;
    }
}

/**
 * Verify a transaction signature exists on the blockchain
 */
export async function verifyTransactionSignature(
    signature: string
): Promise<{ verified: boolean; error?: string }> {
    try {
        const status = await connection.getSignatureStatus(signature);

        if (!status || !status.value) {
            return {
                verified: false,
                error: "Transaction not found",
            };
        }

        if (status.value.err) {
            return {
                verified: false,
                error: `Transaction failed: ${JSON.stringify(status.value.err)}`,
            };
        }

        return { verified: true };
    } catch (error: any) {
        return {
            verified: false,
            error: error.message || "Failed to verify transaction",
        };
    }
}

/**
 * Get milestone status from escrow account
 */
export async function getMilestoneStatus(
    recruiterWallet: string,
    jobId: string
): Promise<{
    success: boolean;
    milestones?: Array<{
        index: number;
        amount: number;
        approved: boolean;
        claimed: boolean;
    }>;
    error?: string;
}> {
    try {
        const recruiterPubkey = new PublicKey(recruiterWallet);
        const [escrowPDA] = deriveEscrowPDA(recruiterPubkey, jobId);

        const accountInfo = await connection.getAccountInfo(escrowPDA);
        if (!accountInfo) {
            return {
                success: false,
                error: "Escrow account not found",
            };
        }

        const escrowData = parseEscrowAccount(accountInfo.data);
        if (!escrowData) {
            return {
                success: false,
                error: "Failed to parse escrow data",
            };
        }

        const milestones = escrowData.milestoneAmounts.map((amount, index) => ({
            index,
            amount,
            approved: escrowData.milestonesApproved[index],
            claimed: escrowData.milestonesClaimed[index],
        }));

        return {
            success: true,
            milestones,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || "Failed to get milestone status",
        };
    }
}

/**
 * Calculate expected escrow PDA address (without blockchain query)
 */
export function calculateEscrowAddress(
    recruiterWallet: string,
    jobId: string
): string {
    const recruiterPubkey = new PublicKey(recruiterWallet);
    const [escrowPDA] = deriveEscrowPDA(recruiterPubkey, jobId);
    return escrowPDA.toBase58();
}

