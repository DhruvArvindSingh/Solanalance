# Wallet Address Tracking Implementation

## Overview
Added `recruiter_wallet` and `freelancer_wallet` columns to the Job table to track the actual wallet addresses used for escrow transactions.

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)

Added two new optional fields to the `Job` model:
```prisma
recruiterWallet      String?         @map("recruiter_wallet")
freelancerWallet     String?         @map("freelancer_wallet")
```

**Migration File**: `20251027151448_add_wallet_addresses_to_jobs/migration.sql`

### 2. Backend Updates

#### A. Escrow Verification (`src/routes/escrow.ts`)

**When**: Recruiter stakes funds in escrow  
**Action**: Update job with both wallet addresses

```typescript
await req.prisma.job.update({
    where: { id: jobId },
    data: {
        status: 'active',
        selectedFreelancerId: freelancerId,
        recruiterWallet: verification.recruiterWallet || '',  // ✅ NEW
        freelancerWallet: verification.freelancerWallet || '' // ✅ NEW
    }
});
```

**Source**: Wallet addresses come from blockchain verification of the escrow PDA

#### B. Application Creation (`src/routes/applications.ts`)

**When**: Freelancer applies for a job  
**Action**: Update job with freelancer's wallet address

```typescript
// Update job with freelancer wallet if provided
if (walletAddress) {
    await req.prisma.job.update({
        where: { id: jobId },
        data: { freelancerWallet: walletAddress }  // ✅ NEW
    });
}
```

**Source**: Wallet address from application form (freelancer provides when applying)

### 3. Frontend Updates

#### A. Project Interface (`ProjectWorkspace.tsx`)

Updated the `Project` interface to include wallet addresses:

```typescript
job: {
    // ... existing fields
    recruiter_wallet: string | null;  // ✅ NEW
    freelancer_wallet: string | null; // ✅ NEW
}
```

#### B. Data Fetching (`ProjectWorkspace.tsx`)

**Before**: Fetched recruiter profile separately to get wallet address
```typescript
const { data: recruiterProfile } = await apiClient.profile.getById(projectData.recruiter_id);
if (recruiterProfile?.wallet_address) {
    setRecruiterWallet(recruiterProfile.wallet_address);
}
```

**After**: Use wallet address directly from job data
```typescript
if (projectData.job?.recruiter_wallet) {
    setRecruiterWallet(projectData.job.recruiter_wallet);
}
```

**Benefits**:
- ✅ No extra API call needed
- ✅ Uses the actual wallet that was used for escrow
- ✅ More reliable and accurate

## Data Flow

### Freelancer Application Flow
```
1. Freelancer applies for job
   ↓
2. Application includes walletAddress
   ↓
3. Job.freelancer_wallet = walletAddress
   ↓
4. Stored in database
```

### Escrow Funding Flow
```
1. Recruiter selects freelancer
   ↓
2. Recruiter stakes funds in escrow
   ↓
3. Blockchain verification extracts wallet addresses from escrow PDA
   ↓
4. Job.recruiter_wallet = escrow.recruiterWallet
5. Job.freelancer_wallet = escrow.freelancerWallet (confirmation)
   ↓
6. Stored in database
```

### Verification Flow
```
1. Frontend loads project
   ↓
2. Gets job data (includes recruiter_wallet)
   ↓
3. Passes recruiter_wallet to VerifyFundsButton
   ↓
4. Uses recruiter_wallet to derive escrow PDA
   ↓
5. Verifies funds on blockchain
```

## Why This Matters

### Problem Solved
Previously, the system assumed the recruiter's profile wallet was the same as the wallet used for escrow. This could cause issues if:
- Recruiter has multiple wallets
- Recruiter changes their profile wallet
- Recruiter uses a different wallet for a specific job

### Solution
Now we track the **actual wallet addresses used in the escrow transaction**, ensuring:
- ✅ Correct PDA derivation for fund verification
- ✅ Accurate tracking of which wallet funded which job
- ✅ No dependency on profile wallet (which can change)
- ✅ Historical accuracy (wallet addresses are immutable per job)

## Database Migration

To apply the schema changes:

```bash
cd http-backend
npx prisma migrate deploy
npx prisma generate
```

## Testing Checklist

- [ ] Freelancer applies for job → `freelancer_wallet` is set
- [ ] Recruiter stakes funds → Both `recruiter_wallet` and `freelancer_wallet` are set
- [ ] Frontend loads project → Uses `recruiter_wallet` from job data
- [ ] Verify Funds button → Works correctly with stored wallet address
- [ ] PDA derivation → Matches the escrow account on blockchain

## Notes

- Wallet addresses are stored as nullable strings to support existing jobs
- Existing jobs without wallet addresses will need to be updated manually or through a data migration
- The wallet addresses are set once and should not change (immutable per job)
