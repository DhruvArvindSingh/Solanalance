import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RatingModal } from "@/components/RatingModal";
import { ProjectMessages } from "@/components/ProjectMessages";
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    Coins,
    Upload,
    XCircle,
    AlertCircle,
    Loader2,
    Download,
    ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Milestone {
    id: string;
    stage_number: number;
    status: string;
    submission_description: string | null;
    submission_files: string[] | null;
    submission_links: string[] | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    reviewer_comments: string | null;
    payment_released: boolean;
    payment_amount: number;
    stage: {
        name: string;
        description: string | null;
    };
}

interface Project {
    id: string;
    job_id: string;
    recruiter_id: string;
    freelancer_id: string;
    current_stage: number;
    status: string;
    started_at: string;
    job: {
        title: string;
        description: string;
        total_payment: number;
    };
    staking: {
        total_staked: number;
        total_released: number;
    };
}

export default function ProjectWorkspace() {
    const { id } = useParams<{ id: string }>();
    const { user, userRole } = useAuth();
    const navigate = useNavigate();
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    const [project, setProject] = useState<Project | null>(null);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);

    // Submission state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionDescription, setSubmissionDescription] = useState("");
    const [submissionLinks, setSubmissionLinks] = useState("");

    // Review state
    const [isReviewing, setIsReviewing] = useState(false);
    const [reviewComments, setReviewComments] = useState("");
    const [reviewingMilestoneId, setReviewingMilestoneId] = useState<string | null>(null);

    // Rating state
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [hasRated, setHasRated] = useState(false);
    const [counterpartyInfo, setCounterpartyInfo] = useState<{ name: string; id: string } | null>(null);

    useEffect(() => {
        if (!id || !user) {
            navigate("/");
            return;
        }

        fetchProjectData();
    }, [id, user]);

    const fetchProjectData = async () => {
        if (!id || !user) return;

        try {
            setLoading(true);

            // Fetch project with job and staking info
            const { data: projectData, error: projectError } = await supabase
                .from("projects")
                .select(`
          id,
          job_id,
          recruiter_id,
          freelancer_id,
          current_stage,
          status,
          started_at,
          jobs (
            title,
            description,
            total_payment
          ),
          staking (
            total_staked,
            total_released
          )
        `)
                .eq("id", id)
                .single();

            if (projectError) throw projectError;

            // Check if user has access to this project
            if (
                projectData.recruiter_id !== user.id &&
                projectData.freelancer_id !== user.id
            ) {
                toast.error("You don't have access to this project");
                navigate("/");
                return;
            }

            setProject(projectData as any);

            // Fetch milestones with stage info
            const { data: milestonesData, error: milestonesError } = await supabase
                .from("milestones")
                .select(`
          id,
          stage_number,
          status,
          submission_description,
          submission_files,
          submission_links,
          submitted_at,
          reviewed_at,
          reviewer_comments,
          payment_released,
          payment_amount,
          job_stages!milestones_stage_id_fkey (
            name,
            description
          )
        `)
                .eq("project_id", id)
                .order("stage_number");

            if (milestonesError) throw milestonesError;

            const transformedMilestones = (milestonesData || []).map((m: any) => ({
                ...m,
                stage: {
                    name: m.job_stages?.name || "Unknown Stage",
                    description: m.job_stages?.description,
                },
            }));

            setMilestones(transformedMilestones);

            // Check if user has already rated this project
            const { data: existingRating } = await supabase
                .from("ratings")
                .select("id")
                .eq("project_id", id)
                .eq("rater_id", user.id)
                .single();

            setHasRated(!!existingRating);

            // Get counterparty info
            const counterpartyUserId = projectData.recruiter_id === user.id
                ? projectData.freelancer_id
                : projectData.recruiter_id;

            const { data: counterpartyProfile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", counterpartyUserId)
                .single();

            setCounterpartyInfo({
                id: counterpartyUserId,
                name: counterpartyProfile?.full_name || "Unknown",
            });
        } catch (error: any) {
            console.error("Error fetching project:", error);
            toast.error("Failed to load project");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitMilestone = async (milestoneId: string) => {
        if (!submissionDescription.trim()) {
            toast.error("Please provide a description of your work");
            return;
        }

        setIsSubmitting(true);

        try {
            const links = submissionLinks
                .split("\n")
                .map((l) => l.trim())
                .filter((l) => l.length > 0);

            await supabase
                .from("milestones")
                .update({
                    status: "submitted",
                    submission_description: submissionDescription,
                    submission_links: links.length > 0 ? links : null,
                    submitted_at: new Date().toISOString(),
                })
                .eq("id", milestoneId);

            // Create notification for recruiter
            await supabase.from("notifications").insert({
                user_id: project?.recruiter_id,
                title: "Milestone Submitted",
                message: `A milestone has been submitted for "${project?.job.title}"`,
                type: "milestone",
                related_id: milestoneId,
            });

            toast.success("Milestone submitted for review");
            setSubmissionDescription("");
            setSubmissionLinks("");
            fetchProjectData();
        } catch (error: any) {
            console.error("Error submitting milestone:", error);
            toast.error("Failed to submit milestone");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApproveMilestone = async (milestone: Milestone) => {
        if (!project || !publicKey) {
            toast.error("Please connect your wallet");
            return;
        }

        setIsReviewing(true);
        setReviewingMilestoneId(milestone.id);

        try {
            // Check if sufficient stake
            const remaining = project.staking.total_staked - project.staking.total_released;
            if (remaining < milestone.payment_amount) {
                toast.error("Insufficient staked funds. Please add more stake.");
                setIsReviewing(false);
                setReviewingMilestoneId(null);
                return;
            }

            // Get freelancer wallet address
            const { data: walletData } = await supabase
                .from("user_wallets")
                .select("wallet_address")
                .eq("user_id", project.freelancer_id)
                .single();

            if (!walletData?.wallet_address) {
                toast.error("Freelancer wallet not found");
                setIsReviewing(false);
                setReviewingMilestoneId(null);
                return;
            }

            // Create payment transaction (in production, this would release from escrow)
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: publicKey, // In production: freelancer's public key
                    lamports: Math.floor(milestone.payment_amount * LAMPORTS_PER_SOL),
                })
            );

            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, "confirmed");

            // Update milestone
            await supabase
                .from("milestones")
                .update({
                    status: "approved",
                    payment_released: true,
                    reviewed_at: new Date().toISOString(),
                    reviewer_comments: reviewComments || null,
                })
                .eq("id", milestone.id);

            // Update staking record
            await supabase
                .from("staking")
                .update({
                    total_released:
                        project.staking.total_released + milestone.payment_amount,
                })
                .eq("project_id", project.id);

            // Record transaction
            await supabase.from("transactions").insert({
                project_id: project.id,
                milestone_id: milestone.id,
                from_user_id: project.recruiter_id,
                to_user_id: project.freelancer_id,
                amount: milestone.payment_amount,
                type: "payment",
                wallet_signature: signature,
                wallet_from: publicKey.toBase58(),
                wallet_to: walletData.wallet_address,
                status: "confirmed",
            });

            // Update project stage if needed
            if (milestone.stage_number < 3) {
                await supabase
                    .from("projects")
                    .update({ current_stage: milestone.stage_number + 1 })
                    .eq("id", project.id);

                // Set next milestone to in_progress
                await supabase
                    .from("milestones")
                    .update({ status: "in_progress" })
                    .eq("project_id", project.id)
                    .eq("stage_number", milestone.stage_number + 1);
            } else {
                // Project completed
                await supabase
                    .from("projects")
                    .update({ status: "completed", completed_at: new Date().toISOString() })
                    .eq("id", project.id);

                await supabase
                    .from("jobs")
                    .update({ status: "completed" })
                    .eq("id", project.job_id);
            }

            // Create notification for freelancer
            await supabase.from("notifications").insert({
                user_id: project.freelancer_id,
                title: "Payment Released",
                message: `You received ${milestone.payment_amount.toFixed(2)} SOL for completing a milestone`,
                type: "payment",
                related_id: milestone.id,
            });

            toast.success("Milestone approved! Payment sent to freelancer.");
            setReviewComments("");
            fetchProjectData();

            // If this was the final milestone, show rating modal
            if (milestone.stage_number === 3) {
                setTimeout(() => {
                    setShowRatingModal(true);
                }, 1500);
            }
        } catch (error: any) {
            console.error("Error approving milestone:", error);
            toast.error(error.message || "Failed to approve milestone");
        } finally {
            setIsReviewing(false);
            setReviewingMilestoneId(null);
        }
    };

    const handleRequestRevision = async (milestoneId: string) => {
        if (!reviewComments.trim()) {
            toast.error("Please provide feedback for revision");
            return;
        }

        try {
            await supabase
                .from("milestones")
                .update({
                    status: "revision_requested",
                    reviewer_comments: reviewComments,
                    reviewed_at: new Date().toISOString(),
                })
                .eq("id", milestoneId);

            // Create notification
            await supabase.from("notifications").insert({
                user_id: project?.freelancer_id,
                title: "Revision Requested",
                message: `The recruiter has requested revisions for a milestone in "${project?.job.title}"`,
                type: "milestone",
                related_id: milestoneId,
            });

            toast.success("Revision requested");
            setReviewComments("");
            fetchProjectData();
        } catch (error: any) {
            console.error("Error requesting revision:", error);
            toast.error("Failed to request revision");
        }
    };

    const getStageProgress = () => {
        if (!project) return 0;
        return (project.current_stage / 3) * 100;
    };

    const getMilestoneStatusColor = (status: string) => {
        switch (status) {
            case "pending":
                return "bg-muted text-muted-foreground border-muted";
            case "in_progress":
                return "bg-primary/10 text-primary border-primary/30";
            case "submitted":
                return "bg-warning/10 text-warning border-warning/30";
            case "approved":
                return "bg-success/10 text-success border-success/30";
            case "revision_requested":
                return "bg-destructive/10 text-destructive border-destructive/30";
            default:
                return "bg-muted text-muted-foreground border-muted";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24">
                    <div className="animate-pulse space-y-8">
                        <div className="h-8 bg-muted rounded w-1/4"></div>
                        <div className="h-64 bg-muted rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 text-center">
                    <h1 className="text-2xl font-bold mb-4">Project not found</h1>
                    <Button onClick={() => navigate("/")}>Go back home</Button>
                </div>
            </div>
        );
    }

    const isRecruiter = user?.id === project.recruiter_id;
    const currentMilestone = milestones.find(
        (m) => m.stage_number === project.current_stage
    );

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">{project.job.title}</h1>
                    <p className="text-muted-foreground">
                        Started {formatDistanceToNow(new Date(project.started_at))} ago
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Progress Timeline */}
                        <Card className="glass border-white/10">
                            <CardHeader>
                                <CardTitle>Project Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative">
                                    {/* Progress Bar */}
                                    <div className="h-2 bg-muted rounded-full mb-8">
                                        <div
                                            className="h-full bg-gradient-solana rounded-full transition-all duration-500"
                                            style={{ width: `${getStageProgress()}%` }}
                                        />
                                    </div>

                                    {/* Stage Markers */}
                                    <div className="flex justify-between">
                                        {milestones.map((milestone) => (
                                            <div
                                                key={milestone.id}
                                                className="flex flex-col items-center"
                                            >
                                                <div
                                                    className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${milestone.payment_released
                                                        ? "bg-gradient-solana text-background"
                                                        : milestone.stage_number === project.current_stage
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted text-muted-foreground"
                                                        }`}
                                                >
                                                    {milestone.payment_released ? (
                                                        <CheckCircle className="w-6 h-6" />
                                                    ) : (
                                                        milestone.stage_number
                                                    )}
                                                </div>
                                                <p className="text-xs text-center font-medium mb-1">
                                                    Stage {milestone.stage_number}
                                                </p>
                                                <div className="flex items-center space-x-1 text-xs text-gradient font-semibold">
                                                    <Coins className="w-3 h-3" />
                                                    <span>{milestone.payment_amount.toFixed(2)} SOL</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Milestones */}
                        {milestones.map((milestone) => (
                            <Card
                                key={milestone.id}
                                className="glass border-white/10"
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle>{milestone.stage.name}</CardTitle>
                                            {milestone.stage.description && (
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    {milestone.stage.description}
                                                </p>
                                            )}
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={getMilestoneStatusColor(milestone.status)}
                                        >
                                            {milestone.status.replace("_", " ")}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Payment Info */}
                                    <div className="flex items-center justify-between p-3 bg-gradient-card rounded-lg">
                                        <span className="text-sm text-muted-foreground">
                                            Payment for this stage
                                        </span>
                                        <div className="flex items-center space-x-1 text-xl font-bold text-gradient">
                                            <Coins className="w-5 h-5" />
                                            <span>{milestone.payment_amount.toFixed(2)} SOL</span>
                                        </div>
                                    </div>

                                    {/* Submission Section (for Freelancers) */}
                                    {!isRecruiter &&
                                        (milestone.status === "in_progress" ||
                                            milestone.status === "revision_requested") && (
                                            <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                                                <div className="flex items-center space-x-2">
                                                    <Upload className="w-5 h-5 text-primary" />
                                                    <h4 className="font-semibold">Submit Milestone</h4>
                                                </div>

                                                {milestone.status === "revision_requested" &&
                                                    milestone.reviewer_comments && (
                                                        <Alert className="border-warning/30 bg-warning/10">
                                                            <AlertCircle className="h-4 w-4" />
                                                            <AlertDescription>
                                                                <strong>Revision Required:</strong>{" "}
                                                                {milestone.reviewer_comments}
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}

                                                <div className="space-y-2">
                                                    <Label htmlFor="description">
                                                        Describe your work *
                                                    </Label>
                                                    <Textarea
                                                        id="description"
                                                        placeholder="Explain what you've completed for this stage..."
                                                        value={submissionDescription}
                                                        onChange={(e) =>
                                                            setSubmissionDescription(e.target.value)
                                                        }
                                                        rows={4}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="links">Links (Optional)</Label>
                                                    <Textarea
                                                        id="links"
                                                        placeholder="GitHub repo, demo link, etc. (one per line)"
                                                        value={submissionLinks}
                                                        onChange={(e) => setSubmissionLinks(e.target.value)}
                                                        rows={3}
                                                        className="font-mono text-sm"
                                                    />
                                                </div>

                                                <Button
                                                    onClick={() => handleSubmitMilestone(milestone.id)}
                                                    disabled={isSubmitting || !submissionDescription.trim()}
                                                    className="w-full bg-gradient-solana"
                                                >
                                                    {isSubmitting ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Submitting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-4 h-4 mr-2" />
                                                            Submit for Review
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        )}

                                    {/* Submission Display */}
                                    {milestone.submission_description && (
                                        <div className="space-y-3">
                                            <Separator />
                                            <div>
                                                <h4 className="font-semibold mb-2 flex items-center space-x-2">
                                                    <CheckCircle className="w-4 h-4 text-success" />
                                                    <span>Submitted Work</span>
                                                </h4>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">
                                                    {milestone.submission_description}
                                                </p>
                                                {milestone.submission_links &&
                                                    milestone.submission_links.length > 0 && (
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-medium">Links:</p>
                                                            {milestone.submission_links.map((link, idx) => (
                                                                <a
                                                                    key={idx}
                                                                    href={link}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center space-x-1 text-sm text-primary hover:underline"
                                                                >
                                                                    <ExternalLink className="w-3 h-3" />
                                                                    <span className="truncate">{link}</span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                {milestone.submitted_at && (
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        Submitted{" "}
                                                        {formatDistanceToNow(
                                                            new Date(milestone.submitted_at)
                                                        )}{" "}
                                                        ago
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Review Section (for Recruiters) */}
                                    {isRecruiter && milestone.status === "submitted" && (
                                        <div className="space-y-4 p-4 bg-warning/5 rounded-lg border border-warning/20">
                                            <h4 className="font-semibold">Review Submission</h4>

                                            <div className="space-y-2">
                                                <Label htmlFor="comments">
                                                    Feedback (Optional for approval, required for
                                                    revision)
                                                </Label>
                                                <Textarea
                                                    id="comments"
                                                    placeholder="Provide feedback on the submission..."
                                                    value={reviewComments}
                                                    onChange={(e) => setReviewComments(e.target.value)}
                                                    rows={3}
                                                />
                                            </div>

                                            <div className="flex space-x-2">
                                                <Button
                                                    onClick={() => handleApproveMilestone(milestone)}
                                                    disabled={
                                                        isReviewing &&
                                                        reviewingMilestoneId === milestone.id
                                                    }
                                                    className="flex-1 bg-gradient-solana"
                                                >
                                                    {isReviewing &&
                                                        reviewingMilestoneId === milestone.id ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                            Approve & Release Payment
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    onClick={() => handleRequestRevision(milestone.id)}
                                                    disabled={
                                                        isReviewing || !reviewComments.trim()
                                                    }
                                                    variant="outline"
                                                    className="flex-1"
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Request Revision
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Reviewer Comments Display */}
                                    {milestone.reviewer_comments &&
                                        milestone.status !== "revision_requested" && (
                                            <div className="p-3 bg-muted/50 rounded-lg">
                                                <p className="text-sm font-medium mb-1">
                                                    Recruiter Feedback:
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {milestone.reviewer_comments}
                                                </p>
                                            </div>
                                        )}

                                    {/* Payment Released Display */}
                                    {milestone.payment_released && (
                                        <Alert className="border-success/30 bg-success/10">
                                            <CheckCircle className="h-4 w-4 text-success" />
                                            <AlertDescription>
                                                Payment of {milestone.payment_amount.toFixed(2)} SOL
                                                has been released
                                                {milestone.reviewed_at &&
                                                    ` ${formatDistanceToNow(
                                                        new Date(milestone.reviewed_at)
                                                    )} ago`}
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Payment Summary */}
                        <Card className="glass border-white/10">
                            <CardHeader>
                                <CardTitle>Payment Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Total Project:
                                        </span>
                                        <span className="font-semibold">
                                            {project.job.total_payment.toFixed(2)} SOL
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Staked:</span>
                                        <span className="font-semibold text-warning">
                                            {project.staking.total_staked.toFixed(2)} SOL
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Released:</span>
                                        <span className="font-semibold text-success">
                                            {project.staking.total_released.toFixed(2)} SOL
                                        </span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Remaining:</span>
                                        <span className="text-xl font-bold text-gradient">
                                            {(
                                                project.staking.total_staked -
                                                project.staking.total_released
                                            ).toFixed(2)}{" "}
                                            SOL
                                        </span>
                                    </div>
                                </div>

                                {isRecruiter &&
                                    project.staking.total_staked -
                                    project.staking.total_released <
                                    project.job.total_payment - project.staking.total_released && (
                                        <Alert className="border-warning/30 bg-warning/10">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription className="text-xs">
                                                Consider adding more stake to ensure smooth payment
                                                releases
                                            </AlertDescription>
                                        </Alert>
                                    )}
                            </CardContent>
                        </Card>

                        {/* Project Status */}
                        <Card className="glass border-white/10">
                            <CardHeader>
                                <CardTitle>Project Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Current Stage:</span>
                                        <Badge className="bg-primary/10 text-primary border-primary/30">
                                            Stage {project.current_stage}/3
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Status:</span>
                                        <Badge
                                            className={
                                                project.status === "completed"
                                                    ? "bg-success/10 text-success border-success/30"
                                                    : "bg-primary/10 text-primary border-primary/30"
                                            }
                                        >
                                            {project.status}
                                        </Badge>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Your Role:</span>
                                        <span className="font-medium capitalize">{userRole}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Messages */}
                        {counterpartyInfo && (
                            <ProjectMessages
                                projectId={project.id}
                                recipientId={counterpartyInfo.id}
                                recipientName={counterpartyInfo.name}
                            />
                        )}
                    </div>

                    {/* Project Completed - Rating CTA */}
                    <div className="space-y-6">
                        {project.status === "completed" && !hasRated && counterpartyInfo && (
                            <Card className="glass border-success/30 bg-success/5">
                                <CardContent className="pt-6">
                                    <div className="text-center space-y-4">
                                        <h3 className="text-lg font-semibold">Project Completed! 🎉</h3>
                                        <p className="text-sm text-muted-foreground">
                                            How was your experience working with {counterpartyInfo.name}?
                                        </p>
                                        <Button
                                            onClick={() => setShowRatingModal(true)}
                                            className="bg-gradient-solana"
                                        >
                                            Rate & Review
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {hasRated && project.status === "completed" && (
                            <Alert className="border-success/30 bg-success/10">
                                <CheckCircle className="h-4 w-4 text-success" />
                                <AlertDescription>
                                    Thanks for your feedback! You've already rated this project.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </div>
            </div>

            {/* Rating Modal */}
            {showRatingModal && counterpartyInfo && project && (
                <RatingModal
                    isOpen={showRatingModal}
                    onClose={() => setShowRatingModal(false)}
                    projectId={project.id}
                    projectTitle={project.job.title}
                    counterpartyName={counterpartyInfo.name}
                    counterpartyId={counterpartyInfo.id}
                    isRecruiter={isRecruiter}
                    onSuccess={() => {
                        setHasRated(true);
                        fetchProjectData();
                    }}
                />
            )}
        </div>
    );
}

