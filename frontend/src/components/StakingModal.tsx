import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { apiClient } from "@/integrations/apiClient/client";
import { useAuth } from "@/hooks/useAuth";
import { fundJob } from "@/lib/escrow-operations";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Coins, AlertCircle, Loader2, CheckCircle } from "lucide-react";

interface StakingModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    jobTitle: string;
    freelancerName: string;
    freelancerId: string; // Database UUID for backend
    freelancerWallet: string; // Solana wallet address for smart contract
    totalPayment: number;
    onSuccess: () => void;
}

export const StakingModal = ({
    isOpen,
    onClose,
    jobId,
    jobTitle,
    freelancerName,
    freelancerId,
    freelancerWallet,
    totalPayment,
    onSuccess,
}: StakingModalProps) => {
    const { user } = useAuth();
    const { connection } = useConnection();
    const wallet = useWallet();
    const { publicKey, connected } = wallet;

    // Contract requires 100% of payment to be locked in escrow
    const [isStaking, setIsStaking] = useState(false);
    const [balance, setBalance] = useState<number | null>(null);

    useEffect(() => {
        if (connected && publicKey) {
            fetchBalance();
        }
    }, [connected, publicKey]);

    const fetchBalance = async () => {
        if (!publicKey) return;

        try {
            const bal = await connection.getBalance(publicKey);
            setBalance(bal / LAMPORTS_PER_SOL);
        } catch (error) {
            console.error("Error fetching balance:", error);
        }
    };

    const handleStake = async () => {
        if (!user || !publicKey || !connected) {
            toast.error("Please connect your wallet first");
            return;
        }

        if (balance !== null && totalPayment > balance) {
            toast.error(`Insufficient balance. Required: ${totalPayment.toFixed(4)} SOL`);
            return;
        }

        setIsStaking(true);

        try {
            // TODO: Fetch actual milestone amounts from job_stages table in database
            // For now, evenly divide the total payment into 3 milestones
            const milestoneAmount = totalPayment / 3;
            const milestones: [number, number, number] = [
                milestoneAmount,
                milestoneAmount,
                milestoneAmount
            ];

            console.log("Creating escrow with milestones:", milestones);
            console.log("✅ Using freelancer wallet address:", freelancerWallet);

            // Validate wallet address
            if (!freelancerWallet || freelancerWallet.length < 32) {
                throw new Error("Invalid freelancer wallet address. Please ensure the freelancer provided a valid Solana wallet.");
            }

            // Call the actual Solana smart contract to create escrow and lock funds
            const result = await fundJob(
                { publicKey, signTransaction: wallet.signTransaction, signAllTransactions: wallet.signAllTransactions },
                jobId,
                freelancerWallet, // ✅ Using freelancer's Solana wallet address from application
                milestones
            );

            if (!result.success) {
                throw new Error(result.error || "Failed to create escrow");
            }

            if (result.txSignature === "already-created") {
                console.log("✅ Escrow already exists from previous transaction!");
                console.log("Escrow PDA:", result.escrowPDA);
                console.log("Message:", result.message);
            } else {
                console.log("✅ Escrow created on-chain!");
                console.log("Escrow PDA:", result.escrowPDA);
                console.log("Transaction:", result.txSignature);
            }

            // Always verify and store transaction data in backend
            // Backend will check for duplicates and verify on-chain state
            console.log("Verifying escrow with backend...");

            try {
                const response = await fetch('http://localhost:3000/api/escrow/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        jobId,
                        escrowPDA: result.escrowPDA,
                        transactionSignature: result.txSignature,
                        freelancerId,
                        totalStaked: totalPayment
                    })
                });

                const verifyResult = await response.json();

                if (response.ok) {
                    if (verifyResult.alreadyExists) {
                        console.log("✓ Transaction already recorded in database");
                        toast.success("Escrow verified! Transaction already recorded.");
                    } else {
                        console.log("✓ Escrow verified and recorded");
                        toast.success("Success! Funds verified and locked in escrow.");
                    }
                } else {
                    console.error("Backend verification failed:", verifyResult.error);
                    toast.warning("Funds locked on-chain, but verification failed. Please use 'Verify Funds' button.");
                }
            } catch (backendError) {
                console.error("Backend communication error:", backendError);
                toast.warning("Funds locked on-chain, but couldn't sync with backend. Please use 'Verify Funds' button.");
            }

            onSuccess();
        } catch (error: any) {
            console.error("Error creating escrow:", error);
            toast.error(error.message || "Failed to create escrow. Please try again.");
        } finally {
            setIsStaking(false);
        }
    };

    const insufficientBalance = balance !== null && totalPayment > balance;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center space-x-2">
                        <Coins className="w-6 h-6 text-secondary" />
                        <span>Lock Funds in Escrow</span>
                    </DialogTitle>
                    <DialogDescription>
                        Lock funds in smart contract escrow to start working with {freelancerName}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Job Info */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Project</p>
                        <p className="text-lg font-semibold">{jobTitle}</p>
                    </div>

                    {/* Payment Info */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Project Value:</span>
                            <span className="font-semibold">{totalPayment.toFixed(2)} SOL</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Amount to Lock in Escrow:</span>
                            <span className="font-semibold text-secondary">
                                {totalPayment.toFixed(2)} SOL (100%)
                            </span>
                        </div>
                        {balance !== null && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Your Balance:</span>
                                <span className={`font-semibold ${insufficientBalance ? "text-destructive" : ""}`}>
                                    {balance.toFixed(4)} SOL
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Escrow Details */}
                    <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-lg space-y-2">
                        <div className="flex items-center space-x-2 text-secondary">
                            <Coins className="w-5 h-5" />
                            <span className="font-semibold">Smart Contract Escrow</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Your {totalPayment.toFixed(2)} SOL will be locked in a secure Solana smart contract escrow account.
                            Funds are automatically released to the freelancer as they complete each milestone.
                        </p>
                    </div>

                    {/* Wallet Connection Alert */}
                    {!connected && (
                        <Alert className="border-warning/30 bg-warning/10">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Please connect your Solana wallet to stake funds
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Insufficient Balance Alert */}
                    {insufficientBalance && (
                        <Alert className="border-destructive/30 bg-destructive/10">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Insufficient balance. You need at least {totalPayment.toFixed(2)} SOL + gas fees
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isStaking}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleStake}
                            disabled={!connected || isStaking || insufficientBalance}
                            className="flex-1 bg-primary"
                        >
                            {isStaking ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating Escrow...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Lock {totalPayment.toFixed(2)} SOL in Escrow
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

