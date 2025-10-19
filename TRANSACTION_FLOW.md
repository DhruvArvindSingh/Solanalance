# Solana Transaction Flow: Job Funding

## 🎯 Complete Flow Overview

When a recruiter selects a freelancer for a job, here's exactly what happens:

### ONE Transaction Does Both:

In Solana/Anchor, **creating the PDA and staking funds happens in ONE atomic transaction**. This is a fundamental aspect of Solana's architecture - you cannot separate these operations.

```rust
// In the smart contract (lib.rs):
pub fn create_job_escrow(...) -> Result<()> {
    // 1. PDA is created (via #[account(init, ...)] attribute)
    // 2. Full amount is transferred
    system_program::transfer(..., total_amount)?;
    
    // Both happen atomically - either both succeed or both fail
}
```

## 📝 Step-by-Step Flow

### Step 1: Recruiter Clicks "Select & Fund Job"

**Frontend displays:**
- Freelancer information
- Milestone breakdown
- Total amount to stake (100% of job)
- Warning: Full payment required upfront

### Step 2: ONE Transaction Signature Required

**User signs transaction that includes:**
1. ✅ Create escrow PDA account
2. ✅ Transfer FULL job amount (milestone1 + milestone2 + milestone3)

**Transaction details:**
```typescript
// This ONE transaction does both:
await program.methods
  .createJobEscrow(
    jobId,                    // Job identifier
    freelancerPubkey,         // Freelancer's wallet
    [m1, m2, m3]             // Milestone amounts in lamports
  )
  .accounts({
    escrow: escrowPDA,        // PDA to create
    recruiter: recruiterKey,  // Signer (pays for everything)
    systemProgram: ...
  })
  .rpc();  // Sign and send
```

**What happens on-chain:**
- Anchor creates the escrow account at the PDA address
- Recruiter pays rent for the account (~0.002 SOL)
- System program transfers full amount from recruiter to PDA
- Escrow data is initialized with job details

### Step 3: Frontend Verification (Before Backend)

**After transaction succeeds, frontend verifies:**

```typescript
// 1. Verify PDA exists
const escrowAccount = await connection.getAccountInfo(escrowPDA);
if (!escrowAccount) {
  throw new Error("PDA not created");
}

// 2. Verify full amount is staked
const balance = await connection.getBalance(escrowPDA);
const staked = balance / LAMPORTS_PER_SOL;

if (staked < totalAmount - 0.01) {  // Small tolerance for rent
  throw new Error(`Only ${staked} SOL staked, expected ${totalAmount}`);
}

console.log("✓ PDA created");
console.log("✓ Full amount staked");
```

**Only if both checks pass**, proceed to Step 4.

### Step 4: Send to Backend for Verification

**Frontend sends:**
```json
POST /api/escrow/verify-funding
{
  "jobId": "uuid",
  "recruiterWallet": "wallet_address",
  "freelancerWallet": "wallet_address",
  "txSignature": "transaction_signature",
  "expectedTotal": 5.0,
  "milestoneAmounts": [1.5, 2.0, 1.5]
}
```

### Step 5: Backend Verification

**Backend independently verifies on blockchain:**

```typescript
// 1. Verify transaction exists and succeeded
const txStatus = await connection.getSignatureStatus(signature);
if (!txStatus || txStatus.err) {
  return error("Transaction not found or failed");
}

// 2. Calculate expected PDA
const [expectedPDA] = deriveEscrowPDA(recruiterWallet, jobId);

// 3. Verify PDA exists
const accountInfo = await connection.getAccountInfo(expectedPDA);
if (!accountInfo) {
  return error("Escrow PDA not found");
}

// 4. Verify account is owned by our program
if (accountInfo.owner !== PROGRAM_ID) {
  return error("PDA not owned by escrow program");
}

// 5. Parse escrow data
const escrowData = parseEscrowAccount(accountInfo.data);

// 6. Verify recruiter matches
if (escrowData.recruiter !== recruiterWallet) {
  return error("PDA not created by this recruiter");
}

// 7. Verify freelancer matches
if (escrowData.freelancer !== freelancerWallet) {
  return error("Wrong freelancer in escrow");
}

// 8. Verify job ID matches
if (escrowData.jobId !== jobId) {
  return error("Job ID mismatch");
}

// 9. Verify full amount is staked
const balance = await connection.getBalance(expectedPDA);
const totalMilestones = escrowData.milestoneAmounts.reduce(...);

if (balance < totalMilestones) {
  return error("Insufficient funds staked");
}
```

**All checks must pass** before proceeding to Step 6.

### Step 6: Backend Updates Database

**Only after successful verification:**

```sql
BEGIN TRANSACTION;

-- Update job
UPDATE jobs 
SET status = 'in_progress',
    selected_freelancer_id = '<freelancer_id>'
WHERE id = '<job_id>';

-- Create project
INSERT INTO projects (job_id, recruiter_id, freelancer_id, status)
VALUES (...);

-- Create milestones
INSERT INTO milestones (project_id, stage_id, payment_amount, status)
VALUES 
  (project_id, stage1_id, milestone1_amount, 'pending'),
  (project_id, stage2_id, milestone2_amount, 'pending'),
  (project_id, stage3_id, milestone3_amount, 'pending');

-- Create staking record
INSERT INTO staking (project_id, recruiter_id, wallet_address, total_staked, transaction_signature)
VALUES (...);

-- Create transaction record
INSERT INTO transactions (from_user_id, to_user_id, type, amount, wallet_signature)
VALUES (...);

-- Notify freelancer
INSERT INTO notifications (user_id, title, message, type)
VALUES (freelancer_id, 'Job Funded!', '...', 'job_funded');

COMMIT;
```

### Step 7: Success Response

**Backend responds:**
```json
{
  "success": true,
  "message": "Escrow verified and job activated",
  "data": {
    "job": { "id": "...", "status": "in_progress" },
    "project": { "id": "...", "status": "active" },
    "escrowAddress": "...",
    "balance": 5.0,
    "milestones": [...]
  }
}
```

### Step 8: Frontend Updates UI

**Frontend shows:**
- ✓ Transaction successful
- ✓ PDA created
- ✓ Full amount staked
- ✓ Backend verified
- ✓ Job allocated to freelancer
- → Navigate to project workspace

## 🔒 Security Guarantees

### What Cannot Happen:

❌ **Partial Staking**
- Smart contract requires full amount in ONE transaction
- Cannot create PDA without transferring full amount
- Atomic operation ensures both or neither

❌ **Fake Escrow**
- Backend verifies PDA is owned by correct program
- Backend verifies PDA data matches job details
- Cannot spoof escrow account

❌ **Wrong Wallet**
- Backend verifies recruiter created the PDA
- Backend verifies freelancer matches selection
- Cannot misdirect funds

❌ **Database Out of Sync**
- Database only updates after backend verification
- If verification fails, no database changes
- Guaranteed consistency

## 💡 Why ONE Transaction?

**Solana's Design:**
```
Traditional approach (2 transactions):
TX1: Create account
TX2: Transfer funds
❌ Problem: What if TX2 fails? Empty account exists.

Solana/Anchor approach (1 transaction):
TX1: Create account + Transfer funds (atomic)
✓ Solution: Either both succeed or neither happens.
```

**Benefits:**
1. **Atomic** - No partial state
2. **Cheaper** - One transaction fee instead of two
3. **Safer** - No orphaned accounts
4. **Faster** - One confirmation instead of two

## 📊 Transaction Breakdown

### What Recruiter Pays:

```
Total Transaction Cost:
├─ Escrow account rent: ~0.002 SOL (refundable)
├─ Transaction fee: ~0.000005 SOL
└─ Job funding: milestone1 + milestone2 + milestone3

Example: 1.5 + 2.0 + 1.5 = 5.0 SOL
Total: ~5.002 SOL
```

### Where Funds Go:

```
Recruiter Wallet Balance: -5.002 SOL
├─ Escrow PDA: +5.0 SOL (locked)
│   ├─ Milestone 1: 1.5 SOL (pending)
│   ├─ Milestone 2: 2.0 SOL (pending)
│   └─ Milestone 3: 1.5 SOL (pending)
├─ Rent: +0.002 SOL (in PDA account)
└─ Network fees: -0.000005 SOL (burned)
```

## 🎨 UI Flow Example

```tsx
function SelectFreelancerButton({ job, freelancer }) {
  const { fundJobEscrow, isLoading } = useEscrowWithVerification();
  const totalAmount = job.milestone1 + job.milestone2 + job.milestone3;

  const handleSelect = async () => {
    // Shows: "Sign transaction to stake 5.0 SOL"
    const result = await fundJobEscrow(
      job.id,
      freelancer.walletAddress,
      [job.milestone1, job.milestone2, job.milestone3]
    );

    if (result.success) {
      // Shows: "Job funded and verified!"
      // Database already updated
      // Navigate to project
      navigate(`/project/${result.project.id}`);
    }
  };

  return (
    <Button onClick={handleSelect} disabled={isLoading}>
      {isLoading 
        ? "Processing..." 
        : `Fund Job & Stake ${totalAmount} SOL`
      }
    </Button>
  );
}
```

## 📝 Summary

### Key Points:

1. ✅ **ONE transaction** creates PDA + stakes full amount
2. ✅ **Atomic operation** - both succeed or both fail
3. ✅ **100% upfront** - no partial payments
4. ✅ **Frontend verifies** PDA creation and full staking
5. ✅ **Backend verifies** independently before database update
6. ✅ **Database updates** only after complete verification
7. ✅ **Job allocated** only after everything succeeds

### No Partial Staking:

❌ No 20% minimum
❌ No installment payments
❌ No partial funding

✅ 100% full job amount required upfront
✅ All milestones funded from the start
✅ Freelancer can claim as milestones are approved

This ensures freelancers are guaranteed payment and recruiters cannot underfund jobs.


