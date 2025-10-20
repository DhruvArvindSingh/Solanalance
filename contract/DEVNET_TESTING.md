# Testing on Devnet

## Overview

The Solana Freelance Platform contract is deployed on Devnet with Program ID:
```
xXBP5XebxLWY2bG3691JeTbCRmcjjncAm5n7jMvVevm
```

## Why Localnet is Recommended for Testing

Devnet has strict rate limits on airdrops, which can cause test failures. For reliable automated testing, **use Localnet** (default configuration):

```bash
anchor test
```

This runs all 12 tests successfully in ~5 seconds.

## Testing on Devnet (Manual Method)

If you need to test against the deployed Devnet program, follow these steps:

### Step 1: Update Configuration

Edit `Anchor.toml`:
```toml
[provider]
cluster = "Devnet"
wallet = "~/.config/solana/id.json"
```

### Step 2: Get Test Wallets

The tests generate random keypairs for testing. To fund them:

1. **Option A: Use Solana Faucet (Web)**
   - Visit https://faucet.solana.com
   - Request airdrops for your test addresses
   - Note: Limited to a few requests per day

2. **Option B: Use CLI Faucet**
   ```bash
   solana airdrop 2 <WALLET_ADDRESS> --url devnet
   ```

3. **Option C: Modify Test to Use Funded Wallet**
   
   Edit `tests/freelance_platform.ts` to use a pre-funded wallet:
   ```typescript
   // Instead of:
   recruiter = Keypair.generate();
   
   // Use a funded wallet:
   const recruiterSecretKey = [/* your secret key array */];
   recruiter = Keypair.fromSecretKey(Uint8Array.from(recruiterSecretKey));
   ```

### Step 3: Run Tests

```bash
anchor test --skip-deploy
```

The `--skip-deploy` flag uses the already-deployed program on Devnet.

## Current Test Status

### ✅ Localnet: All Tests Passing (12/12)
```
✔ Creates job escrow and locks funds
✔ Prevents creating escrow with invalid milestone amounts
✔ Prevents non-recruiter from approving milestone
✔ Recruiter approves milestone 0
✔ Prevents double approval of same milestone
✔ Prevents claiming unapproved milestone
✔ Freelancer claims approved milestone 0
✔ Prevents double claiming same milestone
✔ Prevents wrong freelancer from claiming
✔ Completes full milestone workflow
✔ Tests cancel job functionality
✔ Prevents canceling after approval
```

### ⚠️ Devnet: Rate Limited
Devnet airdrops are rate-limited and may fail with:
```
429 Too Many Requests: You've either reached your airdrop limit today 
or the airdrop faucet has run dry
```

## Verifying Devnet Deployment

To verify the program is deployed on Devnet:

```bash
solana program show xXBP5XebxLWY2bG3691JeTbCRmcjjncAm5n7jMvVevm --url devnet
```

Expected output:
```
Program Id: xXBP5XebxLWY2bG3691JeTbCRmcjjncAm5n7jMvVevm
Owner: BPFLoaderUpgradeab1e11111111111111111111111
ProgramData Address: <address>
Authority: <your-wallet>
Last Deployed In Slot: <slot-number>
Data Length: <bytes>
Balance: <SOL>
```

## Testing Individual Functions on Devnet

If you want to test specific functions without the full test suite:

### Create a Simple Test Script

Create `tests/devnet-simple.ts`:
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FreelancePlatform } from "../target/types/freelance_platform";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createHash } from "crypto";

// Your funded wallet
const FUNDED_WALLET_SECRET = [/* your secret key */];

function hashJobId(jobId: string): Buffer {
  return createHash("sha256").update(jobId).digest();
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.FreelancePlatform as Program<FreelancePlatform>;
  
  // Use funded wallet
  const recruiter = Keypair.fromSecretKey(Uint8Array.from(FUNDED_WALLET_SECRET));
  const freelancer = Keypair.generate();
  
  const jobId = "devnet-test-" + Date.now();
  const [escrowPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"),
      recruiter.publicKey.toBuffer(),
      hashJobId(jobId),
    ],
    program.programId
  );
  
  console.log("Creating escrow on Devnet...");
  const tx = await program.methods
    .createJobEscrow(
      jobId,
      freelancer.publicKey,
      [
        new anchor.BN(1 * LAMPORTS_PER_SOL),
        new anchor.BN(1 * LAMPORTS_PER_SOL),
        new anchor.BN(1 * LAMPORTS_PER_SOL),
      ]
    )
    .accounts({
      escrow: escrowPDA,
      recruiter: recruiter.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([recruiter])
    .rpc();
  
  console.log("✅ Escrow created! Transaction:", tx);
  console.log("Escrow PDA:", escrowPDA.toBase58());
  
  // Fetch and display escrow data
  const escrow = await program.account.escrow.fetch(escrowPDA);
  console.log("\nEscrow Data:");
  console.log("- Recruiter:", escrow.recruiter.toBase58());
  console.log("- Freelancer:", escrow.freelancer.toBase58());
  console.log("- Job ID:", escrow.jobId);
  console.log("- Milestones:", escrow.milestoneAmounts.map(a => a.toString()));
}

main().catch(console.error);
```

Run it:
```bash
ts-node tests/devnet-simple.ts
```

## Recommended Testing Strategy

1. **Development**: Use Localnet for fast iteration
   ```bash
   anchor test
   ```

2. **Integration**: Test on Devnet periodically
   ```bash
   # Deploy to devnet
   anchor deploy --provider.cluster devnet
   
   # Manual testing with funded wallets
   anchor test --skip-deploy --provider.cluster devnet
   ```

3. **Production**: Deploy to Mainnet only after thorough Devnet testing
   ```bash
   anchor deploy --provider.cluster mainnet
   ```

## Troubleshooting

### Issue: "Insufficient lamports"
**Solution**: Airdrop didn't complete. Wait 10 seconds and try again, or use a pre-funded wallet.

### Issue: "429 Too Many Requests"
**Solution**: Devnet rate limit hit. Wait 24 hours or use Localnet for testing.

### Issue: "Account not found"
**Solution**: Program not deployed to Devnet. Deploy first:
```bash
anchor deploy --provider.cluster devnet
```

### Issue: "ConstraintSeeds error"
**Solution**: Ensure test uses SHA-256 hashing for job_id:
```typescript
import { createHash } from "crypto";

function hashJobId(jobId: string): Buffer {
  return createHash("sha256").update(jobId).digest();
}
```

## Program Upgrade Authority

The program is currently deployed with upgrade authority set to:
```
~/.config/solana/id.json
```

To transfer authority or freeze the program:
```bash
# Transfer authority
solana program set-upgrade-authority xXBP5XebxLWY2bG3691JeTbCRmcjjncAm5n7jMvVevm \
  --new-upgrade-authority <NEW_AUTHORITY> \
  --url devnet

# Freeze program (make immutable)
solana program set-upgrade-authority xXBP5XebxLWY2bG3691JeTbCRmcjjncAm5n7jMvVevm \
  --final \
  --url devnet
```

## Next Steps

- ✅ All tests pass on Localnet
- ✅ Program deployed to Devnet with correct Program ID
- ⏭️ Integrate with frontend using Program ID `xXBP5XebxLWY2bG3691JeTbCRmcjjncAm5n7jMvVevm`
- ⏭️ Set up continuous testing pipeline using Localnet
- ⏭️ Plan Mainnet deployment after frontend integration testing

