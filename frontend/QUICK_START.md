# Quick Start - Solana Escrow Integration

## 🚀 5-Minute Integration Guide

### Step 1: Import the Hook
```tsx
import { useEscrow } from "@/hooks/useEscrow";
```

### Step 2: Use in Your Component
```tsx
function YourComponent() {
  const { fundJobEscrow, isLoading } = useEscrow();
  
  const handleFund = async () => {
    await fundJobEscrow(
      "job-123",                    // Job ID
      "FreelancerWalletAddress",    // Freelancer wallet
      [1.0, 1.5, 2.0],              // 3 milestones in SOL
      (result) => {
        console.log("Success:", result.txSignature);
        // Update your database here
      }
    );
  };
  
  return <button onClick={handleFund} disabled={isLoading}>Fund Job</button>;
}
```

That's it! 🎉

## 📋 All Operations Cheat Sheet

### 1. Fund Job (Recruiter)
```tsx
const { fundJobEscrow } = useEscrow();

await fundJobEscrow(jobId, freelancerWallet, [1, 1.5, 2]);
```

### 2. Approve Milestone (Recruiter)
```tsx
const { approveMilestonePayment } = useEscrow();

await approveMilestonePayment(jobId, 0); // Approve milestone 1
```

### 3. Claim Payment (Freelancer)
```tsx
const { claimMilestonePayment } = useEscrow();

await claimMilestonePayment(jobId, recruiterWallet, 0); // Claim milestone 1
```

### 4. Verify Funding (Anyone)
```tsx
const { verifyEscrowFunding } = useEscrow();

const status = await verifyEscrowFunding(recruiterWallet, jobId);
console.log("Funded:", status.verified);
console.log("Balance:", status.balance, "SOL");
```

### 5. Cancel Job (Recruiter)
```tsx
const { cancelJobEscrow } = useEscrow();

await cancelJobEscrow(jobId);
```

### 6. Get Milestone Status (Anyone)
```tsx
const { fetchMilestoneStatus } = useEscrow();

const milestones = await fetchMilestoneStatus(recruiterWallet, jobId);
// Returns: [{ index: 0, amount: 1.5, approved: true, claimed: false, status: "approved" }, ...]
```

## 🎯 Common Patterns

### Pattern 1: Fund Job on Freelancer Selection
```tsx
// In JobApplicants.tsx or JobDetail.tsx
import { useEscrow } from "@/hooks/useEscrow";

function SelectFreelancerButton({ application }) {
  const { fundJobEscrow, isLoading } = useEscrow();
  
  const handleSelect = async () => {
    // Get milestone amounts from job data
    const milestones = [
      job.milestone1Amount,
      job.milestone2Amount,
      job.milestone3Amount,
    ];
    
    await fundJobEscrow(
      job.id,
      application.freelancer.walletAddress,
      milestones,
      async (result) => {
        // Update database
        await fetch("/api/jobs/fund", {
          method: "POST",
          body: JSON.stringify({
            jobId: job.id,
            escrowAddress: result.escrowPDA,
            txSignature: result.txSignature,
          }),
        });
        // Redirect to project workspace
        navigate(`/project/${job.id}`);
      }
    );
  };
  
  return <Button onClick={handleSelect} disabled={isLoading}>Select & Fund</Button>;
}
```

### Pattern 2: Milestone Actions in Project Workspace
```tsx
// In ProjectWorkspace.tsx
import { useEscrow } from "@/hooks/useEscrow";
import { useState, useEffect } from "react";

function ProjectWorkspace() {
  const { 
    approveMilestonePayment, 
    claimMilestonePayment,
    fetchMilestoneStatus 
  } = useEscrow();
  
  const [milestones, setMilestones] = useState([]);
  const isRecruiter = user.role === "recruiter";
  
  useEffect(() => {
    fetchMilestoneStatus(project.recruiterWallet, project.jobId)
      .then(setMilestones);
  }, [project]);
  
  return (
    <div>
      {milestones.map(milestone => (
        <div key={milestone.index}>
          <h3>Milestone {milestone.index + 1}</h3>
          <p>{milestone.amount} SOL - {milestone.status}</p>
          
          {isRecruiter && !milestone.approved && (
            <Button onClick={() => approveMilestonePayment(project.jobId, milestone.index)}>
              Approve
            </Button>
          )}
          
          {!isRecruiter && milestone.approved && !milestone.claimed && (
            <Button onClick={() => claimMilestonePayment(
              project.jobId, 
              project.recruiterWallet, 
              milestone.index
            )}>
              Claim Payment
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Pattern 3: Verify Before Starting Work
```tsx
// In FreelancerDashboard.tsx or JobAcceptance component
import { useEscrow } from "@/hooks/useEscrow";
import { useEffect, useState } from "react";

function JobVerification({ job }) {
  const { verifyEscrowFunding } = useEscrow();
  const [verified, setVerified] = useState(false);
  
  useEffect(() => {
    verifyEscrowFunding(job.recruiterWallet, job.id)
      .then(status => setVerified(status.verified));
  }, [job]);
  
  return (
    <div>
      {verified ? (
        <div className="text-green-600">
          ✓ Job is funded and ready to start!
        </div>
      ) : (
        <div className="text-orange-600">
          ⚠ Waiting for recruiter to fund the job...
        </div>
      )}
    </div>
  );
}
```

### Pattern 4: Display Transaction Link
```tsx
function TransactionLink({ signature }: { signature: string }) {
  const network = import.meta.env.VITE_SOLANA_RPC_URL?.includes("devnet") 
    ? "devnet" 
    : "mainnet-beta";
  
  const link = `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
  
  return (
    <a href={link} target="_blank" rel="noopener noreferrer">
      View on Solana Explorer →
    </a>
  );
}
```

## 🔑 Environment Setup

Create `.env` file:
```env
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

## ✅ Checklist Before Going Live

- [ ] Users can connect Solana wallet
- [ ] Users can set wallet address in profile
- [ ] Job funding flow works end-to-end
- [ ] Milestone approval works
- [ ] Milestone claiming works
- [ ] Transaction signatures saved to database
- [ ] Error messages displayed to users
- [ ] Loading states shown during transactions
- [ ] Tested on devnet
- [ ] Switch to mainnet RPC URL

## 🐛 Troubleshooting

### "Wallet not connected"
→ Make sure user has connected their Solana wallet using `<WalletMultiButton />`

### "Insufficient balance"
→ User needs SOL in their wallet for transaction fees (~0.000005 SOL)

### "Job ID too long"
→ Job ID must be 50 characters or less (database UUID is fine)

### "Milestone not approved"
→ Recruiter must approve milestone before freelancer can claim

### "Cannot cancel after approval"
→ Jobs can only be cancelled before any milestone is approved

## 📚 Full Documentation

For complete details, see:
- **SOLANA_INTEGRATION_GUIDE.md** - Full integration guide with examples
- **SOLANA_IMPLEMENTATION_SUMMARY.md** - Technical implementation details

## 🎮 Try the Demo

Run the example component:
```tsx
// Add to your router
import EscrowExample from "@/components/EscrowExample";

<Route path="/escrow-demo" element={<EscrowExample />} />
```

Then navigate to `/escrow-demo` to test all operations interactively.

## 🤝 Need Help?

Check these resources:
1. Console logs - All functions log detailed errors
2. Solana Explorer - View transaction details
3. Example component - See working implementation
4. Integration guide - Step-by-step instructions

Happy coding! 🚀


