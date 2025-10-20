import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FreelancePlatform } from "../target/types/freelance_platform";
import { PublicKey } from "@solana/web3.js";
import { createHash } from "crypto";

// Hash job_id to match contract implementation
function hashJobId(jobId: string): Buffer {
    return createHash("sha256").update(jobId).digest();
}

async function main() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.FreelancePlatform as Program<FreelancePlatform>;

    // Your job ID
    const jobId = "24d0baa5-e36a-4f8c-9db2-704774e6b6c6";

    // Derive escrow PDA
    const [escrowPDA] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("escrow"),
            provider.wallet.publicKey.toBuffer(),
            hashJobId(jobId),
        ],
        program.programId
    );

    console.log("Escrow PDA:", escrowPDA.toBase58());
    console.log("Recruiter:", provider.wallet.publicKey.toBase58());

    // Check if escrow exists
    const escrowAccount = await connection.getAccountInfo(escrowPDA);
    if (!escrowAccount) {
        console.log("❌ Escrow does not exist!");
        return;
    }

    console.log("✅ Escrow found, attempting to cancel...");

    try {
        const tx = await program.methods
            .cancelJob()
            .accounts({
                escrow: escrowPDA,
                recruiter: provider.wallet.publicKey,
            })
            .rpc();

        console.log("✅ Escrow cancelled! Transaction:", tx);
        console.log("Your funds have been returned.");
        console.log("\nYou can now retry staking on this job.");
    } catch (error: any) {
        console.error("❌ Error cancelling escrow:", error);

        if (error.toString().includes("CannotCancelAfterApproval")) {
            console.log("\n⚠️  Cannot cancel: At least one milestone has been approved.");
            console.log("You'll need to complete the project or use a different job.");
        }
    }
}

// Import connection
const connection = anchor.getProvider().connection;

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

