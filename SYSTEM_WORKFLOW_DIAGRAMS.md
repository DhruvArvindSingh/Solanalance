# 📊 System Workflow Diagrams

## Complete Flow Visualizations

This document provides detailed visual representations of all critical workflows in the Solana-based freelancing platform.

---

## 1. Complete Job Lifecycle

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                          JOB LIFECYCLE OVERVIEW                                │
└───────────────────────────────────────────────────────────────────────────────┘

PHASE 1: JOB CREATION (Recruiter)
────────────────────────────────────
┌─────────────┐
│  Recruiter  │
│  Dashboard  │
└──────┬──────┘
       │
       ├─ Clicks "Post New Job"
       │
       ↓
┌─────────────────────┐
│  Job Creation Form  │
├─────────────────────┤
│ • Title             │
│ • Description       │
│ • Skills Required   │
│ • Total Payment     │
│ • 3 Milestones:     │
│   - Stage 1: X SOL  │
│   - Stage 2: Y SOL  │
│   - Stage 3: Z SOL  │
└──────┬──────────────┘
       │
       ├─ Submit
       │
       ↓
┌──────────────────┐     ┌────────────────────┐
│   Backend API    │────→│  PostgreSQL        │
│   POST /jobs     │     │  jobs table        │
└──────────────────┘     │  status: "open"    │
                         └────────────────────┘

═══════════════════════════════════════════════════════════════════

PHASE 2: FREELANCER APPLICATION
────────────────────────────────────
┌─────────────┐
│ Freelancer  │
│  Dashboard  │
└──────┬──────┘
       │
       ├─ Browses open jobs
       ├─ Clicks "Apply"
       │
       ↓
┌──────────────────────┐
│ Application Form     │
├──────────────────────┤
│ • Cover Letter       │
│ • Resume Upload      │
│ • Portfolio Links    │
│ • 💎 WALLET ADDRESS │ ← IMMUTABLE!
│ • Est. Completion    │
└──────┬───────────────┘
       │
       ├─ Submit
       │
       ↓
┌──────────────────────┐     ┌──────────────────────────┐
│   Backend API        │────→│  PostgreSQL              │
│   POST /applications │     │  applications table      │
└──────────────────────┘     │  wallet_address: "..."   │
                              │  job.freelancer_wallet:  │
                              │    "..." (updated)       │
                              └──────────────────────────┘

═══════════════════════════════════════════════════════════════════

PHASE 3: ESCROW CREATION & FUNDING
────────────────────────────────────
┌─────────────┐
│  Recruiter  │
│ Reviews     │
│ Applicants  │
└──────┬──────┘
       │
       ├─ Selects freelancer
       ├─ Clicks "Hire & Fund Job"
       │
       ↓
┌────────────────────────────────────┐
│      StakingModal Opens            │
├────────────────────────────────────┤
│ Freelancer: Alice                  │
│ Wallet: 7xKm...8Pq9                │
│                                    │
│ Milestones:                        │
│  Stage 1: 1.5 SOL                  │
│  Stage 2: 2.0 SOL                  │
│  Stage 3: 1.5 SOL                  │
│ ─────────────────                  │
│  TOTAL: 5.0 SOL                    │
│                                    │
│  [Fund Job & Stake 5.0 SOL]       │
└────────┬───────────────────────────┘
         │
         ├─ Click button
         ↓
┌────────────────────────────────────┐
│   Wallet Popup (Phantom/Solflare)  │
│   ─────────────────────────────────│
│   Transaction Details:             │
│   • Create PDA account             │
│   • Transfer 5.0 SOL to escrow     │
│   • Network Fee: ~0.00025 SOL      │
│                                    │
│   [Approve] [Reject]               │
└────────┬───────────────────────────┘
         │
         ├─ User approves
         │
         ↓
    ┌────────────────────────────────────────────────────┐
    │          SOLANA BLOCKCHAIN                         │
    ├────────────────────────────────────────────────────┤
    │                                                    │
    │  🔹 Derive PDA:                                   │
    │     seeds = [                                      │
    │       "escrow",                                    │
    │       recruiter_pubkey,                           │
    │       SHA256(job_id)                              │
    │     ]                                              │
    │                                                    │
    │  🔹 Create Escrow Account:                        │
    │     {                                              │
    │       recruiter: "9Hs2...3Kf" ← IMMUTABLE         │
    │       freelancer: "7xKm...8Pq9" ← IMMUTABLE       │
    │       job_id: "550e8400-..."                      │
    │       milestone_amounts: [1.5, 2.0, 1.5] SOL     │
    │       milestones_approved: [false, false, false]  │
    │       milestones_claimed: [false, false, false]   │
    │     }                                              │
    │                                                    │
    │  🔹 Transfer 5.0 SOL → Escrow PDA                 │
    │                                                    │
    │  ✅ Transaction Confirmed                         │
    │     Signature: 3Hx9k...7Qp2                       │
    └────────┬───────────────────────────────────────────┘
             │
             ├─ Frontend verifies:
             │   ✓ PDA exists
             │   ✓ 5.0 SOL staked
             │
             ↓
    ┌─────────────────────────────────────┐
    │   Backend API                       │
    │   POST /escrow/verify               │
    ├─────────────────────────────────────┤
    │  • Verifies transaction on-chain    │
    │  • Extracts wallet addresses        │
    │  • Creates project record           │
    │  • Creates milestones (3)           │
    │  • Creates staking record           │
    │  • Updates job:                     │
    │    - status: "active"               │
    │    - recruiter_wallet: "9Hs2..."   │
    │    - freelancer_wallet: "7xKm..."  │
    └─────────┬───────────────────────────┘
              │
              ↓
    ┌─────────────────────────────┐
    │   Database Updated          │
    ├─────────────────────────────┤
    │ Job: status = "active"      │
    │ Project: created            │
    │ Milestones: 3 created       │
    │ Staking: 5.0 SOL recorded   │
    │ Transaction: recorded       │
    └─────────────────────────────┘

═══════════════════════════════════════════════════════════════════

PHASE 4: MILESTONE WORKFLOW (× 3 iterations)
────────────────────────────────────

For each milestone (1, 2, 3):

┌─────────────┐
│ Freelancer  │
│ Workspace   │
└──────┬──────┘
       │
       ├─ Works on milestone
       ├─ Completes deliverables
       ├─ Clicks "Submit Milestone"
       │
       ↓
┌──────────────────────────────┐
│  Milestone Submission Form   │
├──────────────────────────────┤
│ • Description (required)     │
│ • Links (optional)           │
│ • Files (optional, max 5)    │
│                              │
│   [Submit Milestone]         │
└──────┬───────────────────────┘
       │
       ↓
┌──────────────────────────┐     ┌──────────────────────────┐
│   Backend API            │────→│  PostgreSQL              │
│   POST /projects/        │     │  milestones table        │
│   milestones/:id/submit  │     │  status: "submitted"     │
└──────────────────────────┘     │  submission_description  │
                                  │  submission_files (S3)   │
                                  └──────────────────────────┘
       │
       ├─ Notification sent to recruiter
       │
       ↓
┌─────────────┐
│  Recruiter  │
│ Reviews     │
│ Submission  │
└──────┬──────┘
       │
       ├─ Option A: Request Changes
       │   └→ milestone.status = "revision_requested"
       │      └→ freelancer resubmits
       │
       ├─ Option B: Approve ✅
       │
       ↓
┌──────────────────────────────┐
│  Recruiter Approval Action   │
├──────────────────────────────┤
│ Milestone 1 Submission       │
│ ────────────────────         │
│ Description: ...             │
│ Files: [...] Links: [...]    │
│                              │
│ [Request Changes]            │
│ [Approve & Release Payment]  │◄─── Clicks this
└──────┬───────────────────────┘
       │
       ↓
┌────────────────────────────────────┐
│   Wallet Popup (Phantom)           │
│   ─────────────────────────────────│
│   Smart Contract Call:             │
│   approve_milestone(index: 0)      │
│   Network Fee: ~0.000005 SOL       │
│                                    │
│   [Approve] [Reject]               │
└────────┬───────────────────────────┘
         │
         ├─ Recruiter approves
         │
         ↓
    ┌────────────────────────────────────────────┐
    │       SOLANA BLOCKCHAIN                    │
    ├────────────────────────────────────────────┤
    │                                            │
    │  🔹 Call: approve_milestone(0)            │
    │                                            │
    │  🔹 Escrow State Updated:                 │
    │     milestones_approved[0] = true ✅      │
    │                                            │
    │  ✅ Transaction Confirmed                 │
    │     Signature: 5Kx2m...9Tp1               │
    └────────┬───────────────────────────────────┘
             │
             ↓
    ┌─────────────────────────────────────┐
    │   Backend API                       │
    │   PUT /projects/milestones/:id/     │
    │       review                        │
    ├─────────────────────────────────────┤
    │  • Updates milestone status:        │
    │    - status: "approved"             │
    │  • Records transaction signature    │
    │  • Sends notification to freelancer │
    └─────────────────────────────────────┘

       ↓
┌─────────────┐
│ Freelancer  │
│ Workspace   │
└──────┬──────┘
       │
       ├─ Sees "Milestone Approved - Ready to Claim!"
       ├─ Clicks "Claim 1.5 SOL" button
       │
       ↓
┌────────────────────────────────────┐
│   Wallet Popup (Phantom)           │
│   ─────────────────────────────────│
│   Smart Contract Call:             │
│   claim_milestone(index: 0)        │
│   You will receive: 1.5 SOL        │
│   Network Fee: ~0.000005 SOL       │
│                                    │
│   [Approve] [Reject]               │
└────────┬───────────────────────────┘
         │
         ├─ Freelancer approves
         │
         ↓
    ┌────────────────────────────────────────────┐
    │       SOLANA BLOCKCHAIN                    │
    ├────────────────────────────────────────────┤
    │                                            │
    │  🔹 Call: claim_milestone(0)              │
    │                                            │
    │  🔹 Verification:                         │
    │     ✓ milestones_approved[0] == true      │
    │     ✓ milestones_claimed[0] == false      │
    │     ✓ Signer == escrow.freelancer         │
    │                                            │
    │  🔹 Transfer:                             │
    │     Escrow PDA → Freelancer Wallet        │
    │     Amount: 1.5 SOL                        │
    │                                            │
    │  🔹 Escrow State Updated:                 │
    │     milestones_claimed[0] = true ✅       │
    │                                            │
    │  ✅ Transaction Confirmed                 │
    │     Signature: 8Nx5p...2Qm9               │
    └────────┬───────────────────────────────────┘
             │
             ↓
    ┌─────────────────────────────────────┐
    │   Backend API                       │
    │   PUT /projects/milestones/:id/     │
    │       payment-status                │
    ├─────────────────────────────────────┤
    │  • Updates milestone:               │
    │    - payment_released: true         │
    │  • Records transaction              │
    │  • Updates staking.total_released   │
    └─────────────────────────────────────┘

       │
       ↓
    [REPEAT for Milestone 2 and 3]

═══════════════════════════════════════════════════════════════════

PHASE 5: PROJECT COMPLETION
────────────────────────────────────

After all 3 milestones claimed:

┌─────────────────────────────┐
│  Automatic State Update     │
├─────────────────────────────┤
│ • Project status: "completed"│
│ • Escrow balance: 0 SOL     │
│ • All milestones: claimed   │
│ • Rating modal: shown       │
└─────────────────────────────┘

┌─────────────────────────────┐
│  Rating & Review            │
├─────────────────────────────┤
│ Both parties rate each other│
│ • Quality: ⭐⭐⭐⭐⭐      │
│ • Communication: ⭐⭐⭐⭐   │
│ • Professionalism: ⭐⭐⭐⭐⭐│
│ • Written Review            │
└─────────────────────────────┘

┌─────────────────────────────┐
│  Trust Points Updated       │
├─────────────────────────────┤
│ Freelancer:                 │
│ • +100 points               │
│ • completed_projects++      │
│ • avg_rating recalculated   │
│ • tier updated (if needed)  │
│                             │
│ Recruiter:                  │
│ • +50 points                │
│ • Rating recorded           │
└─────────────────────────────┘
```

---

## 2. Wallet Address Tracking Flow

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                    WALLET ADDRESS IMMUTABILITY FLOW                            │
└───────────────────────────────────────────────────────────────────────────────┘

1️⃣ FREELANCER APPLICATION
───────────────────────────
┌─────────────────────────────┐
│  Freelancer applies         │
│  Enters wallet address:     │
│  "7xKm...8Pq9"             │
└──────┬──────────────────────┘
       │
       ↓
┌───────────────────────────────────────┐
│  Database: applications table         │
├───────────────────────────────────────┤
│  wallet_address: "7xKm...8Pq9"       │
│  ⚠️ This field is IMMUTABLE          │
└───────────────────────────────────────┘
       │
       ↓
┌───────────────────────────────────────┐
│  Database: jobs table                 │
├───────────────────────────────────────┤
│  freelancer_wallet: "7xKm...8Pq9"    │
│  (Updated when application created)   │
└───────────────────────────────────────┘

2️⃣ ESCROW CREATION
───────────────────────────
┌─────────────────────────────┐
│  Recruiter funds escrow     │
│  Using wallet:              │
│  "9Hs2...3Kf"              │
└──────┬──────────────────────┘
       │
       ↓
┌─────────────────────────────────────────┐
│  Smart Contract: Escrow PDA             │
├─────────────────────────────────────────┤
│  pub struct Escrow {                    │
│    recruiter: "9Hs2...3Kf"  ← IMMUTABLE│
│    freelancer: "7xKm...8Pq9" ← IMMUTABLE│
│    job_id: "..."                        │
│    // ...                               │
│  }                                       │
└────────┬────────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────┐
│  Backend verifies on-chain             │
│  Extracts:                             │
│  • recruiter = "9Hs2...3Kf"           │
│  • freelancer = "7xKm...8Pq9"         │
└────────┬───────────────────────────────┘
         │
         ↓
┌───────────────────────────────────────┐
│  Database: jobs table                 │
├───────────────────────────────────────┤
│  recruiter_wallet: "9Hs2...3Kf"      │ ← From blockchain!
│  freelancer_wallet: "7xKm...8Pq9"    │ ← Confirmed from blockchain!
│  ⚠️ Both fields are now LOCKED       │
└───────────────────────────────────────┘

3️⃣ VERIFICATION & PDA DERIVATION
────────────────────────────────────
┌─────────────────────────────────────┐
│  Frontend: Derive Escrow PDA        │
├─────────────────────────────────────┤
│  1. Get job data from API           │
│  2. Extract job.recruiter_wallet    │ ← Uses stored wallet!
│  3. Derive PDA:                     │
│     seeds = [                        │
│       "escrow",                      │
│       job.recruiter_wallet,         │ ← Matches original!
│       SHA256(job_id)                 │
│     ]                                │
│  4. Verify funds on-chain           │
└─────────────────────────────────────┘

Benefits:
─────────
✅ Historical Accuracy
   • Wallet addresses never change per job
   • Always points to correct escrow PDA
   
✅ No Profile Dependency
   • Independent of user profile wallet changes
   • Recruiter can change profile wallet without affecting existing jobs
   
✅ Audit Trail
   • Clear record of which wallet funded which job
   • Transparent tracking for all transactions
```

---

## 3. Escrow Security Flow

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                        ESCROW SECURITY MECHANISMS                              │
└───────────────────────────────────────────────────────────────────────────────┘

1️⃣ PDA OWNERSHIP PROTECTION
────────────────────────────
┌─────────────────────────────────────────┐
│  Program Derived Address (PDA)          │
├─────────────────────────────────────────┤
│  • No private key exists                │
│  • Only program can sign on behalf      │
│  • Cannot be controlled by users        │
│  • Funds locked until program releases  │
└─────────────────────────────────────────┘
           │
           ├─ ❌ CANNOT: Direct transfer by recruiter
           ├─ ❌ CANNOT: Direct transfer by freelancer
           ├─ ❌ CANNOT: Transfer by unauthorized party
           │
           ├─ ✅ CAN: Program-signed transfer (claim_milestone)
           └─ ✅ CAN: Platform emergency withdrawal (if needed)

2️⃣ APPROVAL GATE
────────────────────────────
┌─────────────────────────────────────────┐
│  approve_milestone(index)               │
├─────────────────────────────────────────┤
│  #[account(has_one = recruiter)]        │
│  pub escrow: Account<'info, Escrow>     │
│  pub recruiter: Signer<'info>           │
└─────────────────────────────────────────┘
           │
           ├─ ✅ Checks: Signer == escrow.recruiter
           ├─ ❌ Fails if: Wrong wallet signs
           ├─ ❌ Fails if: Already approved
           │
           └─ ✅ Updates: milestones_approved[index] = true

3️⃣ CLAIM GATE
────────────────────────────
┌─────────────────────────────────────────┐
│  claim_milestone(index)                 │
├─────────────────────────────────────────┤
│  #[account(has_one = freelancer)]       │
│  pub escrow: Account<'info, Escrow>     │
│  pub freelancer: Signer<'info>          │
└─────────────────────────────────────────┘
           │
           ├─ ✅ Checks: Signer == escrow.freelancer
           ├─ ❌ Fails if: Wrong wallet signs
           ├─ ❌ Fails if: Not approved yet
           ├─ ❌ Fails if: Already claimed
           │
           └─ ✅ Transfers: PDA → Freelancer (amount)
              ✅ Updates: milestones_claimed[index] = true

4️⃣ DOUBLE-CLAIM PREVENTION
─────────────────────────────
State tracking for each milestone:

┌────────────┬──────────┬─────────┬────────────┐
│ Milestone  │ Approved │ Claimed │ Can Claim? │
├────────────┼──────────┼─────────┼────────────┤
│     1      │  false   │  false  │     ❌     │
│     1      │  true    │  false  │     ✅     │
│     1      │  true    │  true   │     ❌     │ ← Double-claim blocked!
└────────────┴──────────┴─────────┴────────────┘

5️⃣ REFUND PROTECTION
──────────────────────────────
┌─────────────────────────────────────────┐
│  cancel_job()                           │
├─────────────────────────────────────────┤
│  require!(                              │
│    !escrow.milestones_approved          │
│      .iter()                            │
│      .any(|&approved| approved),        │
│    ErrorCode::CannotCancelAfterApproval │
│  );                                      │
└─────────────────────────────────────────┘
           │
           ├─ ✅ Allowed: No milestones approved yet
           ├─ ❌ Blocked: Any milestone approved
           │
           └─ If allowed: Refunds remaining SOL → Recruiter

6️⃣ ATOMIC ESCROW CREATION
────────────────────────────────
Single transaction does BOTH:

┌─────────────────────────────────────────┐
│  create_job_escrow()                    │
├─────────────────────────────────────────┤
│  1. Create PDA account                  │
│  2. Transfer FULL amount to PDA         │
│                                         │
│  ⚠️ Either BOTH succeed or BOTH fail   │
│     (atomic transaction)                │
└─────────────────────────────────────────┘

Benefits:
• No partial state (account exists but no funds)
• No funds without account
• Clean rollback on failure
```

---

## 4. PDA Derivation Consistency

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                      PDA DERIVATION ACROSS STACK                               │
└───────────────────────────────────────────────────────────────────────────────┘

SMART CONTRACT (Rust/Anchor)
─────────────────────────────
┌────────────────────────────────────────────────────────┐
│ File: contract/programs/contract/src/lib.rs           │
├────────────────────────────────────────────────────────┤
│                                                        │
│ fn hash_job_id(job_id: &str) -> [u8; 32] {           │
│     let mut hasher = Sha256::new();                   │
│     hasher.update(job_id.as_bytes());                 │
│     hasher.finalize().into()                          │
│ }                                                      │
│                                                        │
│ seeds = [                                              │
│   b"escrow",                  ← Literal "escrow"      │
│   recruiter.key().as_ref(),   ← Recruiter pubkey     │
│   &hash_job_id(&job_id)       ← SHA-256(job_id)      │
│ ]                                                      │
│                                                        │
└────────────────────────────────────────────────────────┘
                          │
                          │ MUST MATCH
                          │
                          ↓
FRONTEND (TypeScript)
─────────────────────────────
┌────────────────────────────────────────────────────────┐
│ File: frontend/src/lib/solana.ts                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│ async function hashJobIdAsync(jobId: string) {        │
│   const encoder = new TextEncoder();                  │
│   const data = encoder.encode(jobId);                 │
│   const hashBuffer = await                            │
│     globalThis.crypto.subtle.digest('SHA-256', data); │
│   return new Uint8Array(hashBuffer);                  │
│ }                                                      │
│                                                        │
│ export async function deriveEscrowPDA(                │
│   recruiterPubkey: PublicKey,                         │
│   jobId: string                                        │
│ ): Promise<[PublicKey, number]> {                     │
│   const jobIdHash = await hashJobIdAsync(jobId);      │
│   return PublicKey.findProgramAddressSync(            │
│     [                                                  │
│       Buffer.from("escrow"),  ← Literal "escrow"      │
│       recruiterPubkey.toBuffer(), ← Recruiter pubkey │
│       Buffer.from(jobIdHash),     ← SHA-256(job_id)  │
│     ],                                                 │
│     PROGRAM_ID                                         │
│   );                                                   │
│ }                                                      │
│                                                        │
└────────────────────────────────────────────────────────┘
                          │
                          │ MUST MATCH
                          │
                          ↓
BACKEND (TypeScript/Node.js)
─────────────────────────────
┌────────────────────────────────────────────────────────┐
│ File: http-backend/src/utils/solana-verification.ts   │
├────────────────────────────────────────────────────────┤
│                                                        │
│ async function hashJobIdAsync(jobId: string) {        │
│   const encoder = new TextEncoder();                  │
│   const data = encoder.encode(jobId);                 │
│   const hashBuffer = await                            │
│     globalThis.crypto.subtle.digest('SHA-256', data); │
│   return new Uint8Array(hashBuffer);                  │
│ }                                                      │
│                                                        │
│ async function deriveEscrowPDA(                       │
│   recruiterPubkey: PublicKey,                         │
│   jobId: string                                        │
│ ): Promise<[PublicKey, number]> {                     │
│   const jobIdHash = await hashJobIdAsync(jobId);      │
│   return PublicKey.findProgramAddressSync(            │
│     [                                                  │
│       Buffer.from("escrow"),  ← Literal "escrow"      │
│       recruiterPubkey.toBuffer(), ← Recruiter pubkey │
│       Buffer.from(jobIdHash),     ← SHA-256(job_id)  │
│     ],                                                 │
│     PROGRAM_ID                                         │
│   );                                                   │
│ }                                                      │
│                                                        │
└────────────────────────────────────────────────────────┘

✅ ALL THREE IMPLEMENTATIONS ARE IDENTICAL!

Example Derivation:
───────────────────
Input:
  recruiter_wallet = "9Hs2vEx3...LpY3Kf"
  job_id = "550e8400-e29b-41d4-a716-446655440000"

Step 1: Hash job_id
  SHA256("550e8400...") = 0x3d4f7c2e...9a1b (32 bytes)

Step 2: Combine seeds
  seeds = [
    "escrow",                    (6 bytes)
    0x8c5f1e... (recruiter key), (32 bytes)
    0x3d4f7c... (hashed job_id)  (32 bytes)
  ]

Step 3: Find PDA
  PDA = findProgramAddress(seeds, PROGRAM_ID)
  Result: "FYz8x9bN...kQ7Rm" (PDA address)
  
✅ Same PDA derived by all three components!
```

---

## 5. Data Consistency Flow

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                     ON-CHAIN ↔ OFF-CHAIN CONSISTENCY                          │
└───────────────────────────────────────────────────────────────────────────────┘

ON-CHAIN STATE (Solana Blockchain)
───────────────────────────────────
┌──────────────────────────────────────────┐
│  Escrow PDA for Job #550e8400            │
├──────────────────────────────────────────┤
│  recruiter: "9Hs2...3Kf"                 │
│  freelancer: "7xKm...8Pq9"               │
│  job_id: "550e8400-..."                  │
│  milestone_amounts: [1.5, 2.0, 1.5]      │
│  milestones_approved: [T, F, F]  ← M1 approved
│  milestones_claimed: [T, F, F]   ← M1 claimed
│  balance: 3.5 SOL (5.0 - 1.5)            │
└──────────────────────────────────────────┘
              │
              │ Backend verifies periodically
              │
              ↓
OFF-CHAIN STATE (PostgreSQL)
─────────────────────────────
┌──────────────────────────────────────────┐
│  Job Table                               │
├──────────────────────────────────────────┤
│  id: "550e8400-..."                      │
│  status: "active"                        │
│  recruiter_wallet: "9Hs2...3Kf"  ← Matches!
│  freelancer_wallet: "7xKm...8Pq9" ← Matches!
│  total_payment: 5.0                      │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  Staking Table                           │
├──────────────────────────────────────────┤
│  total_staked: 5.0            ← Matches!  │
│  total_released: 1.5          ← Matches!  │
│  wallet_address: "9Hs2...3Kf" ← Matches!  │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  Milestones Table                        │
├──────────────────────────────────────────┤
│  Milestone 1:                            │
│    status: "approved"         ← Matches!  │
│    payment_released: true     ← Matches!  │
│    payment_amount: 1.5        ← Matches!  │
│                                           │
│  Milestone 2:                            │
│    status: "pending"          ← Matches!  │
│    payment_released: false    ← Matches!  │
│    payment_amount: 2.0        ← Matches!  │
│                                           │
│  Milestone 3:                            │
│    status: "pending"          ← Matches!  │
│    payment_released: false    ← Matches!  │
│    payment_amount: 1.5        ← Matches!  │
└──────────────────────────────────────────┘

Verification Process:
─────────────────────
1. User action triggers blockchain transaction
2. Transaction confirmed on-chain
3. Frontend captures transaction signature
4. Frontend sends signature to backend
5. Backend verifies transaction on blockchain
6. Backend extracts on-chain state
7. Backend updates database ONLY if verification passes
8. Frontend refetches updated data

Result: Database always reflects verified on-chain state! ✅
```

---

## 6. Error Scenarios & Recovery

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                        ERROR HANDLING & RECOVERY                               │
└───────────────────────────────────────────────────────────────────────────────┘

SCENARIO 1: Transaction Fails
──────────────────────────────
User Action: Recruiter clicks "Approve Milestone"
              │
              ↓
Wallet Popup: User sees transaction
              │
              ├─ Option A: User rejects ❌
              │   → Transaction not sent
              │   → Database unchanged
              │   → User can retry
              │
              └─ Option B: Insufficient funds ❌
                  → Transaction fails
                  → Database unchanged
                  → User adds funds and retries

SCENARIO 2: Network Timeout
────────────────────────────
Transaction sent but confirmation times out
              │
              ├─ Frontend: Shows "Verifying..."
              │
              ├─ Backend: Checks blockchain
              │   └─ Transaction found? ✅
              │       → Update database
              │       → Return success
              │
              └─ Transaction not found? ❌
                  → Return error
                  → User can retry

SCENARIO 3: Blockchain Success, Backend Fails
──────────────────────────────────────────────
Transaction confirmed on-chain ✅
Backend update fails ❌ (database error, network, etc.)
              │
              ├─ On-chain state: milestone_approved[0] = true
              ├─ Database state: milestone.status = "submitted" (old state)
              │
              └─ Recovery:
                  1. User refreshes page
                  2. Frontend calls backend API
                  3. Backend re-verifies on-chain state
                  4. Detects mismatch
                  5. Updates database to match blockchain
                  6. Consistency restored ✅

SCENARIO 4: User Tries to Claim Unapproved Milestone
─────────────────────────────────────────────────────
Freelancer clicks "Claim Payment" before approval
              │
              ↓
Smart Contract Check:
              │
              └─ milestones_approved[index] == false ❌
                  │
                  ├─ Transaction fails with error:
                  │   "MilestoneNotApproved"
                  │
                  └─ Frontend shows: "This milestone has not been approved yet"
                      → No funds transferred
                      → No state changed

SCENARIO 5: Double-Claim Attempt
─────────────────────────────────
Freelancer tries to claim same milestone twice
              │
              ↓
Smart Contract Check:
              │
              └─ milestones_claimed[index] == true ❌
                  │
                  ├─ Transaction fails with error:
                  │   "MilestoneAlreadyClaimed"
                  │
                  └─ Frontend shows: "This milestone has already been claimed"
                      → No funds transferred
                      → No state changed

SCENARIO 6: Wrong Wallet Attempts Action
─────────────────────────────────────────

A. Freelancer tries to approve (recruiter-only action):
   │
   └─ Smart Contract: has_one = recruiter check fails ❌
       → Transaction rejected before execution

B. Recruiter tries to claim (freelancer-only action):
   │
   └─ Smart Contract: has_one = freelancer check fails ❌
       → Transaction rejected before execution

C. Random wallet tries anything:
   │
   └─ Smart Contract: Ownership checks fail ❌
       → Transaction rejected before execution

All scenarios protect funds! 🔒
```

---

**Document Version**: 1.0  
**Last Updated**: October 27, 2025  
**Status**: Complete

