import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { FreelancePlatform } from "../target/types/freelance_platform";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";
import { createHash } from "crypto";

// Helper function to hash job_id (matches Rust implementation)
function hashJobId(jobId: string): Buffer {
  return createHash("sha256").update(jobId).digest();
}

describe("freelance_platform", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .FreelancePlatform as Program<FreelancePlatform>;

  let recruiter: Keypair;
  let freelancer: Keypair;
  let escrowPDA: PublicKey;
  const jobId = "test-job-123";
  const milestoneAmounts = [
    new BN(1 * LAMPORTS_PER_SOL),
    new BN(1.5 * LAMPORTS_PER_SOL),
    new BN(2 * LAMPORTS_PER_SOL),
  ];

  before(async () => {
    // Create test wallets
    recruiter = Keypair.generate();
    freelancer = Keypair.generate();

    // Airdrop SOL to recruiter
    const airdropSig = await provider.connection.requestAirdrop(
      recruiter.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: airdropSig,
      ...latestBlockhash
    });

    // Verify balance
    const balance = await provider.connection.getBalance(recruiter.publicKey);
    console.log(`Recruiter balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    // Derive escrow PDA using hashed job_id
    [escrowPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        recruiter.publicKey.toBuffer(),
        hashJobId(jobId),
      ],
      program.programId
    );
  });

  it("Creates job escrow and locks funds", async () => {
    const recruiterBalanceBefore = await provider.connection.getBalance(
      recruiter.publicKey
    );

    await program.methods
      .createJobEscrow(jobId, freelancer.publicKey, milestoneAmounts)
      .accounts({
        escrow: escrowPDA,
        recruiter: recruiter.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([recruiter])
      .rpc();

    // Verify escrow account data
    const escrowAccount = await program.account.escrow.fetch(escrowPDA);
    assert.equal(
      escrowAccount.recruiter.toBase58(),
      recruiter.publicKey.toBase58()
    );
    assert.equal(
      escrowAccount.freelancer.toBase58(),
      freelancer.publicKey.toBase58()
    );
    assert.equal(escrowAccount.jobId, jobId);
    assert.deepEqual(
      escrowAccount.milestoneAmounts.map((n) => n.toString()),
      milestoneAmounts.map((n) => n.toString())
    );
    assert.deepEqual(escrowAccount.milestonesApproved, [
      false,
      false,
      false,
    ]);
    assert.deepEqual(escrowAccount.milestonesClaimed, [false, false, false]);

    // Verify escrow PDA balance
    const escrowBalance = await provider.connection.getBalance(escrowPDA);
    const totalAmount = milestoneAmounts.reduce((a, b) => a.add(b), new BN(0));
    assert.isAtLeast(escrowBalance, totalAmount.toNumber());

    // Verify recruiter paid
    const recruiterBalanceAfter = await provider.connection.getBalance(
      recruiter.publicKey
    );
    assert.isBelow(recruiterBalanceAfter, recruiterBalanceBefore);
  });

  it("Prevents creating escrow with invalid milestone amounts", async () => {
    const invalidAmounts = [new BN(0), new BN(1 * LAMPORTS_PER_SOL), new BN(2 * LAMPORTS_PER_SOL)];
    const invalidJobId = "invalid-job";

    try {
      await program.methods
        .createJobEscrow(invalidJobId, freelancer.publicKey, invalidAmounts)
        .accounts({
          escrow: PublicKey.findProgramAddressSync(
            [
              Buffer.from("escrow"),
              recruiter.publicKey.toBuffer(),
              hashJobId(invalidJobId),
            ],
            program.programId
          )[0],
          recruiter: recruiter.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([recruiter])
        .rpc();

      assert.fail("Should have thrown error for invalid amounts");
    } catch (err) {
      assert.include(
        err.toString(),
        "InvalidMilestoneAmount"
      );
    }
  });

  it("Prevents non-recruiter from approving milestone", async () => {
    const fakeRecruiter = Keypair.generate();

    try {
      await program.methods
        .approveMilestone(0)
        .accounts({
          escrow: escrowPDA,
          recruiter: fakeRecruiter.publicKey,
        })
        .signers([fakeRecruiter])
        .rpc();

      assert.fail("Should have prevented non-recruiter approval");
    } catch (err) {
      // Check for constraint violation or account mismatch
      const errorStr = err.toString();
      assert.isTrue(
        errorStr.includes("has_one") ||
        errorStr.includes("constraint") ||
        errorStr.includes("ConstraintHasOne") ||
        errorStr.includes("A raw constraint was violated"),
        `Expected constraint error, got: ${errorStr}`
      );
    }
  });

  it("Recruiter approves milestone 0", async () => {
    await program.methods
      .approveMilestone(0)
      .accounts({
        escrow: escrowPDA,
        recruiter: recruiter.publicKey,
      })
      .signers([recruiter])
      .rpc();

    const escrowAccount = await program.account.escrow.fetch(escrowPDA);
    assert.deepEqual(escrowAccount.milestonesApproved, [
      true,
      false,
      false,
    ]);
  });

  it("Prevents double approval of same milestone", async () => {
    try {
      await program.methods
        .approveMilestone(0)
        .accounts({
          escrow: escrowPDA,
          recruiter: recruiter.publicKey,
        })
        .signers([recruiter])
        .rpc();

      assert.fail("Should have prevented double approval");
    } catch (err) {
      assert.include(err.toString(), "MilestoneAlreadyApproved");
    }
  });

  it("Prevents claiming unapproved milestone", async () => {
    try {
      await program.methods
        .claimMilestone(1)
        .accounts({
          escrow: escrowPDA,
          freelancer: freelancer.publicKey,
        })
        .signers([freelancer])
        .rpc();

      assert.fail("Should have prevented claiming unapproved milestone");
    } catch (err) {
      assert.include(err.toString(), "MilestoneNotApproved");
    }
  });

  it("Freelancer claims approved milestone 0", async () => {
    // Airdrop to freelancer for transaction fees
    const airdropSig = await provider.connection.requestAirdrop(
      freelancer.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: airdropSig,
      ...latestBlockhash
    });

    const freelancerBalanceBefore = await provider.connection.getBalance(
      freelancer.publicKey
    );
    const escrowBalanceBefore = await provider.connection.getBalance(
      escrowPDA
    );

    await program.methods
      .claimMilestone(0)
      .accounts({
        escrow: escrowPDA,
        freelancer: freelancer.publicKey,
      })
      .signers([freelancer])
      .rpc();

    const freelancerBalanceAfter = await provider.connection.getBalance(
      freelancer.publicKey
    );
    const escrowBalanceAfter = await provider.connection.getBalance(escrowPDA);

    // Verify payment received
    const expectedIncrease = milestoneAmounts[0].toNumber();
    assert.approximately(
      freelancerBalanceAfter - freelancerBalanceBefore,
      expectedIncrease,
      10000 // Allow small variance for tx fees
    );

    // Verify escrow balance decreased
    assert.approximately(
      escrowBalanceBefore - escrowBalanceAfter,
      expectedIncrease,
      1000
    );

    // Verify claimed status
    const escrowAccount = await program.account.escrow.fetch(escrowPDA);
    assert.deepEqual(escrowAccount.milestonesClaimed, [true, false, false]);
  });

  it("Prevents double claiming same milestone", async () => {
    try {
      await program.methods
        .claimMilestone(0)
        .accounts({
          escrow: escrowPDA,
          freelancer: freelancer.publicKey,
        })
        .signers([freelancer])
        .rpc();

      assert.fail("Should have prevented double claiming");
    } catch (err) {
      assert.include(err.toString(), "MilestoneAlreadyClaimed");
    }
  });

  it("Prevents wrong freelancer from claiming", async () => {
    const fakeFreelancer = Keypair.generate();

    // Approve milestone 1 first
    await program.methods
      .approveMilestone(1)
      .accounts({
        escrow: escrowPDA,
        recruiter: recruiter.publicKey,
      })
      .signers([recruiter])
      .rpc();

    try {
      await program.methods
        .claimMilestone(1)
        .accounts({
          escrow: escrowPDA,
          freelancer: fakeFreelancer.publicKey,
        })
        .signers([fakeFreelancer])
        .rpc();

      assert.fail("Should have prevented wrong freelancer claiming");
    } catch (err) {
      // Check for constraint violation or account mismatch
      const errorStr = err.toString();
      assert.isTrue(
        errorStr.includes("has_one") ||
        errorStr.includes("constraint") ||
        errorStr.includes("ConstraintHasOne") ||
        errorStr.includes("A raw constraint was violated"),
        `Expected constraint error, got: ${errorStr}`
      );
    }
  });

  it("Completes full milestone workflow", async () => {
    // Milestone 1 already approved above, claim it
    await program.methods
      .claimMilestone(1)
      .accounts({
        escrow: escrowPDA,
        freelancer: freelancer.publicKey,
      })
      .signers([freelancer])
      .rpc();

    // Approve and claim milestone 2
    await program.methods
      .approveMilestone(2)
      .accounts({
        escrow: escrowPDA,
        recruiter: recruiter.publicKey,
      })
      .signers([recruiter])
      .rpc();

    await program.methods
      .claimMilestone(2)
      .accounts({
        escrow: escrowPDA,
        freelancer: freelancer.publicKey,
      })
      .signers([freelancer])
      .rpc();

    // Verify all milestones completed
    const escrowAccount = await program.account.escrow.fetch(escrowPDA);
    assert.deepEqual(escrowAccount.milestonesApproved, [true, true, true]);
    assert.deepEqual(escrowAccount.milestonesClaimed, [true, true, true]);
  });

  it("Tests cancel job functionality", async () => {
    // Create new job for cancel test
    const cancelJobId = "cancel-test-job";
    const [cancelEscrowPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        recruiter.publicKey.toBuffer(),
        hashJobId(cancelJobId),
      ],
      program.programId
    );

    // Create escrow
    await program.methods
      .createJobEscrow(cancelJobId, freelancer.publicKey, milestoneAmounts)
      .accounts({
        escrow: cancelEscrowPDA,
        recruiter: recruiter.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([recruiter])
      .rpc();

    const recruiterBalanceBefore = await provider.connection.getBalance(
      recruiter.publicKey
    );

    // Cancel job
    await program.methods
      .cancelJob()
      .accounts({
        escrow: cancelEscrowPDA,
        recruiter: recruiter.publicKey,
      })
      .signers([recruiter])
      .rpc();

    // Verify escrow closed
    const escrowAccountInfo = await provider.connection.getAccountInfo(
      cancelEscrowPDA
    );
    assert.isNull(escrowAccountInfo);

    // Verify recruiter received refund
    const recruiterBalanceAfter = await provider.connection.getBalance(
      recruiter.publicKey
    );
    assert.isAbove(recruiterBalanceAfter, recruiterBalanceBefore);
  });

  it("Prevents canceling after approval", async () => {
    const cancelJobId2 = "cancel-test-job-2";
    const [cancelEscrowPDA2] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        recruiter.publicKey.toBuffer(),
        hashJobId(cancelJobId2),
      ],
      program.programId
    );

    await program.methods
      .createJobEscrow(cancelJobId2, freelancer.publicKey, milestoneAmounts)
      .accounts({
        escrow: cancelEscrowPDA2,
        recruiter: recruiter.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([recruiter])
      .rpc();

    // Approve a milestone
    await program.methods
      .approveMilestone(0)
      .accounts({
        escrow: cancelEscrowPDA2,
        recruiter: recruiter.publicKey,
      })
      .signers([recruiter])
      .rpc();

    try {
      await program.methods
        .cancelJob()
        .accounts({
          escrow: cancelEscrowPDA2,
          recruiter: recruiter.publicKey,
        })
        .signers([recruiter])
        .rpc();

      assert.fail("Should have prevented cancel after approval");
    } catch (err) {
      assert.include(
        err.toString(),
        "CannotCancelAfterApproval"
      );
    }
  });
});