import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { verifyEscrowFunds } from "@/lib/escrow-operations";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface VerifyFundsButtonProps {
    jobId: string;
    jobTitle: string;
    recruiterWallet: string;
    freelancerWallet?: string;
    expectedAmount?: number;
    variant?: "default" | "outline" | "ghost";
    size?: "default" | "sm" | "lg" | "icon";
    showIcon?: boolean;
}

export function VerifyFundsButton({
    jobId,
    jobTitle,
    recruiterWallet,
    freelancerWallet,
    expectedAmount,
    variant = "outline",
    size = "sm",
    showIcon = true
}: VerifyFundsButtonProps) {
    console.log("VerifyFundsButton props:", {
        jobId,
        jobTitle,
        recruiterWallet,
        freelancerWallet,
        expectedAmount,
        variant,
        size,
        showIcon
    });
    const [isVerifying, setIsVerifying] = useState(false);
    const [showResultDialog, setShowResultDialog] = useState(false);
    const [verificationResult, setVerificationResult] = useState<any>(null);

    const handleVerify = async () => {
        console.log("Verifying funds for job:", jobId);
        console.log("Using recruiter wallet:", recruiterWallet);
        console.log("Using freelancer wallet:", freelancerWallet);
        console.log("Expected amount:", expectedAmount);

        if (!recruiterWallet) {
            toast.error("Recruiter wallet address not found");
            return;
        }

        setIsVerifying(true);

        try {
            console.log("Verifying funds for job:", jobId);
            console.log("Using recruiter wallet:", recruiterWallet);

            // Verify on-chain (no wallet connection needed - read-only)
            const result = await verifyEscrowFunds(
                recruiterWallet,
                jobId,
                freelancerWallet,
                expectedAmount
            );

            console.log("Verification result:", result);

            if (result.verified) {
                // Also sync with backend
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
                            transactionSignature: 'verified-on-chain',
                            freelancerId: freelancerWallet,
                            totalStaked: result.totalStaked || expectedAmount || 0
                        })
                    });

                    const backendResult = await response.json();

                    if (response.ok) {
                        console.log("Backend sync successful:", backendResult);
                        toast.success("Funds verified and synced with database!");
                    } else {
                        console.warn("Backend sync failed:", backendResult.error);
                        toast.warning("Funds verified on-chain but database sync failed");
                    }
                } catch (backendError) {
                    console.error("Backend sync error:", backendError);
                    toast.warning("Funds verified on-chain but couldn't sync with backend");
                }

                setVerificationResult(result);
                setShowResultDialog(true);
                toast.success("✓ Escrow funds verified successfully!");
            } else {
                setVerificationResult(result);
                setShowResultDialog(true);
                toast.error(result.error || "Verification failed");
            }

        } catch (error: any) {
            console.error("Verification error:", error);
            toast.error(error.message || "Failed to verify funds");
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <>
            <Button
                onClick={handleVerify}
                disabled={isVerifying}
                variant={variant}
                size={size}
                className="gap-2"
            >
                {isVerifying ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying...
                    </>
                ) : (
                    <>
                        {showIcon && <Shield className="h-4 w-4" />}
                        Verify Funds
                    </>
                )}
            </Button>

            <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {verificationResult?.verified ? (
                                <>
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    Escrow Verified
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    Verification Failed
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Escrow verification for: {jobTitle}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {verificationResult?.verified ? (
                            <>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Escrow PDA:</span>
                                        <span className="text-sm font-mono text-green-700">
                                            {verificationResult.escrowPDA?.slice(0, 8)}...
                                            {verificationResult.escrowPDA?.slice(-8)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Total Staked:</span>
                                        <span className="text-sm font-semibold text-green-700">
                                            {verificationResult.balance?.toFixed(4)} SOL
                                        </span>
                                    </div>

                                    {verificationResult.unclaimedAmount !== undefined && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Unclaimed Required:</span>
                                            <span className="text-sm font-semibold text-blue-700">
                                                {verificationResult.unclaimedAmount?.toFixed(4)} SOL
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Recruiter:</span>
                                        <span className="text-sm font-mono text-gray-700">
                                            {verificationResult.recruiter?.slice(0, 8)}...
                                        </span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Freelancer:</span>
                                        <span className="text-sm font-mono text-gray-700">
                                            {verificationResult.freelancer?.slice(0, 8)}...
                                        </span>
                                    </div>

                                    {verificationResult.milestoneAmounts && (
                                        <div className="pt-2 border-t border-green-200">
                                            <span className="text-sm text-gray-600 block mb-2">
                                                Milestone Breakdown:
                                            </span>
                                            {verificationResult.milestoneAmounts.map((amount: number, index: number) => (
                                                <div key={index} className="flex justify-between text-sm">
                                                    <span className="text-gray-600">
                                                        Milestone {index + 1}:
                                                    </span>
                                                    <span className="font-medium">
                                                        {amount.toFixed(4)} SOL
                                                        {verificationResult.milestonesClaimed?.[index] && (
                                                            <span className="ml-2 text-green-600">✓ Claimed</span>
                                                        )}
                                                        {!verificationResult.milestonesClaimed?.[index] &&
                                                            verificationResult.milestonesApproved?.[index] && (
                                                                <span className="ml-2 text-blue-600">✓ Approved</span>
                                                            )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => window.open(
                                            `https://explorer.solana.com/address/${verificationResult.escrowPDA}?cluster=devnet`,
                                            '_blank'
                                        )}
                                    >
                                        View on Explorer
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => setShowResultDialog(false)}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-sm text-red-700">
                                        {verificationResult?.error || "Could not verify escrow funds"}
                                    </p>
                                    {verificationResult?.escrowPDA && (
                                        <p className="text-xs text-gray-600 mt-2">
                                            PDA: {verificationResult.escrowPDA}
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => setShowResultDialog(false)}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

