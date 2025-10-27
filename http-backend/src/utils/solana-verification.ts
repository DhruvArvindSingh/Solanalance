import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import idl from './freelance_platform_idl.json';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('xXBP5XebxLWY2bG3691JeTbCRmcjjncAm5n7jMvVevm');

const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

/**
 * Convert lamports to SOL
 */
function lamportsToSol(lamports: number): number {
    return lamports / 1_000_000_000;
}

/**
 * Hash job ID to match Rust contract implementation
 */
async function hashJobIdAsync(jobId: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(jobId);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data as BufferSource);
    return new Uint8Array(hashBuffer);
}

/**
 * Derive escrow PDA for a given recruiter and job ID
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
 * Verify escrow transaction on Solana blockchain
 * 
 * @param escrowPDA - The escrow PDA address
 * @param recruiterId - Database recruiter ID (for logging)
 * @param freelancerId - Database freelancer ID (for logging)
 * @returns Verification result with on-chain data
 */
export async function verifyEscrowTransaction(
    escrowPDA: string,
    recruiterId: string,
    freelancerId: string
): Promise<{
    success: boolean;
    totalStaked?: number;
    recruiterWallet?: string;
    freelancerWallet?: string;
    milestones?: Array<{ amount: number; approved: boolean; claimed: boolean }>;
    error?: string;
}> {
    try {
        const escrowPubkey = new PublicKey(escrowPDA);

        // Check if account exists
        const accountInfo = await connection.getAccountInfo(escrowPubkey);

        if (!accountInfo) {
            return {
                success: false,
                error: 'Escrow account does not exist on blockchain'
            };
        }

        console.log(`✓ Escrow account found: ${escrowPDA}`);

        // Get account balance
        const balance = await connection.getBalance(escrowPubkey);
        const stakedSOL = lamportsToSol(balance);

        console.log(`✓ Escrow balance: ${stakedSOL.toFixed(4)} SOL`);

        // Try to fetch escrow data using Anchor
        try {
            // Create a dummy wallet for read-only operations
            const dummyWallet = {
                publicKey: PROGRAM_ID,
                signTransaction: async () => { throw new Error('Read-only'); },
                signAllTransactions: async () => { throw new Error('Read-only'); }
            };

            const provider = new AnchorProvider(
                connection,
                dummyWallet as any,
                AnchorProvider.defaultOptions()
            );

            const program = new Program(idl as any, provider);
            const escrowData = await (program.account as any).escrow.fetch(escrowPubkey);

            const milestoneAmounts = escrowData.milestoneAmounts.map((bn: any) =>
                lamportsToSol(bn.toNumber())
            );
            const totalMilestones = milestoneAmounts.reduce((a: number, b: number) => a + b, 0);

            console.log(`✓ Escrow data fetched successfully`);
            console.log(`  Recruiter: ${escrowData.recruiter.toBase58()}`);
            console.log(`  Freelancer: ${escrowData.freelancer.toBase58()}`);
            console.log(`  Milestone Amounts: ${milestoneAmounts.join(', ')} SOL`);

            return {
                success: true,
                totalStaked: stakedSOL,
                recruiterWallet: escrowData.recruiter.toBase58(),
                freelancerWallet: escrowData.freelancer.toBase58(),
                milestones: milestoneAmounts.map((amount: any, index: number) => ({
                    amount: (typeof amount.toNumber === 'function' ? amount.toNumber() : amount) / LAMPORTS_PER_SOL,
                    approved: escrowData.milestonesApproved[index],
                    claimed: escrowData.milestonesClaimed[index]
                }))
            };

        } catch (fetchError) {
            console.error('Could not fetch escrow data:', fetchError);

            // Account exists but we can't read it - still consider it valid
            return {
                success: true,
                totalStaked: stakedSOL,
                error: 'Account exists but data could not be decoded'
            };
        }

    } catch (error) {
        console.error('Escrow verification error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Get escrow details for an active job
 * 
 * @param recruiterWallet - Recruiter's wallet address
 * @param jobId - Job ID from database
 * @returns Escrow details including PDA and current funds
 */
export async function getEscrowDetails(
    recruiterWallet: string,
    jobId: string
): Promise<{
    success: boolean;
    escrowPDA?: string;
    currentFunds?: number;
    recruiterWallet?: string;
    freelancerWallet?: string;
    milestones?: Array<{ amount: number; approved: boolean; claimed: boolean }>;
    error?: string;
}> {
    try {
        if (!recruiterWallet) {
            return { success: false, error: "Recruiter wallet address is required" };
        }

        const recruiterPubkey = new PublicKey(recruiterWallet);
        const [escrowPDA] = await deriveEscrowPDA(recruiterPubkey, jobId);

        console.log(`Getting escrow details for job ${jobId}`);
        console.log(`Escrow PDA: ${escrowPDA.toBase58()}`);

        // Check if escrow account exists
        const accountInfo = await connection.getAccountInfo(escrowPDA);

        if (!accountInfo) {
            return {
                success: true,
                escrowPDA: escrowPDA.toBase58(),
                currentFunds: 0,
                error: "Escrow account does not exist. Funds have not been staked yet."
            };
        }

        // Get account balance
        const balance = await connection.getBalance(escrowPDA);
        const currentFunds = lamportsToSol(balance);

        console.log(`✓ Escrow balance: ${currentFunds.toFixed(4)} SOL`);

        // Try to fetch escrow data using Anchor
        try {
            // Create a dummy wallet for read-only operations
            const dummyWallet = {
                publicKey: recruiterPubkey,
                signTransaction: async (tx: any) => tx,
                signAllTransactions: async (txs: any) => txs,
            };

            const provider = new AnchorProvider(
                connection,
                dummyWallet as any,
                AnchorProvider.defaultOptions()
            );

            const program = new Program(idl as any, provider);
            const escrowData = await (program.account as any).escrow.fetch(escrowPDA);

            const milestoneAmounts = escrowData.milestoneAmounts.map((bn: any) =>
                lamportsToSol(bn.toNumber())
            );

            console.log(`✓ Escrow data fetched successfully`);
            console.log(`  Recruiter: ${escrowData.recruiter.toBase58()}`);
            console.log(`  Freelancer: ${escrowData.freelancer.toBase58()}`);
            console.log(`  Milestone Amounts: ${milestoneAmounts.join(', ')} SOL`);

            return {
                success: true,
                escrowPDA: escrowPDA.toBase58(),
                currentFunds,
                recruiterWallet: escrowData.recruiter.toBase58(),
                freelancerWallet: escrowData.freelancer.toBase58(),
                milestones: milestoneAmounts.map((amount: any, index: number) => ({
                    amount: (typeof amount.toNumber === 'function' ? amount.toNumber() : amount) / LAMPORTS_PER_SOL,
                    approved: escrowData.milestonesApproved[index],
                    claimed: escrowData.milestonesClaimed[index]
                }))
            };

        } catch (fetchError) {
            console.error('Could not fetch escrow data:', fetchError);

            // Account exists but we can't read it - still return basic info
            return {
                success: true,
                escrowPDA: escrowPDA.toBase58(),
                currentFunds,
                error: 'Account exists but data could not be decoded'
            };
        }

    } catch (error) {
        console.error('Escrow details error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Verify a Solana transaction exists and is confirmed
 * 
 * @param signature - Transaction signature
 * @returns Whether the transaction is confirmed
 */
export async function verifyTransactionSignature(signature: string): Promise<boolean> {
    try {
        const tx = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        return tx !== null;
    } catch (error) {
        console.error('Error verifying transaction:', error);
        return false;
    }
}
