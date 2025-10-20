import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import idl from "./freelance_platform_idl.json";

// Program ID from the deployed contract
export const PROGRAM_ID = new PublicKey("xXBP5XebxLWY2bG3691JeTbCRmcjjncAm5n7jMvVevm");

// Platform authority wallet (from the contract)
export const PLATFORM_AUTHORITY = new PublicKey("CMvVjcRz1CfmbLJ2RRUsDBYXh4bRcWttpkNY7FREHLUK");

// RPC connection - use devnet for testing, mainnet for production
const RPC_ENDPOINT = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl("devnet");

// Create a connection that can be shared
export const connection = new Connection(RPC_ENDPOINT, "confirmed");

/**
 * Get the Anchor program instance
 * @param wallet - Connected wallet adapter instance
 * @returns Anchor Program instance
 */
export function getProgram(wallet: any): Program {
    const provider = new AnchorProvider(
        connection,
        wallet,
        AnchorProvider.defaultOptions()
    );
    // Cast idl to any to avoid TypeScript issues with IDL version compatibility
    return new Program(idl as any, provider);
}

/**
 * Hash job_id using SHA-256 (matches Rust contract implementation)
 * Uses Web Crypto API for browser compatibility
 * @param jobId - Job ID string
 * @returns Promise of 32-byte hash buffer
 */
async function hashJobIdAsync(jobId: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(jobId);
    // Use globalThis.crypto to avoid TypeScript issues
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data as BufferSource);
    return new Uint8Array(hashBuffer);
}

/**
 * Derive the PDA (Program Derived Address) for an escrow account
 * IMPORTANT: Uses SHA-256 hash of job_id to match contract implementation
 * @param recruiterPubkey - Public key of the recruiter
 * @param jobId - Job ID string (max 50 characters)
 * @returns Promise of [PDA PublicKey, bump seed]
 */
export async function deriveEscrowPDA(
    recruiterPubkey: PublicKey,
    jobId: string
): Promise<[PublicKey, number]> {
    const jobIdHash = await hashJobIdAsync(jobId);

    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("escrow"),
            recruiterPubkey.toBuffer(),
            Buffer.from(jobIdHash),
        ],
        PROGRAM_ID
    );
}

/**
 * Convert SOL to lamports
 * @param sol - Amount in SOL
 * @returns Amount in lamports (BN)
 */
export function solToLamports(sol: number): BN {
    return new BN(sol * anchor.web3.LAMPORTS_PER_SOL);
}

/**
 * Convert lamports to SOL
 * @param lamports - Amount in lamports (can be BN or number)
 * @returns Amount in SOL
 */
export function lamportsToSol(lamports: BN | number): number {
    const amount = typeof lamports === "number" ? lamports : lamports.toNumber();
    return amount / anchor.web3.LAMPORTS_PER_SOL;
}

/**
 * Get escrow account data (read-only, no wallet needed)
 * @param recruiterWallet - Recruiter's wallet address (string or PublicKey)
 * @param jobId - Job ID
 * @returns Escrow account data or null if not found
 */
export async function getEscrowAccount(
    recruiterWallet: string | PublicKey,
    jobId: string
) {
    try {
        const recruiterPubkey = typeof recruiterWallet === "string"
            ? new PublicKey(recruiterWallet)
            : recruiterWallet;

        const [escrowPDA] = await deriveEscrowPDA(recruiterPubkey, jobId);

        // Create a dummy wallet for read-only operations
        const dummyWallet = {
            publicKey: recruiterPubkey,
            signTransaction: async (tx: any) => tx,
            signAllTransactions: async (txs: any) => txs,
        };

        const program = getProgram(dummyWallet);
        const escrowAccount = await (program.account as any).escrow.fetch(escrowPDA);

        return {
            address: escrowPDA.toBase58(),
            recruiter: escrowAccount.recruiter.toBase58(),
            freelancer: escrowAccount.freelancer.toBase58(),
            jobId: escrowAccount.jobId,
            milestoneAmounts: escrowAccount.milestoneAmounts.map((bn: BN) => lamportsToSol(bn)),
            milestonesApproved: escrowAccount.milestonesApproved,
            milestonesClaimed: escrowAccount.milestonesClaimed,
            bump: escrowAccount.bump,
        };
    } catch (error) {
        console.error("Error fetching escrow account:", error);
        return null;
    }
}

/**
 * Get the SOL balance of an escrow account
 * @param recruiterWallet - Recruiter's wallet address
 * @param jobId - Job ID
 * @returns Balance in SOL, or null if account doesn't exist
 */
export async function getEscrowBalance(
    recruiterWallet: string | PublicKey,
    jobId: string
): Promise<number | null> {
    try {
        const recruiterPubkey = typeof recruiterWallet === "string"
            ? new PublicKey(recruiterWallet)
            : recruiterWallet;

        const [escrowPDA] = await deriveEscrowPDA(recruiterPubkey, jobId);
        const balance = await connection.getBalance(escrowPDA);
        return lamportsToSol(balance);
    } catch (error) {
        console.error("Error fetching escrow balance:", error);
        return null;
    }
}

/**
 * Check if a wallet address is valid
 * @param address - Wallet address string
 * @returns true if valid, false otherwise
 */
export function isValidSolanaAddress(address: string): boolean {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

export type EscrowAccount = {
    address: string;
    recruiter: string;
    freelancer: string;
    jobId: string;
    milestoneAmounts: number[];
    milestonesApproved: boolean[];
    milestonesClaimed: boolean[];
    bump: number;
};

