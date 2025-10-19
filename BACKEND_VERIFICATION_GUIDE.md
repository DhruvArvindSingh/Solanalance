# Backend Escrow Verification Guide

## 🔒 Security Flow Overview

This implementation ensures **trustless verification** by validating all blockchain transactions on the backend before updating the database.

### The Complete Flow:

```
1. Frontend: Recruiter signs transaction → Creates PDA & stakes SOL
2. Frontend: Gets transaction signature from blockchain
3. Frontend: Sends transaction signature to backend
4. Backend: Verifies transaction exists on blockchain
5. Backend: Verifies PDA was created by recruiter's wallet
6. Backend: Verifies full amount is staked in escrow
7. Backend: Only then updates database (job status, project, milestones)
8. Frontend: Receives confirmation and shows success
```

## 🏗️ Architecture

### Backend Components

1. **`/http-backend/src/utils/solana-verification.ts`**
   - Blockchain verification utilities
   - PDA derivation
   - Escrow account parsing
   - Transaction signature verification

2. **`/http-backend/src/routes/escrow.ts`**
   - API endpoints for escrow operations
   - `/api/escrow/verify-funding` - Verify job funding
   - `/api/escrow/verify-approval` - Verify milestone approval
   - `/api/escrow/verify-claim` - Verify milestone claim
   - `/api/escrow/status/:jobId` - Get escrow status

### Frontend Components

1. **`/frontend/src/hooks/useEscrowWithVerification.tsx`**
   - Enhanced React hook with backend verification
   - Two-step process: blockchain → backend verification
   - Automatic error handling and notifications

2. **`/frontend/src/lib/api-helpers.ts`**
   - API client functions to call backend verification endpoints

## 📋 Complete Job Funding Flow

### Step 1: Recruiter Selects Freelancer

```tsx
// In JobApplicants.tsx or JobDetail.tsx
import { useEscrowWithVerification } from "@/hooks/useEscrowWithVerification";

function SelectFreelancerButton({ job, application }) {
  const { fundJobEscrow, isLoading } = useEscrowWithVerification();
  
  const handleSelect = async () => {
    const result = await fundJobEscrow(
      job.id,                                    // Job ID (UUID)
      application.freelancer.walletAddress,      // Freelancer's Solana wallet
      [1.5, 2.0, 1.5],                          // 3 milestones in SOL
      (data) => {
        // Success! Database is now updated
        console.log("Job funded and verified:", data);
        navigate(`/project/${job.id}`);
      }
    );
  };
  
  return (
    <Button onClick={handleSelect} disabled={isLoading}>
      {isLoading ? "Processing..." : "Select & Fund Job"}
    </Button>
  );
}
```

### What Happens Behind the Scenes:

```typescript
// 1. Frontend calls fundJobEscrow()
// 2. Creates escrow on Solana blockchain
// 3. Gets transaction signature
// 4. Calls backend: POST /api/escrow/verify-funding
// 5. Backend verifies:
//    - Transaction exists on blockchain ✓
//    - PDA created by recruiter's wallet ✓
//    - Full amount staked ✓
//    - Freelancer wallet matches ✓
// 6. Backend updates:
//    - Job status → "in_progress"
//    - Creates Project record
//    - Creates Milestone records
//    - Creates Staking record
//    - Creates Transaction record
//    - Sends notification to freelancer
// 7. Frontend receives success response
```

## 🔐 Backend Verification Process

### 1. Verify Escrow Funding

**Endpoint:** `POST /api/escrow/verify-funding`

**Request:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "recruiterWallet": "CMvVjcRz1CfmbLJ2RRUsDBYXh4bRcWttpkNY7FREHLUK",
  "freelancerWallet": "8YWqVpPKuXRp1mZZLxdTYJqvFWLYm5Lsh3YRgJwYT5JL",
  "txSignature": "5J7x...",
  "expectedTotal": 5.0,
  "milestoneAmounts": [1.5, 2.0, 1.5]
}
```

**Backend Verification Steps:**
```typescript
// 1. Verify user is the recruiter
if (job.recruiterId !== userId) {
  return error("Unauthorized");
}

// 2. Verify transaction signature exists on blockchain
const txStatus = await connection.getSignatureStatus(txSignature);
if (!txStatus || txStatus.err) {
  return error("Transaction not found or failed");
}

// 3. Calculate expected PDA address
const [escrowPDA] = deriveEscrowPDA(recruiterPubkey, jobId);

// 4. Verify escrow account exists
const accountInfo = await connection.getAccountInfo(escrowPDA);
if (!accountInfo) {
  return error("Escrow account not found");
}

// 5. Verify account is owned by our program
if (accountInfo.owner !== PROGRAM_ID) {
  return error("Invalid escrow account");
}

// 6. Parse escrow account data
const escrowData = parseEscrowAccount(accountInfo.data);

// 7. Verify recruiter matches
if (escrowData.recruiter !== recruiterWallet) {
  return error("Recruiter mismatch");
}

// 8. Verify freelancer matches
if (escrowData.freelancer !== freelancerWallet) {
  return error("Freelancer mismatch");
}

// 9. Verify job ID matches
if (escrowData.jobId !== jobId) {
  return error("Job ID mismatch");
}

// 10. Verify balance is sufficient
const balance = await connection.getBalance(escrowPDA);
const totalMilestones = milestoneAmounts.reduce((a, b) => a + b);
if (balance < totalMilestones) {
  return error("Insufficient balance");
}

// ✅ All checks passed - update database
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Escrow verified and job activated",
  "data": {
    "job": { "id": "...", "status": "in_progress" },
    "project": { "id": "...", "status": "active" },
    "escrowAddress": "9xQeW...",
    "balance": 5.0,
    "milestones": [...]
  }
}
```

### 2. Verify Milestone Approval

**Endpoint:** `POST /api/escrow/verify-approval`

**Request:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "milestoneIndex": 0,
  "txSignature": "3K8y..."
}
```

**Backend Actions:**
- Verifies transaction on blockchain
- Fetches escrow account data
- Checks `milestonesApproved[0] === true`
- Updates milestone status in database to "approved"
- Notifies freelancer

### 3. Verify Milestone Claim

**Endpoint:** `POST /api/escrow/verify-claim`

**Request:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "milestoneIndex": 0,
  "txSignature": "7R9m..."
}
```

**Backend Actions:**
- Verifies transaction on blockchain
- Fetches escrow account data
- Checks `milestonesClaimed[0] === true`
- Updates milestone status to "completed"
- Marks payment as released
- Creates transaction record
- Updates staking total released
- Notifies recruiter

## 🛠️ Backend Setup

### 1. Install Dependencies

```bash
cd http-backend
npm install @coral-xyz/anchor @solana/web3.js
```

### 2. Environment Variables

Add to `.env`:
```env
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com

# For production:
# SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### 3. Start Backend Server

```bash
cd http-backend
npm run dev
```

The escrow verification endpoints will be available at:
- `http://localhost:3001/api/escrow/verify-funding`
- `http://localhost:3001/api/escrow/verify-approval`
- `http://localhost:3001/api/escrow/verify-claim`
- `http://localhost:3001/api/escrow/status/:jobId`

## 🎯 Frontend Integration

### Use the Enhanced Hook

```tsx
// Replace useEscrow with useEscrowWithVerification
import { useEscrowWithVerification } from "@/hooks/useEscrowWithVerification";

function YourComponent() {
  const {
    fundJobEscrow,           // Includes backend verification
    approveMilestonePayment, // Includes backend verification
    claimMilestonePayment,   // Includes backend verification
    isLoading,
  } = useEscrowWithVerification();
  
  // Use exactly the same as before - verification is automatic!
}
```

### The Difference

**Old `useEscrow`:**
- Only creates blockchain transaction
- You manually call backend API to update database
- Risk: Database could be out of sync with blockchain

**New `useEscrowWithVerification`:**
- Creates blockchain transaction
- Automatically verifies on backend
- Backend updates database only after verification
- Guaranteed: Database always matches blockchain state

## 🔍 Verification Features

### 1. PDA Ownership Verification
Ensures the escrow account is owned by the correct Solana program:
```typescript
if (accountInfo.owner !== PROGRAM_ID) {
  return error("Invalid escrow");
}
```

### 2. Wallet Verification
Ensures the recruiter who funded the escrow is the correct user:
```typescript
if (escrowData.recruiter !== recruiterWallet) {
  return error("Unauthorized");
}
```

### 3. Balance Verification
Ensures the full amount is staked:
```typescript
const balance = await connection.getBalance(escrowPDA);
if (balance < expectedTotal) {
  return error("Insufficient balance");
}
```

### 4. Transaction Verification
Ensures the transaction actually succeeded on blockchain:
```typescript
const status = await connection.getSignatureStatus(signature);
if (!status || status.err) {
  return error("Transaction failed");
}
```

## 🚨 Error Handling

### Common Errors

**"Escrow account not found"**
- The PDA doesn't exist on blockchain
- Transaction may have failed
- Wrong network (devnet vs mainnet)

**"Insufficient balance"**
- Recruiter didn't stake enough SOL
- Transaction partially failed
- Network issue during funding

**"Recruiter mismatch"**
- Different wallet funded the escrow
- Potential security issue

**"Transaction not found"**
- Invalid transaction signature
- Wrong network
- Transaction not yet confirmed

## 📊 Database Updates

After successful verification, the backend updates:

### Jobs Table
```sql
UPDATE jobs SET
  status = 'in_progress',
  selected_freelancer_id = '<freelancer_id>'
WHERE id = '<job_id>';
```

### Projects Table
```sql
INSERT INTO projects (job_id, recruiter_id, freelancer_id, status)
VALUES ('<job_id>', '<recruiter_id>', '<freelancer_id>', 'active');
```

### Milestones Table
```sql
INSERT INTO milestones (project_id, stage_id, payment_amount, status)
VALUES (...);
```

### Staking Table
```sql
INSERT INTO staking (
  project_id, recruiter_id, wallet_address,
  total_staked, transaction_signature
)
VALUES (...);
```

### Transactions Table
```sql
INSERT INTO transactions (
  from_user_id, to_user_id, project_id,
  type, amount, wallet_signature, status
)
VALUES (...);
```

## ✅ Testing

### Test the Complete Flow

1. **Fund Job:**
```bash
# Frontend calls blockchain
POST /api/escrow/verify-funding

# Check database
SELECT * FROM jobs WHERE id = '<job_id>';
# Should show status = 'in_progress'

SELECT * FROM projects WHERE job_id = '<job_id>';
# Should have a new project

SELECT * FROM milestones WHERE project_id = '<project_id>';
# Should have 3 milestones
```

2. **Approve Milestone:**
```bash
POST /api/escrow/verify-approval

SELECT * FROM milestones WHERE id = '<milestone_id>';
# Should show status = 'approved'
```

3. **Claim Milestone:**
```bash
POST /api/escrow/verify-claim

SELECT * FROM milestones WHERE id = '<milestone_id>';
# Should show payment_released = true, status = 'completed'

SELECT * FROM transactions WHERE milestone_id = '<milestone_id>';
# Should have transaction record
```

## 🎯 Summary

### Security Benefits

✅ **Trustless** - Backend verifies blockchain state  
✅ **Atomic** - Database updates only after blockchain confirmation  
✅ **Audit Trail** - All transaction signatures stored  
✅ **Prevention** - Can't fake escrow funding  
✅ **Integrity** - Database always matches blockchain  

### User Experience

✅ **Seamless** - Automatic verification in background  
✅ **Fast** - Parallel blockchain & backend processing  
✅ **Reliable** - Rollback on verification failure  
✅ **Transparent** - Clear error messages  

This implementation ensures your platform maintains data integrity while providing a smooth user experience!


