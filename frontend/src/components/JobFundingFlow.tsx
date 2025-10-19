/**
 * Job Funding Flow Component
 * 
 * This component demonstrates the complete flow for funding a job:
 * 1. Recruiter selects freelancer
 * 2. Signs ONE transaction that:
 *    - Creates escrow PDA
 *    - Stakes FULL job amount (100%)
 * 3. Frontend verifies PDA creation and full staking
 * 4. Sends transaction + PDA to backend for verification
 * 5. Backend verifies and updates database
 * 6. Job is allocated to freelancer
 */

import { useState } from "react";
import { useEscrowWithVerification } from "@/hooks/useEscrowWithVerification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface JobFundingFlowProps {
    job: {
        id: string;
        title: string;
        milestone1Amount: number;
        milestone2Amount: number;
        milestone3Amount: number;
    };
    freelancer: {
        id: string;
        name: string;
        walletAddress: string;
    };
    onSuccess?: (result: any) => void;
}

export default function JobFundingFlow({ job, freelancer, onSuccess }: JobFundingFlowProps) {
    const { fundJobEscrow, isLoading } = useEscrowWithVerification();
    const [status, setStatus] = useState<"idle" | "signing" | "verifying" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [result, setResult] = useState<any>(null);

    const milestones: [number, number, number] = [
        job.milestone1Amount,
        job.milestone2Amount,
        job.milestone3Amount,
    ];
    const totalAmount = milestones.reduce((a, b) => a + b, 0);

    const handleFundJob = async () => {
        setStatus("signing");
        setErrorMessage("");

        const fundingResult = await fundJobEscrow(
            job.id,
            freelancer.walletAddress,
            milestones,
            (data) => {
                setStatus("success");
                setResult(data);
                onSuccess?.(data);
            }
        );

        if (!fundingResult.success) {
            setStatus("error");
            setErrorMessage(fundingResult.error || "Unknown error occurred");
        }
    };

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Fund Job: {job.title}</CardTitle>
                <CardDescription>
                    Select freelancer and fund the complete job amount
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Freelancer Info */}
                <div className="p-4 border rounded-lg bg-muted">
                    <h3 className="font-semibold mb-2">Selected Freelancer</h3>
                    <p className="text-sm">{freelancer.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {freelancer.walletAddress.slice(0, 8)}...{freelancer.walletAddress.slice(-8)}
                    </p>
                </div>

                {/* Payment Breakdown */}
                <div className="space-y-2">
                    <h3 className="font-semibold">Payment Breakdown</h3>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span>Milestone 1:</span>
                            <span className="font-mono">{milestones[0]} SOL</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Milestone 2:</span>
                            <span className="font-mono">{milestones[1]} SOL</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Milestone 3:</span>
                            <span className="font-mono">{milestones[2]} SOL</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t font-semibold">
                            <span>Total Job Amount (100%):</span>
                            <span className="font-mono">{totalAmount} SOL</span>
                        </div>
                    </div>
                </div>

                {/* Important Notice */}
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Important:</strong> You will sign ONE transaction that:
                        <ul className="list-disc ml-5 mt-2 space-y-1">
                            <li>Creates an escrow account (PDA)</li>
                            <li>Stakes the FULL job amount ({totalAmount} SOL)</li>
                        </ul>
                        <p className="mt-2">
                            The job will only be allocated after backend verification confirms both steps succeeded.
                        </p>
                    </AlertDescription>
                </Alert>

                {/* Status Messages */}
                {status === "signing" && (
                    <Alert>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <AlertDescription>
                            <strong>Step 1:</strong> Please sign the transaction in your wallet...
                        </AlertDescription>
                    </Alert>
                )}

                {status === "verifying" && (
                    <Alert>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <AlertDescription>
                            <strong>Step 2:</strong> Verifying PDA creation and full staking...
                            <br />
                            <strong>Step 3:</strong> Backend is verifying on-chain...
                        </AlertDescription>
                    </Alert>
                )}

                {status === "success" && result && (
                    <Alert className="border-green-500 bg-green-50">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                            <strong>Success!</strong> Job funded and verified.
                            <ul className="list-disc ml-5 mt-2 space-y-1">
                                <li>✓ Escrow PDA created</li>
                                <li>✓ {totalAmount} SOL staked in escrow</li>
                                <li>✓ Backend verified on-chain</li>
                                <li>✓ Database updated</li>
                                <li>✓ Job allocated to {freelancer.name}</li>
                            </ul>
                            <p className="mt-2 text-xs font-mono">
                                TX: {result.txSignature?.slice(0, 16)}...
                            </p>
                        </AlertDescription>
                    </Alert>
                )}

                {status === "error" && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Error:</strong> {errorMessage}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Action Button */}
                <Button
                    onClick={handleFundJob}
                    disabled={isLoading || status === "success"}
                    className="w-full"
                    size="lg"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : status === "success" ? (
                        <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Job Funded Successfully
                        </>
                    ) : (
                        `Fund Job & Stake ${totalAmount} SOL`
                    )}
                </Button>

                {/* Flow Explanation */}
                <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
                    <p className="font-semibold">How it works:</p>
                    <ol className="list-decimal ml-5 space-y-1">
                        <li>You sign ONE transaction that creates PDA + stakes full amount</li>
                        <li>Frontend verifies PDA was created and amount was staked</li>
                        <li>Transaction signature + PDA sent to backend</li>
                        <li>Backend verifies everything on-chain</li>
                        <li>Database updated & job allocated ONLY after verification</li>
                    </ol>
                </div>
            </CardContent>
        </Card>
    );
}


