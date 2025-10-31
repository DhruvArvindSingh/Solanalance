import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/apiClient/client";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { approveMilestone, claimMilestone } from "@/lib/escrow-operations";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RatingBadge } from "@/components/RatingBadge";
import { ApplicationModal } from "@/components/ApplicationModal";
import { VerifyFundsButton } from "@/components/VerifyFundsButton";
import {
    ArrowLeft,
    Briefcase,
    Calendar,
    Clock,
    Coins,
    Eye,
    Users,
    Award,
    CheckCircle,
    User,
    FileText,
    Link as LinkIcon,
    Download,
    XCircle,
    Loader2,
    Shield,
    AlertCircle,
    Edit,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface JobStage {
    id: string;
    stage_number: number;
    name: string;
    description: string | null;
    payment: number;
}

interface EscrowInfo {
    pda_address?: string;
    current_funds?: number;
    milestones?: number[];
    verified_recruiter_wallet?: string;
    verified_freelancer_wallet?: string;
    error?: string | null;
}

interface Job {
    id: string;
    title: string;
    description: string;
    skills: string[];
    experience_level: string;
    project_duration: string;
    category: string | null;
    status: string;
    total_payment: number;
    views_count: number;
    created_at: string;
    recruiter_id: string;
    recruiter_wallet: string | null;
    freelancer_wallet: string | null;
    escrow?: EscrowInfo;
}

interface RecruiterProfile {
    full_name: string;
    company_name: string | null;
    avatar_url: string | null;
}

interface SelectedFreelancer {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    bio: string | null;
    skills: string[];
    hourly_rate: number | null;
}

interface Milestone {
    id: string;
    stage_number: number;
    stage_name: string;
    stage_description: string | null;
    status: string;
    payment_amount: number;
    payment_released: boolean;
    submission_description: string | null;
    submission_files: string[];
    submission_links: string[];
    submitted_at: string | null;
    reviewed_at: string | null;
    reviewer_comments: string | null;
    created_at: string;
}

export default function JobDetail() {
    const { id } = useParams<{ id: string }>();
    const { user, userRole } = useAuth();
    const navigate = useNavigate();

    const [job, setJob] = useState<Job | null>(null);
    const [stages, setStages] = useState<JobStage[]>([]);
    const [recruiterProfile, setRecruiterProfile] = useState<RecruiterProfile | null>(null);
    const [recruiterTier, setRecruiterTier] = useState<"gold" | "silver" | "bronze" | "iron">("iron");
    const [applicantsCount, setApplicantsCount] = useState(0);
    const [hasApplied, setHasApplied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [selectedFreelancer, setSelectedFreelancer] = useState<SelectedFreelancer | null>(null);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [reviewingMilestoneId, setReviewingMilestoneId] = useState<string | null>(null);
    const [reviewComments, setReviewComments] = useState("");
    const [isApproving, setIsApproving] = useState(false);
    const [isRequestingChanges, setIsRequestingChanges] = useState(false);
    const [claimingMilestoneId, setClaimingMilestoneId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);

    const { connection } = useConnection();
    const wallet = useWallet();
    const { publicKey } = wallet;


    useEffect(() => {
        if (id) {
            fetchJobDetails();
            incrementViewCount();
        }
    }, [id]);

    const fetchJobDetails = async () => {
        try {
            // Fetch job (includes all related data)
            const { data: jobData, error: jobError } = await apiClient.jobs.getById(id!);

            if (jobError) throw new Error(jobError);

            if (jobData) {
                setJob({
                    id: jobData.id,
                    title: jobData.title,
                    description: jobData.description,
                    skills: jobData.skills,
                    experience_level: jobData.experience_level,
                    project_duration: jobData.project_duration,
                    category: jobData.category,
                    status: jobData.status,
                    total_payment: jobData.total_payment,
                    views_count: jobData.views_count,
                    created_at: jobData.created_at,
                    recruiter_id: jobData.recruiter_id,
                    recruiter_wallet: jobData.recruiter_wallet,
                    freelancer_wallet: jobData.freelancer_wallet,
                    escrow: jobData.escrow
                });

                setStages(jobData.stages || []);
                setApplicantsCount(jobData.applicants_count || 0);

                // Set recruiter profile
                if (jobData.recruiter) {
                    setRecruiterProfile({
                        full_name: jobData.recruiter.full_name,
                        company_name: jobData.recruiter.company_name,
                        avatar_url: jobData.recruiter.avatar_url
                    });
                }

                // Set selected freelancer and milestones for active jobs
                if (jobData.status === 'active' && jobData.selected_freelancer) {
                    setSelectedFreelancer(jobData.selected_freelancer);
                }
                if (jobData.status === 'active' && jobData.milestones) {
                    setMilestones(jobData.milestones);
                }

                // Check if current user has applied
                if (user) {
                    const { data: applicationData, error: appError } = await apiClient.applications.checkApplication(id!);
                    console.log("applicationData", applicationData);
                    console.log("appError", appError);
                    if (!appError && applicationData) {
                        setHasApplied(applicationData.hasApplied);
                    }
                }

                // Check if there's an active project for this job (for recruiter)
                if (user && jobData.recruiter_id === user.id && jobData.status === 'active') {
                    try {
                        const { data: projectsData, error: projectsError } = await apiClient.projects.getMyProjects();
                        if (!projectsError && projectsData) {
                            const activeProject = projectsData.find(
                                (p: any) => p.job_id === id && p.status === 'active'
                            );
                            if (activeProject) {
                                setActiveProjectId(activeProject.id);
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching projects:', error);
                    }
                }
            }
        } catch (error: any) {
            console.error("Error fetching job:", error);
            toast.error("Failed to load job details");
        } finally {
            setLoading(false);
        }
    };

    const incrementViewCount = async () => {
        if (!id) return;

        try {
            // View count is now automatically incremented by the getById endpoint
            // No need for a separate RPC call
        } catch (error) {
            console.error("Error incrementing views:", error);
        }
    };

    const getDurationLabel = (duration: string) => {
        const labels: Record<string, string> = {
            short_term: "Short-term (< 1 month)",
            medium_term: "Medium-term (1-3 months)",
            long_term: "Long-term (3+ months)",
        };
        return labels[duration] || duration;
    };

    const getExperienceLabel = (level: string) => {
        return level.charAt(0).toUpperCase() + level.slice(1);
    };

    const handleApproveMilestone = async (milestone: Milestone) => {
        console.log("\n\nhandleApproveMilestone called with milestone:", milestone);
        if (!publicKey) {
            toast.error("Please connect your wallet to approve milestone");
            return;
        }

        if (!job) {
            toast.error("Job information not found");
            return;
        }

        if (!job.recruiter_wallet) {
            toast.error("Cannot approve milestone: Recruiter's wallet not found.");
            return;
        }

        if (job.status !== 'active') {
            toast.error("Cannot approve milestone: Job must be in 'active' status. Please fund the escrow to activate the job.");
            return;
        }

        // Check if milestone is already approved or claimed
        if (milestone.status === 'approved') {
            toast.error("This milestone has already been approved");
            return;
        }

        if (milestone.payment_released) {
            toast.error("This milestone has already been paid");
            return;
        }

        // Check if previous milestone is approved (sequential approval constraint)
        if (milestone.stage_number > 1 && job.milestones) {
            const previousMilestone = job.milestones.find((m: Milestone) => m.stage_number === milestone.stage_number - 1);
            if (previousMilestone && previousMilestone.status !== 'approved') {
                toast.error(
                    `Cannot approve Milestone ${milestone.stage_number}. Please approve Milestone ${milestone.stage_number - 1} first.`,
                    { duration: 4000 }
                );
                return;
            }
        }

        setIsApproving(true);

        try {
            const milestoneIndex = milestone.stage_number - 1; // Convert to 0-indexed

            // First, check the on-chain state to prevent duplicate approvals
            toast.info("Checking milestone status on blockchain...");

            // Import the getMilestoneStatus function to check on-chain state
            const { getMilestoneStatus } = await import("@/lib/escrow-operations");
            const milestoneStatuses = await getMilestoneStatus(job.recruiter_wallet, job.id);
            console.log("milestoneStatuses", milestoneStatuses[milestoneIndex]);
            console.log("milestoneIndex", milestoneIndex);
            if (milestoneStatuses && milestoneStatuses[milestoneIndex].approved) {
                toast.error("This milestone has already been approved on the blockchain. Refreshing page to sync status...");
                setIsApproving(false);
                // Sync backend with blockchain state
                try {
                    await apiClient.projects.syncWithBlockchain({
                        jobId: job.id,
                        recruiterWallet: job.recruiter_wallet
                    });
                } catch (syncError) {
                    console.error("Failed to sync with blockchain:", syncError);
                    toast.error("Failed to sync with blockchain. Please refresh the page to see the updated status.");
                }
                setTimeout(() => {
                    fetchJobDetails();
                }, 1500);
                return;


            }

            if (milestoneStatuses && milestoneStatuses[milestoneIndex]) {
                const onChainStatus = milestoneStatuses[milestoneIndex];
                if (onChainStatus.claimed) {
                    toast.error("This milestone has already been claimed by the freelancer. Refreshing page to sync status...");
                    setTimeout(() => {
                        fetchJobDetails();
                    }, 1500);
                    return;
                }
                if (onChainStatus.approved) {
                    toast.error("This milestone has already been approved on the blockchain. Refreshing page to sync status...");
                    setTimeout(() => {
                        fetchJobDetails();
                    }, 1500);
                    return;
                }
            }

            // Call smart contract to approve milestone
            toast.info("Approving milestone on blockchain...");

            const result = await approveMilestone(
                wallet,
                job.id,
                milestoneIndex
            );

            if (!result.success) {
                throw new Error(result.error || "Failed to approve milestone on blockchain");
            }

            toast.success("Milestone approved on blockchain!");

            // Update backend
            const { error } = await apiClient.projects.reviewMilestone(milestone.id, {
                action: 'approve',
                comments: reviewComments || null,
            });

            if (error) throw new Error(error);

            toast.success("Milestone approved successfully!");
            setReviewingMilestoneId(null);
            setReviewComments("");

            // Refresh job details to update milestone status
            fetchJobDetails();
        } catch (error: any) {
            console.error("Error approving milestone:", error);

            // Handle specific error cases
            if (error.message?.includes("already been approved")) {
                toast.warning("This milestone has already been approved. Refreshing page to sync status...");
                // Refresh job details to get updated status
                setTimeout(() => {
                    fetchJobDetails();
                }, 1500);
            } else if (error.message?.includes("MilestoneAlreadyApproved")) {
                toast.warning("This milestone was already approved on the blockchain. Syncing database...");
                // Try to sync the status from blockchain to database
                try {
                    const syncResult = await apiClient.projects.syncMilestone(milestone.id);
                    if (syncResult.error) {
                        throw new Error(syncResult.error);
                    }
                    toast.success("Database synchronized with blockchain status");
                    fetchJobDetails();
                } catch (syncError) {
                    console.error("Failed to sync database:", syncError);
                    // Fallback to manual database update
                    try {
                        await apiClient.projects.reviewMilestone(milestone.id, {
                            action: 'approve',
                            comments: reviewComments || null,
                        });
                        toast.success("Database updated to reflect blockchain status");
                        fetchJobDetails();
                    } catch (fallbackError) {
                        console.error("Failed to update database:", fallbackError);
                        toast.error("Please refresh the page to see the updated status");
                    }
                }
            } else {
                toast.error(error.message || "Failed to approve milestone");
            }
        } finally {
            setIsApproving(false);
        }
    };

    const handleRequestChanges = async (milestone: Milestone) => {
        if (!reviewComments.trim()) {
            toast.error("Please provide feedback for the requested changes");
            return;
        }

        setIsRequestingChanges(true);

        try {
            const { error } = await apiClient.projects.reviewMilestone(milestone.id, {
                action: 'request_revision',
                comments: reviewComments,
            });

            if (error) throw new Error(error);

            toast.success("Revision requested successfully");
            setReviewingMilestoneId(null);
            setReviewComments("");

            // Refresh job details
            fetchJobDetails();
        } catch (error: any) {
            console.error("Error requesting changes:", error);
            toast.error("Failed to request changes");
        } finally {
            setIsRequestingChanges(false);
        }
    };

    const handleClaimMilestone = async (milestone: Milestone) => {
        if (!wallet.publicKey) {
            toast.error("Please connect your wallet to claim milestone payment");
            return;
        }

        if (!job?.recruiter_wallet) {
            toast.error("Recruiter wallet address not found");
            return;
        }

        // Double-check milestone status before claiming
        if (milestone.status !== 'approved') {
            toast.error("This milestone is not approved for claiming");
            return;
        }

        if (milestone.payment_released) {
            toast.error("This milestone payment has already been claimed");
            return;
        }

        setClaimingMilestoneId(milestone.id);

        try {
            toast.info("Claiming milestone payment from escrow...");

            // Add a small delay to prevent rapid clicking
            await new Promise(resolve => setTimeout(resolve, 500));

            const milestoneIndex = milestone.stage_number - 1; // Convert to 0-indexed
            const result = await claimMilestone(
                wallet,
                job.id,
                job.recruiter_wallet,
                milestoneIndex
            );

            if (!result.success) {
                throw new Error(result.error || "Failed to claim milestone from blockchain");
            }

            toast.success("Milestone payment claimed successfully!");

            // Update backend to mark payment as released
            const { error } = await apiClient.projects.claimMilestone(milestone.id, {
                transaction_signature: result.txSignature
            });

            if (error) {
                console.error("Backend update error:", error);
                toast.warning("Payment claimed but failed to update database. Please refresh the page.");
            }

            // Refresh job details to show updated status
            fetchJobDetails();
        } catch (error: any) {
            console.error("Error claiming milestone:", error);

            // Handle specific error cases
            if (error.message?.includes("already been processed") || error.message?.includes("already been claimed")) {
                toast.warning("This milestone has already been claimed. Refreshing page to update status...");
                // Refresh job details to get updated status
                setTimeout(() => {
                    fetchJobDetails();
                }, 1500);
            } else if (error.message?.includes("Transaction simulation failed")) {
                toast.error("Transaction failed. This milestone may have already been claimed or there's a network issue.");
            } else {
                toast.error(error.message || "Failed to claim milestone payment");
            }
        } finally {
            setClaimingMilestoneId(null);
        }
    };

    const handleVerifyFunds = async () => {
        if (!job?.recruiter_wallet) {
            toast.error("Recruiter wallet address not found");
            return;
        }

        setIsVerifying(true);

        try {
            toast.info("Verifying funds on blockchain...");

            const { verifyEscrowFunds } = await import("@/lib/escrow-operations");
            const result = await verifyEscrowFunds(
                job.recruiter_wallet,
                job.id,
                job.freelancer_wallet || undefined,
                job.total_payment
            );

            if (result.verified) {
                toast.success(`✓ Funds verified! ${result.balance?.toFixed(4)} SOL locked in escrow`, {
                    description: `PDA: ${result.escrowPDA?.substring(0, 20)}...`
                });
            } else {
                toast.error(`Verification failed: ${result.error}`);
            }
        } catch (error: any) {
            console.error("Error verifying funds:", error);
            toast.error("Failed to verify funds on blockchain");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSyncBlockchain = async () => {
        if (!job?.recruiter_wallet) {
            toast.error("Recruiter wallet address not found");
            return;
        }

        setIsSyncing(true);

        try {
            toast.info("Syncing with blockchain...");

            const { error } = await apiClient.projects.syncWithBlockchain({
                jobId: job.id,
                recruiterWallet: job.recruiter_wallet
            });

            if (error) {
                throw new Error(error);
            }

            toast.success("Successfully synced with blockchain!");

            // Refresh job details to show updated data
            await fetchJobDetails();
        } catch (error: any) {
            console.error("Error syncing with blockchain:", error);
            toast.error(error.message || "Failed to sync with blockchain");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCancelJob = async () => {
        if (!wallet.publicKey) {
            toast.error("Please connect your wallet to cancel the job");
            return;
        }

        if (!job) {
            toast.error("Job information not found");
            return;
        }

        setIsCanceling(true);

        try {
            // First, check if any milestones have been approved
            if (job.recruiter_wallet) {
                toast.info("Checking milestone status...");

                const { getMilestoneStatus } = await import("@/lib/escrow-operations");
                const milestoneStatuses = await getMilestoneStatus(job.recruiter_wallet, job.id);

                if (milestoneStatuses) {
                    const hasApprovedMilestone = milestoneStatuses.some(m => m.approved);

                    if (hasApprovedMilestone) {
                        // Milestone(s) approved - send email inquiry instead
                        const confirmed = window.confirm(
                            "One or more milestones have been approved. You cannot cancel the job directly.\n\n" +
                            "Would you like to submit a fund reclaim inquiry? Our support team will contact you via email to discuss the reclaim process."
                        );

                        if (!confirmed) {
                            setIsCanceling(false);
                            return;
                        }

                        toast.info("Submitting reclaim inquiry...");

                        // Send email inquiry to support
                        const { error: emailError } = await apiClient.support.submitReclaimInquiry({
                            jobId: job.id,
                            jobTitle: job.title,
                            recruiterEmail: user?.email,
                            recruiterName: user?.fullName,
                            totalStaked: job.total_payment,
                            milestoneStatuses: milestoneStatuses.map(m => ({
                                index: m.index,
                                amount: m.amount,
                                approved: m.approved,
                                claimed: m.claimed
                            }))
                        });

                        if (emailError) {
                            throw new Error(emailError);
                        }

                        toast.success("Reclaim inquiry submitted successfully! Our support team will contact you via email within 24-48 hours.", {
                            duration: 5000
                        });

                        setIsCanceling(false);
                        return;
                    }
                }
            }

            // No milestones approved - proceed with normal cancellation
            const confirmed = window.confirm(
                "Are you sure you want to cancel this job?\n\n" +
                "This will:\n" +
                "• Close the escrow account\n" +
                "• Refund the full staked amount to your wallet\n" +
                "• Mark the job as cancelled\n\n" +
                "This action cannot be undone."
            );

            if (!confirmed) {
                setIsCanceling(false);
                return;
            }

            toast.info("Canceling job on blockchain...");

            const { cancelJob } = await import("@/lib/escrow-operations");
            const result = await cancelJob(wallet, job.id);

            if (!result.success) {
                throw new Error(result.error || "Failed to cancel job on blockchain");
            }

            toast.success("Job canceled successfully! Funds have been refunded to your wallet.");

            // Sync backend with blockchain cancellation
            try {
                const cancelResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/jobs/${job.id}/cancel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        transactionSignature: result.txSignature
                    })
                });

                if (!cancelResponse.ok) {
                    const errorData = await cancelResponse.json();
                    console.error("Failed to sync cancellation with database:", errorData);
                    toast.warning("Job cancelled on blockchain but database sync failed. Please refresh the page.");
                } else {
                    const cancelData = await cancelResponse.json();
                    console.log("✓ Database synced:", cancelData);
                }
            } catch (dbError) {
                console.error("Database sync error:", dbError);
                toast.warning("Job cancelled on blockchain. Database will sync automatically.");
            }

            // Redirect to dashboard after a short delay
            setTimeout(() => {
                navigate('/dashboard/recruiter');
            }, 2000);
        } catch (error: any) {
            console.error("Error canceling job:", error);

            if (error.message?.includes("CannotCancelAfterApproval")) {
                toast.error(
                    "Cannot cancel job: At least one milestone has been approved.\n\n" +
                    "Please use the 'Submit Reclaim Inquiry' option to contact support.",
                    { duration: 5000 }
                );
            } else {
                toast.error(error.message || "Failed to cancel job");
            }
        } finally {
            setIsCanceling(false);
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

    if (!job) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 text-center">
                    <h1 className="text-2xl font-bold mb-4">Job not found</h1>
                    <Button onClick={() => navigate("/")}>Go back home</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                    className="mb-6"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Job Header */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                                    <div className="flex-1">
                                        <h1 className="text-2xl sm:text-3xl font-bold mb-3">{job.title}</h1>
                                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                            <div className="flex items-center space-x-1">
                                                <Calendar className="w-4 h-4" />
                                                <span>Posted {formatDistanceToNow(new Date(job.created_at))} ago</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Eye className="w-4 h-4" />
                                                <span>{job.views_count} views</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Users className="w-4 h-4" />
                                                <span>{applicantsCount} applicants</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-left sm:text-right">
                                        <div className="flex items-center space-x-2 text-2xl sm:text-3xl font-bold text-primary mb-1">
                                            <Coins className="w-6 sm:w-8 h-6 sm:h-8" />
                                            <span>{job.total_payment.toFixed(2)} SOL</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Total Payment</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {job.category && (
                                        <Badge variant="secondary">
                                            <Briefcase className="w-3 h-3 mr-1" />
                                            {job.category}
                                        </Badge>
                                    )}
                                    <Badge variant="outline">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {getDurationLabel(job.project_duration)}
                                    </Badge>
                                    <Badge variant="outline">
                                        <Award className="w-3 h-3 mr-1" />
                                        {getExperienceLabel(job.experience_level)}
                                    </Badge>
                                </div>
                            </CardHeader>
                        </Card>

                        {/* Description */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle>Job Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                                    {job.description}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Skills */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle>Required Skills</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {job.skills.map((skill, index) => (
                                        <Badge key={index} className="bg-primary/10 text-primary border-primary/20">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Selected Freelancer (for active jobs) */}
                        {job.status === 'active' && selectedFreelancer && (
                            <Card className="bg-card border-border border-success/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <User className="w-5 h-5" />
                                        <span>Selected Freelancer</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start space-x-4">
                                        <Avatar className="w-16 h-16 border-2 border-success/30">
                                            <AvatarImage src={selectedFreelancer.avatar_url || undefined} />
                                            <AvatarFallback className="bg-primary text-background text-xl font-semibold">
                                                {selectedFreelancer.full_name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg">{selectedFreelancer.full_name}</h3>
                                            <p className="text-sm text-muted-foreground">{selectedFreelancer.email}</p>
                                            {selectedFreelancer.hourly_rate && (
                                                <p className="text-sm text-primary mt-1">
                                                    {selectedFreelancer.hourly_rate.toFixed(2)} SOL/hour
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {selectedFreelancer.bio && (
                                        <p className="text-sm text-muted-foreground">{selectedFreelancer.bio}</p>
                                    )}
                                    {selectedFreelancer.skills.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium mb-2">Skills</p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedFreelancer.skills.map((skill, index) => (
                                                    <Badge key={index} variant="secondary" className="text-xs">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Escrow Information (for active jobs) */}
                        {job.status === 'active' && (job.recruiter_wallet || job.escrow) && (
                            <Card className="bg-card border-border border-primary/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <Shield className="w-5 h-5" />
                                        <span>Escrow Information</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Wallet Addresses */}
                                        <div className="space-y-3">
                                            <h4 className="font-medium text-sm">Wallet Addresses</h4>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Recruiter Wallet</p>
                                                    <p className="text-sm font-mono bg-muted/30 p-2 rounded text-xs break-all">
                                                        {job.escrow?.verified_recruiter_wallet || job.recruiter_wallet || 'Not available'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Freelancer Wallet</p>
                                                    <p className="text-sm font-mono bg-muted/30 p-2 rounded text-xs break-all">
                                                        {job.escrow?.verified_freelancer_wallet || job.freelancer_wallet || 'Not available'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Escrow Details */}
                                        <div className="space-y-3">
                                            <h4 className="font-medium text-sm">Escrow Details</h4>
                                            <div className="space-y-2">
                                                {job.escrow?.pda_address && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">PDA Address</p>
                                                        <p className="text-sm font-mono bg-muted/30 p-2 rounded text-xs break-all">
                                                            {job.escrow.pda_address}
                                                        </p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Current Funds</p>
                                                    <div className="flex items-center space-x-2">
                                                        <Coins className="w-4 h-4 text-primary" />
                                                        <span className="text-lg font-bold text-primary">
                                                            {job.escrow?.current_funds?.toFixed(4) || '0.0000'} SOL
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Expected Amount</p>
                                                    <div className="flex items-center space-x-2">
                                                        <Coins className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-lg font-semibold">
                                                            {job.total_payment.toFixed(4)} SOL
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Error Message */}
                                    {job.escrow?.error && (
                                        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                                            <p className="text-sm text-warning">{job.escrow.error}</p>
                                        </div>
                                    )}

                                    {/* Blockchain Actions */}
                                    {job.recruiter_wallet && (
                                        <div className="space-y-3 pt-2">
                                            {/* Recruiter-only actions */}
                                            {userRole === 'recruiter' && user?.id === job.recruiter_id && (
                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <Button
                                                        onClick={handleVerifyFunds}
                                                        disabled={isVerifying || isSyncing}
                                                        variant="outline"
                                                        className="flex-1 text-sm sm:text-base"
                                                    >
                                                        {isVerifying ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                Verifying...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Shield className="w-4 h-4 mr-2" />
                                                                Verify Funds
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        onClick={handleSyncBlockchain}
                                                        disabled={isVerifying || isSyncing}
                                                        variant="outline"
                                                        className="flex-1 text-sm sm:text-base"
                                                    >
                                                        {isSyncing ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                Syncing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                                Sync Blockchain
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Freelancer view - show existing VerifyFundsButton */}
                                            {userRole === 'freelancer' && (
                                                <div className="flex justify-center">
                                                    <VerifyFundsButton
                                                        jobId={job.id}
                                                        jobTitle={job.title}
                                                        recruiterWallet={job.recruiter_wallet}
                                                        freelancerWallet={job.freelancer_wallet || undefined}
                                                        expectedAmount={job.total_payment}
                                                        variant="default"
                                                        size="default"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Milestone Submissions (for active jobs) */}
                        {job.status === 'active' && milestones.length > 0 && (
                            <Card className="bg-card border-border">
                                <CardHeader>
                                    <CardTitle>Milestone Submissions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {milestones.map((milestone) => (
                                        <div
                                            key={milestone.id}
                                            className="p-4 bg-gradient-card rounded-lg border border-border"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold">
                                                        {milestone.stage_number}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium">{milestone.stage_name}</h4>
                                                        <Badge
                                                            variant={milestone.status === 'completed' ? 'default' : 'secondary'}
                                                            className="mt-1"
                                                        >
                                                            {milestone.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center space-x-1 text-lg font-bold text-primary">
                                                        <Coins className="w-5 h-5" />
                                                        <span>{milestone.payment_amount.toFixed(2)} SOL</span>
                                                    </div>
                                                    {milestone.payment_released && (
                                                        <Badge variant="outline" className="mt-1 text-xs border-success text-success">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Paid
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {milestone.submission_description && (
                                                <div className="mt-3 p-3 bg-background/50 rounded border border-border">
                                                    <p className="text-sm font-medium mb-1 flex items-center space-x-2">
                                                        <FileText className="w-4 h-4" />
                                                        <span>Submission</span>
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {milestone.submission_description}
                                                    </p>
                                                    {milestone.submitted_at && (
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            Submitted {formatDistanceToNow(new Date(milestone.submitted_at))} ago
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {milestone.submission_links.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="text-sm font-medium mb-2 flex items-center space-x-2">
                                                        <LinkIcon className="w-4 h-4" />
                                                        <span>Links</span>
                                                    </p>
                                                    <div className="space-y-1">
                                                        {milestone.submission_links.map((link, index) => (
                                                            <a
                                                                key={index}
                                                                href={link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-primary hover:underline block truncate"
                                                            >
                                                                {link}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {milestone.submission_files.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="text-sm font-medium mb-2 flex items-center space-x-2">
                                                        <Download className="w-4 h-4" />
                                                        <span>Files</span>
                                                    </p>
                                                    <div className="space-y-1">
                                                        {milestone.submission_files.map((file, index) => (
                                                            <a
                                                                key={index}
                                                                href={file}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-primary hover:underline block truncate"
                                                            >
                                                                {file.split('/').pop() || file}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Review Actions (for Recruiters) */}
                                            {userRole === 'recruiter' && milestone.status === 'submitted' && !milestone.payment_released && (
                                                <div className="mt-4 p-4 bg-warning/5 rounded-lg border border-warning/20">
                                                    {reviewingMilestoneId === milestone.id ? (
                                                        <div className="space-y-4">
                                                            <h4 className="font-semibold text-sm">Review Submission</h4>

                                                            <div className="space-y-2">
                                                                <Label htmlFor={`review-comments-${milestone.id}`}>
                                                                    Feedback (Optional for approval, required for revision)
                                                                </Label>
                                                                <Textarea
                                                                    id={`review-comments-${milestone.id}`}
                                                                    placeholder="Provide feedback on the submission..."
                                                                    value={reviewComments}
                                                                    onChange={(e) => setReviewComments(e.target.value)}
                                                                    rows={3}
                                                                />
                                                            </div>

                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setReviewingMilestoneId(null);
                                                                        setReviewComments("");
                                                                    }}
                                                                    disabled={isApproving || isRequestingChanges}
                                                                    className="flex-1"
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <Button
                                                                    variant="destructive"
                                                                    onClick={() => handleRequestChanges(milestone)}
                                                                    disabled={isApproving || isRequestingChanges || !reviewComments.trim()}
                                                                    className="flex-1"
                                                                >
                                                                    {isRequestingChanges ? (
                                                                        <>
                                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                            Requesting...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <XCircle className="w-4 h-4 mr-2" />
                                                                            Request Changes
                                                                        </>
                                                                    )}
                                                                </Button>
                                                                {(() => {
                                                                    // Check if previous milestone needs to be approved first
                                                                    const previousMilestone = milestone.stage_number > 1 && job.milestones
                                                                        ? job.milestones.find((m: Milestone) => m.stage_number === milestone.stage_number - 1)
                                                                        : null;
                                                                    const canApprove = !previousMilestone || previousMilestone.status === 'approved';
                                                                    
                                                                    return (
                                                                        <Button
                                                                            onClick={() => handleApproveMilestone(milestone)}
                                                                            disabled={!canApprove || isApproving || isRequestingChanges}
                                                                            className="flex-1 bg-primary"
                                                                            title={!canApprove ? `Please approve Milestone ${milestone.stage_number - 1} first` : ''}
                                                                        >
                                                                            {isApproving ? (
                                                                                <>
                                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                                    Approving...
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                                                    {!canApprove ? `Approve Milestone ${milestone.stage_number - 1} First` : 'Approve & Disburse'}
                                                                                </>
                                                                            )}
                                                                        </Button>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-sm font-medium">This milestone is awaiting your review</p>
                                                            <Button
                                                                onClick={() => setReviewingMilestoneId(milestone.id)}
                                                                size="sm"
                                                                className="bg-primary"
                                                            >
                                                                Review Submission
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Claim Milestone Button (for Freelancers) */}
                                            {userRole === 'freelancer' &&
                                                milestone.status === 'approved' &&
                                                !milestone.payment_released &&
                                                job?.recruiter_wallet && (
                                                    <div className="mt-4 p-4 bg-success/5 rounded-lg border border-success/20">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h4 className="font-semibold text-success flex items-center space-x-2">
                                                                    <CheckCircle className="w-5 h-5" />
                                                                    <span>Milestone Approved!</span>
                                                                </h4>
                                                                <p className="text-sm text-muted-foreground mt-1">
                                                                    Your work has been approved. Claim your reward of {milestone.payment_amount.toFixed(2)} SOL from escrow.
                                                                </p>
                                                            </div>
                                                            <Button
                                                                onClick={() => handleClaimMilestone(milestone)}
                                                                disabled={claimingMilestoneId === milestone.id || claimingMilestoneId !== null}
                                                                className="bg-primary hover:opacity-90"
                                                            >
                                                                {claimingMilestoneId === milestone.id ? (
                                                                    <>
                                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                        Claiming...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Coins className="w-4 h-4 mr-2" />
                                                                        Claim {milestone.payment_amount.toFixed(2)} SOL
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                            {milestone.reviewer_comments && (
                                                <div className="mt-3 p-3 bg-primary/5 rounded border border-primary/20">
                                                    <p className="text-sm font-medium mb-1">Reviewer Comments</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {milestone.reviewer_comments}
                                                    </p>
                                                    {milestone.reviewed_at && (
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            Reviewed {formatDistanceToNow(new Date(milestone.reviewed_at))} ago
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Revision Required Action (for Freelancers) */}
                                            {userRole === 'freelancer' && milestone.status === 'revision_requested' && (
                                                <div className="mt-4 p-4 bg-warning/5 rounded-lg border border-warning/20">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h4 className="font-semibold text-warning flex items-center space-x-2">
                                                                <AlertCircle className="w-5 h-5" />
                                                                <span>Revision Required</span>
                                                            </h4>
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                The recruiter has requested changes to your submission.
                                                            </p>
                                                        </div>
                                                        <Button
                                                            onClick={() => navigate(`/freelancer-dashboard`)}
                                                            className="bg-primary hover:opacity-90"
                                                        >
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            Go to Project Workspace
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Payment Structure */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle>Payment Structure</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {stages.map((stage) => (
                                    <div
                                        key={stage.id}
                                        className="p-4 bg-gradient-card rounded-lg border border-border"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold">
                                                    {stage.stage_number}
                                                </div>
                                                <div>
                                                    <h4 className="font-medium">{stage.name}</h4>
                                                    {stage.description && (
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {stage.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-1 text-lg font-bold text-primary">
                                                <Coins className="w-5 h-5" />
                                                <span>{stage.payment.toFixed(2)} SOL</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Recruiter Info */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle>About the Recruiter</CardTitle>
                            </CardHeader>
                            <CardContent
                                className="space-y-4 cursor-pointer hover:bg-accent/50 transition-colors rounded-lg"
                                onClick={() => navigate(`/profile/${job.recruiter_id}`)}
                            >
                                <div className="flex items-center space-x-3">
                                    <Avatar className="w-16 h-16 border-2 border-border">
                                        <AvatarImage src={recruiterProfile?.avatar_url || undefined} />
                                        <AvatarFallback className="bg-primary text-background text-xl font-semibold">
                                            {recruiterProfile?.full_name?.charAt(0) || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <h3 className="font-semibold">
                                            {recruiterProfile?.company_name || recruiterProfile?.full_name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {recruiterProfile?.full_name}
                                        </p>
                                    </div>
                                </div>

                                <RatingBadge tier={recruiterTier} size="md" />

                                <Separator />

                                <div className="text-sm text-muted-foreground">
                                    Member since {formatDistanceToNow(new Date(job.created_at))} ago
                                </div>
                            </CardContent>
                        </Card>

                        {/* Apply Button */}
                        {userRole === "freelancer" && (
                            <Card className="bg-card border-border">
                                <CardContent className="pt-6">
                                    {hasApplied ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-center space-x-2 text-success">
                                                <CheckCircle className="w-5 h-5" />
                                                <span className="font-medium">Application Submitted</span>
                                            </div>
                                            <p className="text-xs text-center text-muted-foreground">
                                                The recruiter will review your application and contact you if selected.
                                            </p>
                                        </div>
                                    ) : (
                                        <Button
                                            className="w-full bg-primary text-lg py-6"
                                            onClick={() => setShowApplicationModal(true)}
                                        >
                                            Apply for this Job
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Active Project Button (for Recruiter) */}
                        {userRole === "recruiter" && job?.recruiter_id === user?.id && activeProjectId && (
                            <Card className="bg-card border-border border-primary/30">
                                <CardContent className="pt-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-center space-x-2 text-primary">
                                            <CheckCircle className="w-5 h-5" />
                                            <span className="font-medium">Project In Progress</span>
                                        </div>
                                        <p className="text-sm text-center text-muted-foreground">
                                            View milestone submissions and manage project progress
                                        </p>
                                        <Button
                                            className="w-full bg-primary text-lg py-6"
                                            onClick={() => navigate(`/projects/${activeProjectId}`)}
                                        >
                                            View Project Workspace
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Cancel Job Button (for Recruiter) */}
                        {userRole === "recruiter" && job?.recruiter_id === user?.id && job.status === 'active' && (
                            <Card className="bg-card border-border border-destructive/30">
                                <CardContent className="pt-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-center space-x-2 text-destructive">
                                            <AlertCircle className="w-5 h-5" />
                                            <span className="font-medium">Cancel Job / Reclaim Funds</span>
                                        </div>
                                        <p className="text-sm text-center text-muted-foreground">
                                            • If no milestones approved: Cancel job and reclaim full staked amount
                                            <br />
                                            • If milestones approved: Submit inquiry to support team for reclaim process
                                        </p>
                                        <Button
                                            variant="destructive"
                                            className="w-full text-lg py-6"
                                            onClick={handleCancelJob}
                                            disabled={isCanceling}
                                        >
                                            {isCanceling ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-5 h-5 mr-2" />
                                                    Cancel Job / Reclaim Funds
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Staking Info */}
                        <Card className="bg-card border-border border-warning/30">
                            <CardHeader>
                                <CardTitle className="text-sm">Payment Security</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex items-start space-x-2">
                                    <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                                    <p className="text-muted-foreground">
                                        Recruiter will stake {(job.total_payment * 0.2).toFixed(2)} SOL minimum
                                    </p>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                                    <p className="text-muted-foreground">
                                        Payments released automatically on milestone approval
                                    </p>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                                    <p className="text-muted-foreground">
                                        Blockchain-verified transactions
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Application Modal */}
            {showApplicationModal && (
                <ApplicationModal
                    jobId={job.id}
                    jobTitle={job.title}
                    isOpen={showApplicationModal}
                    onClose={() => setShowApplicationModal(false)}
                    onSuccess={() => {
                        setHasApplied(true);
                        setShowApplicationModal(false);
                        fetchJobDetails();
                    }}
                />
            )}
        </div>
    );
}

