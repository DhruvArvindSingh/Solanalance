# Solana Escrow Integration Guide

This guide explains how to integrate the Solana smart contract with your freelance platform.

## 📦 Installation

The required packages are already installed:
- `@coral-xyz/anchor` - Anchor framework for Solana
- `@solana/web3.js` - Solana JavaScript SDK
- `@solana/wallet-adapter-react` - React wallet integration

## 🏗️ Architecture

### Files Created

1. **`src/lib/freelance_platform_idl.json`** - Smart contract IDL (Interface Definition)
2. **`src/lib/solana.ts`** - Core Solana utilities and program connection
3. **`src/lib/escrow-operations.ts`** - All escrow operations (fund, approve, claim, etc.)
4. **`src/hooks/useEscrow.tsx`** - React hook for easy integration

## 🎯 When to Call Each Function

### 1. **Fund Job** - Lock funds in escrow

**When**: Recruiter selects a freelancer and clicks "Hire & Fund Job"

**Example Usage**:
```tsx
import { useEscrow } from "@/hooks/useEscrow";

function HireFreelancerButton() {
  const { fundJobEscrow, isLoading } = useEscrow();

  const handleHire = async () => {
    const result = await fundJobEscrow(
      "job-uuid-123",                    // Job ID from your database
      "FreelancerWalletAddress...",      // Freelancer's Solana wallet
      [1.5, 2.0, 1.5],                   // 3 milestones in SOL
      (result) => {
        // Success callback - update your database
        updateJobInDatabase({
          jobId: "job-uuid-123",
          status: "in_progress",
          escrowAddress: result.escrowPDA,
          txSignature: result.txSignature,
        });
      }
    );
  };

  return (
    <button onClick={handleHire} disabled={isLoading}>
      {isLoading ? "Processing..." : "Hire & Fund Job"}
    </button>
  );
}
```

### 2. **Approve Milestone** - Recruiter approves work

**When**: Recruiter reviews milestone submission and approves

**Example Usage**:
```tsx
import { useEscrow } from "@/hooks/useEscrow";

function ApproveMilestoneButton({ jobId, milestoneIndex }: Props) {
  const { approveMilestonePayment, isLoading } = useEscrow();

  const handleApprove = async () => {
    await approveMilestonePayment(
      jobId,
      milestoneIndex,  // 0, 1, or 2
      (result) => {
        // Update database - mark milestone as approved
        updateMilestoneInDatabase({
          jobId,
          milestoneIndex,
          approved: true,
          txSignature: result.txSignature,
        });
      }
    );
  };

  return (
    <button onClick={handleApprove} disabled={isLoading}>
      Approve Milestone {milestoneIndex + 1}
    </button>
  );
}
```

### 3. **Claim Milestone** - Freelancer claims payment

**When**: Freelancer sees an approved milestone and claims payment

**Example Usage**:
```tsx
import { useEscrow } from "@/hooks/useEscrow";

function ClaimPaymentButton({ jobId, recruiterWallet, milestoneIndex }: Props) {
  const { claimMilestonePayment, isLoading } = useEscrow();

  const handleClaim = async () => {
    await claimMilestonePayment(
      jobId,
      recruiterWallet,  // Recruiter's wallet address
      milestoneIndex,   // 0, 1, or 2
      (result) => {
        // Update database - mark milestone as claimed
        updateMilestoneInDatabase({
          jobId,
          milestoneIndex,
          claimed: true,
          txSignature: result.txSignature,
        });
      }
    );
  };

  return (
    <button onClick={handleClaim} disabled={isLoading}>
      Claim Payment
    </button>
  );
}
```

### 4. **Verify Funding** - Check if job is funded

**When**: Display escrow status or freelancer verifies funds before starting

**Example Usage**:
```tsx
import { useEscrow } from "@/hooks/useEscrow";
import { useEffect, useState } from "react";

function EscrowStatus({ recruiterWallet, jobId }: Props) {
  const { verifyEscrowFunding, isLoading } = useEscrow();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    verifyEscrowFunding(recruiterWallet, jobId, 5.0).then(setStatus);
  }, [recruiterWallet, jobId]);

  if (isLoading) return <div>Checking escrow...</div>;
  if (!status) return null;

  return (
    <div>
      {status.verified ? (
        <div className="text-green-600">
          ✓ Escrow Funded: {status.balance} SOL
          <div>Milestones: {status.milestoneAmounts.join(", ")} SOL</div>
        </div>
      ) : (
        <div className="text-red-600">
          ✗ Not Funded: {status.error}
        </div>
      )}
    </div>
  );
}
```

### 5. **Cancel Job** - Refund recruiter

**When**: Recruiter cancels job before any milestone is approved

**Example Usage**:
```tsx
import { useEscrow } from "@/hooks/useEscrow";

function CancelJobButton({ jobId }: Props) {
  const { cancelJobEscrow, isLoading } = useEscrow();

  const handleCancel = async () => {
    await cancelJobEscrow(jobId, (result) => {
      // Update database - mark job as cancelled
      updateJobInDatabase({
        jobId,
        status: "cancelled",
        txSignature: result.txSignature,
      });
    });
  };

  return (
    <button onClick={handleCancel} disabled={isLoading}>
      Cancel Job & Refund
    </button>
  );
}
```

### 6. **Get Milestone Status** - Display progress

**When**: Show milestone progress in project workspace

**Example Usage**:
```tsx
import { useEscrow } from "@/hooks/useEscrow";
import { useEffect, useState } from "react";

function MilestoneProgress({ recruiterWallet, jobId }: Props) {
  const { fetchMilestoneStatus, isLoading } = useEscrow();
  const [milestones, setMilestones] = useState([]);

  useEffect(() => {
    fetchMilestoneStatus(recruiterWallet, jobId).then(setMilestones);
  }, [recruiterWallet, jobId]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {milestones?.map((milestone) => (
        <div key={milestone.index}>
          Milestone {milestone.index + 1}: {milestone.amount} SOL
          <span className={
            milestone.claimed ? "text-green-600" :
            milestone.approved ? "text-blue-600" : "text-gray-600"
          }>
            {milestone.status}
          </span>
        </div>
      ))}
    </div>
  );
}
```

## 🔧 Configuration

### Environment Variables

Add to your `.env` file:

```env
# Solana RPC Endpoint
# For development (devnet)
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com

# For production (mainnet)
# VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Or use a paid RPC for better performance:
# VITE_SOLANA_RPC_URL=https://your-custom-rpc-url.com
```

### Program ID

The program is deployed at:
```
BZicjRE3jR6YVWYof7pGSFwqJpJVEBZkY7xzfUimrjhm
```

If you redeploy the contract, update `PROGRAM_ID` in `src/lib/solana.ts`.

## 🎨 Integration with Existing Components

### Update `ProjectWorkspace.tsx`

Add milestone actions:

```tsx
import { useEscrow } from "@/hooks/useEscrow";

function ProjectWorkspace() {
  const { 
    approveMilestonePayment, 
    claimMilestonePayment, 
    fetchMilestoneStatus 
  } = useEscrow();

  // Add buttons for approve/claim based on user role
  // Connect to your existing project data
}
```

### Update `JobDetail.tsx`

Add "Hire & Fund" button:

```tsx
import { useEscrow } from "@/hooks/useEscrow";

function JobDetail() {
  const { fundJobEscrow, isLoading } = useEscrow();

  const handleHireFreelancer = async (freelancerId) => {
    // Get freelancer's wallet from your database
    const freelancerWallet = await getFreelancerWallet(freelancerId);
    
    await fundJobEscrow(
      job.id,
      freelancerWallet,
      [milestone1Amount, milestone2Amount, milestone3Amount]
    );
  };
}
```

### Update `RecruiterDashboard.tsx`

Show escrow status for active projects:

```tsx
import { verifyJobFunding, getMilestoneStatus } from "@/lib/escrow-operations";

function RecruiterDashboard() {
  // Fetch escrow status for each active job
  // Display milestone progress
}
```

## 📊 Database Updates

After each blockchain transaction, update your database:

### After Funding Job
```typescript
await prisma.project.update({
  where: { id: projectId },
  data: {
    escrowAddress: result.escrowPDA,
    escrowTxSignature: result.txSignature,
    status: "active",
  },
});
```

### After Approving Milestone
```typescript
await prisma.milestone.update({
  where: { id: milestoneId },
  data: {
    status: "approved",
    reviewedAt: new Date(),
    approveTxSignature: result.txSignature,
  },
});
```

### After Claiming Milestone
```typescript
await prisma.milestone.update({
  where: { id: milestoneId },
  data: {
    paymentReleased: true,
    claimTxSignature: result.txSignature,
  },
});
```

## 🔒 Security Considerations

1. **Always verify wallet connection** before calling escrow functions
2. **Store transaction signatures** in your database for audit trail
3. **Validate amounts** on the backend before creating escrow
4. **Check escrow status** before allowing milestone claims
5. **Handle errors gracefully** - blockchain transactions can fail

## 🐛 Error Handling

All functions return detailed error messages:

```typescript
const result = await fundJobEscrow(...);

if (!result.success) {
  switch (result.error) {
    case "Job ID must be 50 characters or less":
      // Handle invalid job ID
      break;
    case "All milestone amounts must be greater than 0":
      // Handle invalid amounts
      break;
    default:
      // Handle general errors
      console.error(result.error);
  }
}
```

## 📝 Testing

### Test on Devnet First

1. Use devnet RPC: `https://api.devnet.solana.com`
2. Get devnet SOL from faucet: `solana airdrop 2`
3. Test all flows before deploying to mainnet

### Test Scenarios

- ✅ Fund job with 3 milestones
- ✅ Approve milestone 1
- ✅ Freelancer claims milestone 1
- ✅ Approve milestones 2 & 3
- ✅ Claim remaining milestones
- ✅ Try to cancel after approval (should fail)
- ✅ Verify escrow balance at each stage

## 🚀 Production Checklist

- [ ] Update RPC URL to mainnet
- [ ] Test all functions on devnet
- [ ] Verify program deployment on mainnet
- [ ] Set up transaction monitoring
- [ ] Add wallet balance checks before transactions
- [ ] Implement transaction retry logic
- [ ] Add loading states in UI
- [ ] Handle wallet disconnection gracefully

## 💡 Tips

1. **Use `useEscrow` hook** in components for automatic loading states and toasts
2. **Cache escrow data** to reduce RPC calls
3. **Show transaction links** to Solana Explorer for transparency
4. **Display estimated fees** before transactions
5. **Add confirmation dialogs** for critical operations

## 🔗 Useful Links

- [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet)
- [Solana Explorer (Mainnet)](https://explorer.solana.com/)
- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)

## 📞 Support

If you encounter issues:
1. Check console for detailed error messages
2. Verify wallet is connected
3. Check RPC endpoint is responding
4. Ensure sufficient SOL for transaction fees
5. Verify program is deployed on the correct network


