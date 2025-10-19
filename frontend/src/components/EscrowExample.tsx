/**
 * Example Component: Escrow Integration Demo
 * 
 * This component demonstrates how to integrate Solana escrow operations
 * into your freelance platform. You can adapt this code to your existing
 * components like JobDetail, ProjectWorkspace, etc.
 */

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEscrow } from "@/hooks/useEscrow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

export default function EscrowExample() {
    const wallet = useWallet();
    const {
        fundJobEscrow,
        approveMilestonePayment,
        claimMilestonePayment,
        verifyEscrowFunding,
        cancelJobEscrow,
        fetchMilestoneStatus,
        isLoading,
    } = useEscrow();

    // Example job data (replace with your actual data)
    const [jobId, setJobId] = useState("test-job-123");
    const [freelancerWallet, setFreelancerWallet] = useState("");
    const [recruiterWallet, setRecruiterWallet] = useState("");
    const [milestones, setMilestones] = useState<[number, number, number]>([1, 1.5, 2]);
    const [escrowStatus, setEscrowStatus] = useState<any>(null);
    const [milestoneStatuses, setMilestoneStatuses] = useState<any[]>([]);

    // Check escrow status on component mount
    useEffect(() => {
        if (recruiterWallet && jobId) {
            refreshEscrowStatus();
        }
    }, [recruiterWallet, jobId]);

    const refreshEscrowStatus = async () => {
        if (!recruiterWallet) return;

        const status = await verifyEscrowFunding(recruiterWallet, jobId);
        setEscrowStatus(status);

        const milestoneStatus = await fetchMilestoneStatus(recruiterWallet, jobId);
        setMilestoneStatuses(milestoneStatus || []);
    };

    // ===== RECRUITER ACTIONS =====

    const handleFundJob = async () => {
        const result = await fundJobEscrow(
            jobId,
            freelancerWallet,
            milestones,
            async (result) => {
                console.log("Job funded:", result);

                // TODO: Update your database here
                // await updateJobInDatabase({
                //   jobId,
                //   status: "in_progress",
                //   escrowAddress: result.escrowPDA,
                //   txSignature: result.txSignature,
                // });

                await refreshEscrowStatus();
            }
        );

        if (result?.success) {
            setRecruiterWallet(wallet.publicKey?.toBase58() || "");
        }
    };

    const handleApproveMilestone = async (milestoneIndex: number) => {
        await approveMilestonePayment(
            jobId,
            milestoneIndex,
            async (result) => {
                console.log("Milestone approved:", result);

                // TODO: Update your database
                // await updateMilestoneInDatabase({
                //   jobId,
                //   milestoneIndex,
                //   approved: true,
                //   txSignature: result.txSignature,
                // });

                await refreshEscrowStatus();
            }
        );
    };

    const handleCancelJob = async () => {
        await cancelJobEscrow(jobId, async (result) => {
            console.log("Job cancelled:", result);

            // TODO: Update your database
            // await updateJobInDatabase({
            //   jobId,
            //   status: "cancelled",
            //   txSignature: result.txSignature,
            // });

            await refreshEscrowStatus();
        });
    };

    // ===== FREELANCER ACTIONS =====

    const handleClaimMilestone = async (milestoneIndex: number) => {
        if (!recruiterWallet) {
            alert("Recruiter wallet not set");
            return;
        }

        await claimMilestonePayment(
            jobId,
            recruiterWallet,
            milestoneIndex,
            async (result) => {
                console.log("Milestone claimed:", result);

                // TODO: Update your database
                // await updateMilestoneInDatabase({
                //   jobId,
                //   milestoneIndex,
                //   claimed: true,
                //   txSignature: result.txSignature,
                // });

                await refreshEscrowStatus();
            }
        );
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Solana Escrow Integration Demo</h1>
                <WalletMultiButton />
            </div>

            {!wallet.connected ? (
                <Card>
                    <CardContent className="p-6">
                        <p className="text-center text-muted-foreground">
                            Please connect your Solana wallet to test escrow operations
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Setup Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>1. Setup Job Details</CardTitle>
                            <CardDescription>
                                Configure job parameters for testing
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="jobId">Job ID</Label>
                                <Input
                                    id="jobId"
                                    value={jobId}
                                    onChange={(e) => setJobId(e.target.value)}
                                    placeholder="Enter job ID (max 50 chars)"
                                    maxLength={50}
                                />
                            </div>

                            <div>
                                <Label htmlFor="freelancerWallet">Freelancer Wallet Address</Label>
                                <Input
                                    id="freelancerWallet"
                                    value={freelancerWallet}
                                    onChange={(e) => setFreelancerWallet(e.target.value)}
                                    placeholder="Enter freelancer's Solana wallet address"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="milestone1">Milestone 1 (SOL)</Label>
                                    <Input
                                        id="milestone1"
                                        type="number"
                                        step="0.1"
                                        value={milestones[0]}
                                        onChange={(e) => setMilestones([parseFloat(e.target.value), milestones[1], milestones[2]])}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="milestone2">Milestone 2 (SOL)</Label>
                                    <Input
                                        id="milestone2"
                                        type="number"
                                        step="0.1"
                                        value={milestones[1]}
                                        onChange={(e) => setMilestones([milestones[0], parseFloat(e.target.value), milestones[2]])}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="milestone3">Milestone 3 (SOL)</Label>
                                    <Input
                                        id="milestone3"
                                        type="number"
                                        step="0.1"
                                        value={milestones[2]}
                                        onChange={(e) => setMilestones([milestones[0], milestones[1], parseFloat(e.target.value)])}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <strong>Total:</strong> {milestones.reduce((a, b) => a + b, 0).toFixed(2)} SOL
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recruiter Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>2. Recruiter Actions</CardTitle>
                            <CardDescription>
                                Fund job and approve milestones (requires recruiter wallet)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleFundJob}
                                    disabled={isLoading || !freelancerWallet}
                                >
                                    Fund Job & Create Escrow
                                </Button>
                                <Button
                                    onClick={handleCancelJob}
                                    variant="destructive"
                                    disabled={isLoading || !escrowStatus?.verified}
                                >
                                    Cancel Job & Refund
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Escrow Status */}
                    {escrowStatus && (
                        <Card>
                            <CardHeader>
                                <CardTitle>3. Escrow Status</CardTitle>
                                <CardDescription>Current state of the escrow</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {escrowStatus.verified ? (
                                    <>
                                        <div className="flex items-center gap-2 text-green-600">
                                            <CheckCircle2 className="w-5 h-5" />
                                            <span className="font-semibold">Escrow Active</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <strong>Balance:</strong> {escrowStatus.balance?.toFixed(4)} SOL
                                            </div>
                                            <div>
                                                <strong>Recruiter:</strong> {escrowStatus.recruiter?.slice(0, 8)}...
                                            </div>
                                            <div>
                                                <strong>Freelancer:</strong> {escrowStatus.freelancer?.slice(0, 8)}...
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2 text-orange-600">
                                        <AlertCircle className="w-5 h-5" />
                                        <span>Not funded yet</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Milestone Actions */}
                    {milestoneStatuses.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>4. Milestone Progress</CardTitle>
                                <CardDescription>
                                    Approve (recruiter) or claim (freelancer) milestones
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {milestoneStatuses.map((milestone, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-4 border rounded-lg"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <div className="font-semibold">
                                                    Milestone {milestone.index + 1}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {milestone.amount} SOL
                                                </div>
                                            </div>
                                            <Badge
                                                variant={
                                                    milestone.claimed
                                                        ? "default"
                                                        : milestone.approved
                                                            ? "secondary"
                                                            : "outline"
                                                }
                                            >
                                                {milestone.claimed ? (
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                ) : milestone.approved ? (
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                ) : (
                                                    <Clock className="w-3 h-3 mr-1" />
                                                )}
                                                {milestone.status}
                                            </Badge>
                                        </div>

                                        <div className="flex gap-2">
                                            {!milestone.approved && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApproveMilestone(milestone.index)}
                                                    disabled={isLoading}
                                                >
                                                    Approve (Recruiter)
                                                </Button>
                                            )}
                                            {milestone.approved && !milestone.claimed && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleClaimMilestone(milestone.index)}
                                                    disabled={isLoading}
                                                >
                                                    Claim Payment (Freelancer)
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Refresh Button */}
                    <div className="flex justify-center">
                        <Button onClick={refreshEscrowStatus} variant="outline" disabled={isLoading}>
                            Refresh Escrow Status
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}


