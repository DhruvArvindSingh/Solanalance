import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { apiClient } from "@/integrations/apiClient/client";
import { useAuth } from "@/hooks/useAuth";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Coins, AlertCircle, Loader2, CheckCircle } from "lucide-react";

interface StakingModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    jobTitle: string;
    freelancerName: string;
    freelancerId: string;
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
    totalPayment,
    onSuccess,
}: StakingModalProps) => {
    const { user } = useAuth();
    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected } = useWallet();

    const minimumStake = totalPayment * 0.2;
    const [stakeAmount, setStakeAmount] = useState(minimumStake);
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

        if (stakeAmount < minimumStake) {
            toast.error(`Minimum stake is ${minimumStake.toFixed(2)} SOL`);
            return;
        }

        if (balance !== null && stakeAmount > balance) {
            toast.error("Insufficient balance");
            return;
        }

        setIsStaking(true);

        try {
            // In a real implementation, this would send SOL to a program-controlled escrow account
            // For this demo, we'll simulate the transaction

            // Create a dummy transaction (in production, this would be to an escrow PDA)
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: publicKey, // In production, this would be the escrow account
                    lamports: Math.floor(stakeAmount * LAMPORTS_PER_SOL),
                })
            );

            // Send transaction
            const signature = await sendTransaction(transaction, connection);

            // Wait for confirmation
            await connection.confirmTransaction(signature, "confirmed");

            // Create project and staking through backend API
            const { data: stakingData, error: stakingError } = await apiClient.staking.create({
                jobId,
                freelancerId,
                totalStaked: stakeAmount,
                walletAddress: publicKey.toBase58(),
                transactionSignature: signature,
            });

            if (stakingError) throw new Error(stakingError);

            toast.success("Staking successful! Project started.");
            onSuccess();
        } catch (error: any) {
            console.error("Error staking:", error);
            toast.error(error.message || "Failed to stake. Please try again.");
        } finally {
            setIsStaking(false);
        }
    };

    const handleSliderChange = (value: number[]) => {
        setStakeAmount(value[0]);
    };

    const insufficientBalance = balance !== null && stakeAmount > balance;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] glass border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center space-x-2">
                        <Coins className="w-6 h-6 text-secondary" />
                        <span>Stake Funds</span>
                    </DialogTitle>
                    <DialogDescription>
                        Stake funds to start the project with {freelancerName}
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
                            <span className="text-muted-foreground">Minimum Required (20%):</span>
                            <span className="font-semibold text-warning">
                                {minimumStake.toFixed(2)} SOL
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

                    {/* Stake Amount Input */}
                    <div className="space-y-3">
                        <Label htmlFor="stakeAmount">Stake Amount (SOL)</Label>
                        <div className="relative">
                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                id="stakeAmount"
                                type="number"
                                step="0.01"
                                min={minimumStake}
                                max={totalPayment}
                                value={stakeAmount}
                                onChange={(e) => setStakeAmount(parseFloat(e.target.value) || 0)}
                                className="pl-11 text-lg font-semibold"
                            />
                        </div>

                        {/* Slider */}
                        <div className="pt-2">
                            <Slider
                                min={minimumStake}
                                max={totalPayment}
                                step={0.01}
                                value={[stakeAmount]}
                                onValueChange={handleSliderChange}
                                className="w-full"
                            />
                            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                <span>Min: {minimumStake.toFixed(2)}</span>
                                <span>Max: {totalPayment.toFixed(2)}</span>
                            </div>
                        </div>
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
                                Insufficient balance. You need at least {stakeAmount.toFixed(2)} SOL
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Info Alert */}
                    <Alert className="border-primary/30 bg-primary/10">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                            Your stake will be held in escrow and automatically released to the freelancer
                            as they complete each milestone. You can stake more than the minimum for
                            additional security.
                        </AlertDescription>
                    </Alert>

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
                            disabled={!connected || isStaking || insufficientBalance || stakeAmount < minimumStake}
                            className="flex-1 bg-gradient-solana"
                        >
                            {isStaking ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Staking...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Stake {stakeAmount.toFixed(2)} SOL
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

