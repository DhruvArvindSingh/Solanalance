import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/apiClient/client";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { claimMilestone } from "@/lib/escrow-operations";
import { getEscrowAccount } from "@/lib/solana";
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
import { VerifyFundsButton } from "@/components/VerifyFundsButton";
import { SyncBlockchainButton } from "@/components/SyncBlockchainButton";
import { TransactionHistory } from "@/components/TransactionHistory";
import { useMessagingStore } from "@/stores/messagingStore";
import { useEscrowWithVerification } from "@/hooks/useEscrowWithVerification";
import { getMilestoneStatus } from "@/lib/escrow-operations";
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
    Edit,
    RefreshCw,
    Copy,
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
    transaction_signature: string | null;
    stage: {
        name: string;
        description: string | null;
    };
}

interface EscrowData {
    initialStaked: number;
    currentStaked: number;
    claimable: number;
    released: number;
    milestones: Array<{
        amount: number;
        approved: boolean;
        claimed: boolean;
    }>;
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
        id: string;
        title: string;
        description: string;
        total_payment: number;
        skills_required: string[];
        experience_level: string;
        duration: string;
        created_at: string;
        status: string;
        recruiter_wallet: string | null;
        freelancer_wallet: string | null;
    };
    staking: {
        total_staked: number;
        total_released: number;
    };
}

export default function ProjectWorkspace() {
    const { id } = useParams<{ id: string }>();
    const { user, userRole } = useAuth();
    const { sendMessage } = useMessagingStore();
    const navigate = useNavigate();
    const { connection } = useConnection();
    const wallet = useWallet();
    const { publicKey } = wallet;
    const { approveMilestonePayment, claimMilestonePayment } = useEscrowWithVerification();

    const [project, setProject] = useState<Project | null>(null);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);
    const [recruiterWallet, setRecruiterWallet] = useState<string>("");
    const [escrowData, setEscrowData] = useState<EscrowData | null>(null);
    const [isLoadingEscrow, setIsLoadingEscrow] = useState(false);

    // Submission state - track per milestone
    const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
    const [submissionDescriptions, setSubmissionDescriptions] = useState<Record<string, string>>({});
    const [submissionLinks, setSubmissionLinks] = useState<Record<string, string>>({});
    const [submissionFiles, setSubmissionFiles] = useState<Record<string, File[]>>({});
    const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

    // Review state
    const [isReviewing, setIsReviewing] = useState(false);

    // Claim state
    const [isClaimingPayment, setIsClaimingPayment] = useState<Record<string, boolean>>({});
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

    // Fetch escrow data when project and recruiter wallet are available
    useEffect(() => {
        if (project && recruiterWallet) {
            fetchEscrowData();
        }
    }, [project, recruiterWallet]);

    // Pre-populate form data for revision_requested milestones
    useEffect(() => {
        if (milestones.length > 0) {
            const newDescriptions: { [key: string]: string } = {};
            const newLinks: { [key: string]: string } = {};

            milestones.forEach(milestone => {
                if (milestone.status === 'revision_requested' && milestone.submission_description) {
                    newDescriptions[milestone.id] = milestone.submission_description;
                    newLinks[milestone.id] = (milestone.submission_links || []).join('\n');
                }
            });

            if (Object.keys(newDescriptions).length > 0) {
                setSubmissionDescriptions(prev => ({ ...prev, ...newDescriptions }));
            }
            if (Object.keys(newLinks).length > 0) {
                setSubmissionLinks(prev => ({ ...prev, ...newLinks }));
            }
        }
    }, [milestones]);

    const fetchProjectData = async () => {
        if (!id || !user) return;

        try {
            setLoading(true);

            // Fetch project with job and staking info
            const { data: projectData, error: projectError } = await apiClient.projects.getById(id);

            if (projectError) throw new Error(projectError);

            // Check if user has access to this project
            if (
                projectData.recruiter_id !== user.id &&
                projectData.freelancer_id !== user.id
            ) {
                toast.error("You don't have access to this project");
                navigate("/");
                return;
            }

            setProject(projectData);
            setMilestones(projectData.milestones || []);

            // Get recruiter wallet address from job data
            console.log("projectData", projectData);
            if (projectData.job?.recruiter_wallet) {
                setRecruiterWallet(projectData.job.recruiter_wallet);
                console.log("Recruiter wallet from job:", projectData.job.recruiter_wallet);
            } else {
                console.warn("No recruiter wallet found in job data, fetching from profile");
                // Fallback to recruiter's profile wallet for verification
                try {
                    const { data: recruiterProfile } = await apiClient.profile.getById(projectData.recruiter_id);
                    if (recruiterProfile?.wallet_address) {
                        setRecruiterWallet(recruiterProfile.wallet_address);
                        console.log("Using recruiter profile wallet:", recruiterProfile.wallet_address);
                    }
                } catch (error) {
                    console.error("Failed to fetch recruiter profile:", error);
                }
            }

            // Check if user has already rated
            setHasRated(false);

            // Get counterparty info
            const counterpartyUserId = projectData.recruiter_id === user.id
                ? projectData.freelancer_id
                : projectData.recruiter_id;

            try {
                const { data: counterpartyProfile, error: profileError } = await apiClient.profile.getById(counterpartyUserId);
                if (profileError) throw new Error(profileError);

                setCounterpartyInfo({
                    id: counterpartyUserId,
                    name: counterpartyProfile.full_name || "Unknown User",
                });
            } catch (error) {
                console.error("Error fetching counterparty profile:", error);
                setCounterpartyInfo({
                    id: counterpartyUserId,
                    name: "Unknown User",
                });
            }
        } catch (error: any) {
            console.error("Error fetching project:", error);
            toast.error("Failed to load project");
        } finally {
            setLoading(false);
        }
    };

    const fetchEscrowData = async () => {
        if (!project || !recruiterWallet) return;

        setIsLoadingEscrow(true);
        try {
            // Fetch milestone status from blockchain
            const milestoneStatuses = await getMilestoneStatus(recruiterWallet, project.job_id);

            if (milestoneStatuses && milestoneStatuses.length > 0) {
                // Calculate values from blockchain data
                const totalInitialStaked = milestoneStatuses.reduce((sum, milestone) => sum + milestone.amount, 0);
                const totalClaimed = milestoneStatuses.reduce((sum, milestone) =>
                    milestone.claimed ? sum + milestone.amount : sum, 0);
                const totalClaimable = milestoneStatuses.reduce((sum, milestone) =>
                    milestone.approved && !milestone.claimed ? sum + milestone.amount : sum, 0);

                // Current staked is initial staked minus what's been claimed
                const currentStaked = totalInitialStaked - totalClaimed;

                setEscrowData({
                    initialStaked: totalInitialStaked,
                    currentStaked: currentStaked,
                    claimable: totalClaimable,
                    released: totalClaimed,
                    milestones: milestoneStatuses
                });
            } else {
                // No escrow data available yet
                setEscrowData({
                    initialStaked: 0,
                    currentStaked: 0,
                    claimable: 0,
                    released: 0,
                    milestones: []
                });
            }
        } catch (error) {
            console.error("Error fetching escrow data:", error);
            toast.error("Failed to fetch escrow data");
            // Set default values on error
            setEscrowData({
                initialStaked: 0,
                currentStaked: 0,
                claimable: 0,
                released: 0,
                milestones: []
            });
        } finally {
            setIsLoadingEscrow(false);
        }
    };

    const handleFileSelect = (milestoneId: string, files: FileList | null) => {
        if (!files || files.length === 0) return;

        const fileArray = Array.from(files);
        const maxSize = 10 * 1024 * 1024; // 10MB per file
        const maxFiles = 5;

        // Validate file sizes
        const oversizedFiles = fileArray.filter(f => f.size > maxSize);
        if (oversizedFiles.length > 0) {
            toast.error(`Some files exceed 10MB limit: ${oversizedFiles.map(f => f.name).join(", ")}`);
            return;
        }

        // Validate total number of files
        const currentFiles = submissionFiles[milestoneId] || [];
        if (currentFiles.length + fileArray.length > maxFiles) {
            toast.error(`Maximum ${maxFiles} files allowed`);
            return;
        }

        setSubmissionFiles(prev => ({
            ...prev,
            [milestoneId]: [...currentFiles, ...fileArray]
        }));
    };

    const handleRemoveFile = (milestoneId: string, index: number) => {
        setSubmissionFiles(prev => ({
            ...prev,
            [milestoneId]: (prev[milestoneId] || []).filter((_, i) => i !== index)
        }));
    };

    const handleSubmitMilestone = async (milestoneId: string) => {
        const description = submissionDescriptions[milestoneId] || "";
        if (!description.trim()) {
            toast.error("Please provide a description of your work");
            return;
        }

        setIsSubmitting(prev => ({ ...prev, [milestoneId]: true }));

        try {
            const links = (submissionLinks[milestoneId] || "")
                .split("\n")
                .map((l) => l.trim())
                .filter((l) => l.length > 0);

            // Prepare FormData with files and other data
            const formData = new FormData();
            formData.append('submission_description', description);

            // Add links as JSON array
            if (links.length > 0) {
                formData.append('submission_links', JSON.stringify(links));
            }

            // Add files directly to FormData
            const files = submissionFiles[milestoneId] || [];
            if (files.length > 0) {
                files.forEach((file) => {
                    formData.append('files', file);
                });
                toast.info(`Uploading ${files.length} file(s)...`);
            }

            const { error } = await apiClient.projects.submitMilestone(milestoneId, formData);

            if (error) throw new Error(error);

            toast.success("Milestone submitted for review");
            setSubmissionDescriptions(prev => ({ ...prev, [milestoneId]: "" }));
            setSubmissionLinks(prev => ({ ...prev, [milestoneId]: "" }));
            setSubmissionFiles(prev => ({ ...prev, [milestoneId]: [] }));
            fetchProjectData();
        } catch (error: any) {
            console.error("Error submitting milestone:", error);
            toast.error("Failed to submit milestone");
        } finally {
            setIsSubmitting(prev => ({ ...prev, [milestoneId]: false }));
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

            // Call smart contract to approve milestone
            const result = await approveMilestonePayment(
                project.job_id,
                milestone.stage_number - 1, // Convert to 0-indexed (0, 1, 2)
                async (data) => {
                    // Update backend after on-chain approval succeeds
                    const { error: reviewError } = await apiClient.projects.reviewMilestone(
                        milestone.id,
                        {
                            status: 'approved',
                            comments: reviewComments || null,
                            transaction_signature: data.txSignature,
                        }
                    );

                    if (reviewError) throw new Error(reviewError);

                    toast.success("Milestone approved! Freelancer can now claim payment.");
                    setReviewComments("");
                    fetchProjectData();
                    fetchEscrowData();

                    // If this was the final milestone, show rating modal
                    if (milestone.stage_number === 3) {
                        setTimeout(() => {
                            setShowRatingModal(true);
                        }, 1500);
                    }
                }
            );

            if (!result.success) {
                throw new Error(result.error || "Failed to approve milestone");
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
            const { error } = await apiClient.projects.reviewMilestone(milestoneId, {
                status: 'revision_requested',
                comments: reviewComments,
            });

            if (error) throw new Error(error);

            toast.success("Revision requested");
            setReviewComments("");
            fetchProjectData();
        } catch (error: any) {
            console.error("Error requesting revision:", error);
            toast.error("Failed to request revision");
        }
    };

    const handleClaimMilestone = async (milestone: Milestone) => {
        console.log("=== CLAIM MILESTONE DEBUG START ===");
        console.log("Milestone:", milestone);
        console.log("Connected wallet:", publicKey?.toBase58());

        if (!publicKey) {
            console.error("No wallet connected");
            toast.error("Please connect your wallet to claim reward");
            return;
        }

        if (!project) {
            console.error("No project data");
            toast.error("Project information not found");
            return;
        }

        console.log("Project data:", {
            id: project.id,
            job_id: project.job_id,
            recruiter_id: project.recruiter_id,
            freelancer_id: project.freelancer_id,
            staking: project.staking
        });

        // Check if funds have been staked
        if (project.staking.total_staked === 0) {
            console.error("Escrow not funded. Total staked:", project.staking.total_staked);
            toast.error("Escrow has not been funded yet. The recruiter needs to stake funds before you can claim payment.");
            return;
        }

        setIsClaimingPayment(prev => ({ ...prev, [milestone.id]: true }));

        try {
            // Get recruiter wallet address from project data (no need to fetch profile)
            const recruiterWalletAddress = project.job.recruiter_wallet;

            if (!recruiterWalletAddress) {
                console.error("Recruiter wallet address missing from project data");
                throw new Error("Recruiter wallet not found in project data");
            }

            console.log("Recruiter wallet from project:", recruiterWalletAddress);

            // Fetch escrow data from blockchain to get the actual freelancer wallet and milestone status
            console.log("Fetching escrow data from blockchain...");
            const escrowAccount = await getEscrowAccount(recruiterWalletAddress, project.job_id);

            if (!escrowAccount) {
                console.error("Escrow account not found on blockchain");
                throw new Error("Escrow account not found. Funds may not have been staked yet.");
            }

            console.log("Escrow account data:", escrowAccount);

            // Get milestone index (0-based)
            const milestoneIndex = milestone.stage_number - 1;

            // Check if milestone is approved on blockchain
            const isApproved = escrowAccount.milestonesApproved[milestoneIndex];
            const isClaimed = escrowAccount.milestonesClaimed[milestoneIndex];

            console.log(`Milestone ${milestone.stage_number} blockchain status:`, {
                approved: isApproved,
                claimed: isClaimed
            });

            if (!isApproved) {
                console.error("Milestone not approved on blockchain");
                throw new Error("This milestone has not been approved yet. The recruiter must approve it first.");
            }

            if (isClaimed) {
                console.error("Milestone already claimed on blockchain");
                throw new Error("This milestone has already been claimed.");
            }

            // Verify the connected wallet matches the freelancer wallet from escrow
            const connectedWallet = publicKey.toBase58();
            const escrowFreelancerWallet = escrowAccount.freelancer;

            console.log("Wallet verification:", {
                connected: connectedWallet,
                escrowFreelancer: escrowFreelancerWallet,
                match: connectedWallet === escrowFreelancerWallet
            });

            if (connectedWallet !== escrowFreelancerWallet) {
                console.error("Wallet mismatch with escrow!");
                throw new Error(`Connected wallet does not match the freelancer wallet in the escrow. Expected: ${escrowFreelancerWallet}`);
            }

            // Call smart contract to claim milestone
            console.log("Calling claimMilestone with params:", {
                jobId: project.job_id,
                recruiterWallet: recruiterWalletAddress,
                milestoneIndex: milestoneIndex,
                freelancerWallet: connectedWallet
            });

            toast.info("Claiming milestone reward from escrow...");
            const result = await claimMilestone(
                wallet,
                project.job_id,
                recruiterWalletAddress,
                milestoneIndex
            );

            console.log("Claim result:", result);

            if (!result.success) {
                console.error("Claim failed:", result.error);
                throw new Error(result.error || "Failed to claim milestone from blockchain");
            }

            console.log("Claim successful! Transaction:", result.txSignature);
            toast.success("Milestone reward claimed successfully!");

            // Update backend to mark payment as released
            console.log("Updating backend for milestone:", milestone.id);
            const { error } = await apiClient.projects.claimMilestone(milestone.id, {
                transaction_signature: result.txSignature
            });

            if (error) {
                console.error("Backend update error:", error);
                toast.warning("Funds claimed but database update failed. Please refresh the page.");
            } else {
                console.log("Backend updated successfully");
            }

            // Refresh project data and escrow data
            console.log("Refreshing project data...");
            fetchProjectData();
            fetchEscrowData();
            console.log("=== CLAIM MILESTONE DEBUG END (SUCCESS) ===");
        } catch (error: any) {
            console.error("=== CLAIM MILESTONE ERROR ===");
            console.error("Error type:", error.constructor?.name);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
            console.error("Full error:", error);
            console.error("=== CLAIM MILESTONE DEBUG END (ERROR) ===");

            toast.error(error.message || "Failed to claim milestone reward");
        } finally {
            setIsClaimingPayment(prev => ({ ...prev, [milestone.id]: false }));
        }
    };

    const getStageProgress = () => {
        if (!project) return 0;

        // If project is completed, show 100% progress
        if (project.status === "completed") return 100;

        return (project.current_stage / 3) * 100;
    };

    const getMilestoneStatusColor = (status: string) => {
        switch (status) {
            case "pending":
                return "bg-muted text-muted-foreground border-muted";
            case "submitted":
                return "bg-warning/10 text-warning border-warning/30";
            case "approved":
                return "bg-success/10 text-success border-success/30";
            case "claimed":
            case "completed":
                return "bg-success/20 text-success border-success/50";
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
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">{project.job.title}</h1>
                            <p className="text-muted-foreground">
                                Started {formatDistanceToNow(new Date(project.started_at))} ago
                            </p>
                        </div>
                        {/* Action Buttons for Active and Completed Jobs */}
                        {(project.status === "active" || project.status === "completed") && (
                            <div className="ml-4 flex gap-2">
                                {/* Verify Funds Button for Freelancers on Active Jobs */}
                                {!isRecruiter && recruiterWallet && project.status === "active" && (
                                    <VerifyFundsButton
                                        jobId={project.job.id}
                                        jobTitle={project.job.title}
                                        recruiterWallet={recruiterWallet}
                                        expectedAmount={project.job.total_payment}
                                        variant="outline"
                                        size="default"
                                    />
                                )}
                                {/* Sync Blockchain Button for all users */}
                                <SyncBlockchainButton
                                    jobId={project.job.id}
                                    variant="outline"
                                    size="default"
                                    showFixPayments={milestones.some(m => m.payment_amount === 0) && project.job.total_payment > 0}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Job Details Section */}
                <Card className="bg-card border-border mb-8">
                    <CardHeader>
                        <CardTitle>Job Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Job ID</Label>
                                <p className="font-mono text-sm">{project.job.id}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Project Status</Label>
                                <Badge
                                    variant="outline"
                                    className={
                                        project.status === "completed"
                                            ? "bg-success/10 text-success border-success/30"
                                            : project.status === "active"
                                                ? "bg-primary/10 text-primary border-primary/30"
                                                : "bg-muted text-muted-foreground border-muted"
                                    }
                                >
                                    {project.status}
                                </Badge>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Total Payment</Label>
                                <div className="flex items-center space-x-1 text-xl font-bold text-primary">
                                    <Coins className="w-5 h-5" />
                                    <span>{project.job.total_payment.toFixed(2)} SOL</span>
                                </div>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Experience Level</Label>
                                <p className="font-medium">{project.job.experience_level || "Not specified"}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Duration</Label>
                                <p className="font-medium">{project.job.duration || "Not specified"}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Posted</Label>
                                <p className="font-medium">
                                    {formatDistanceToNow(new Date(project.job.created_at))} ago
                                </p>
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <Label className="text-sm font-medium text-muted-foreground block mb-2">Description</Label>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {project.job.description || "No description provided."}
                            </p>
                        </div>

                        {project.job.skills_required && project.job.skills_required.length > 0 && (
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground block mb-2">Required Skills</Label>
                                <div className="flex flex-wrap gap-2">
                                    {project.job.skills_required.map((skill, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Freelancer Information (for Recruiters) */}
                {isRecruiter && counterpartyInfo && (
                    <Card className="bg-card border-border mb-8">
                        <CardHeader>
                            <CardTitle>Freelancer Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-start space-x-4">
                                <div className="flex-1">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                                            <p className="font-medium text-lg">{counterpartyInfo.name}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-muted-foreground">Freelancer ID</Label>
                                            <p className="font-mono text-sm">{project.freelancer_id}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigate(`/profile/${project.freelancer_id}`)}
                                        >
                                            View Full Profile
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Progress Timeline */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle>Project Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative">
                                    {/* Progress Bar */}
                                    <div className="h-2 bg-muted rounded-full mb-8">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all duration-500"
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
                                                        ? "bg-primary text-background"
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
                                                <div className="flex items-center space-x-1 text-xs text-primary font-semibold">
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
                                className="bg-card border-border"
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
                                    {/* Edit & Resubmit Button for Revision Requested (Freelancers) */}
                                    {!isRecruiter &&
                                        milestone.status === 'revision_requested' &&
                                        editingMilestoneId !== milestone.id && (
                                            <div className="p-4 bg-warning/5 rounded-lg border border-warning/20">
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
                                                        onClick={() => {
                                                            setEditingMilestoneId(milestone.id);
                                                            setSubmissionDescriptions(prev => ({
                                                                ...prev,
                                                                [milestone.id]: milestone.submission_description || ''
                                                            }));
                                                            setSubmissionLinks(prev => ({
                                                                ...prev,
                                                                [milestone.id]: (milestone.submission_links || []).join('\n')
                                                            }));
                                                        }}
                                                        className="bg-primary hover:opacity-90"
                                                    >
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        Edit & Resubmit
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                    {/* Payment Info */}
                                    <div className="flex items-center justify-between p-3 bg-gradient-card rounded-lg">
                                        <span className="text-sm text-muted-foreground">
                                            Payment for this stage
                                        </span>
                                        <div className="flex items-center space-x-1 text-xl font-bold text-primary">
                                            <Coins className="w-5 h-5" />
                                            <span>{milestone.payment_amount.toFixed(2)} SOL</span>
                                        </div>
                                    </div>

                                    {/* Submission Form (for Freelancers) */}
                                    {!isRecruiter &&
                                        ((milestone.status === "pending" ||
                                            milestone.status === "revision_requested") ||
                                            editingMilestoneId === milestone.id) &&
                                        !milestone.payment_released &&
                                        project.status === "active" && (
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
                                                    <Label htmlFor={`description-${milestone.id}`}>
                                                        Describe your work *
                                                    </Label>
                                                    <Textarea
                                                        id={`description-${milestone.id}`}
                                                        placeholder="Explain what you've completed for this stage..."
                                                        value={submissionDescriptions[milestone.id] || ""}
                                                        onChange={(e) =>
                                                            setSubmissionDescriptions(prev => ({
                                                                ...prev,
                                                                [milestone.id]: e.target.value
                                                            }))
                                                        }
                                                        rows={4}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor={`links-${milestone.id}`}>Links (Optional)</Label>
                                                    <Textarea
                                                        id={`links-${milestone.id}`}
                                                        placeholder="GitHub repo, demo link, etc. (one per line)"
                                                        value={submissionLinks[milestone.id] || ""}
                                                        onChange={(e) => setSubmissionLinks(prev => ({
                                                            ...prev,
                                                            [milestone.id]: e.target.value
                                                        }))}
                                                        rows={3}
                                                        className="font-mono text-sm"
                                                    />
                                                </div>

                                                {/* File Upload Section */}
                                                <div className="space-y-2">
                                                    <Label htmlFor={`files-${milestone.id}`}>
                                                        Files (Optional)
                                                        <span className="text-xs text-muted-foreground ml-2">
                                                            Max 5 files, 10MB each
                                                        </span>
                                                    </Label>
                                                    <div className="space-y-2">
                                                        <Input
                                                            id={`files-${milestone.id}`}
                                                            type="file"
                                                            multiple
                                                            onChange={(e) => handleFileSelect(milestone.id, e.target.files)}
                                                            className="cursor-pointer"
                                                            accept=".pdf,.doc,.docx,.txt,.zip,.png,.jpg,.jpeg,.gif"
                                                        />

                                                        {/* Display selected files */}
                                                        {(submissionFiles[milestone.id] || []).length > 0 && (
                                                            <div className="space-y-1 p-2 bg-muted/50 rounded-md">
                                                                {(submissionFiles[milestone.id] || []).map((file, index) => (
                                                                    <div
                                                                        key={index}
                                                                        className="flex items-center justify-between p-2 bg-background rounded text-sm"
                                                                    >
                                                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                                                            <Upload className="w-4 h-4 text-primary flex-shrink-0" />
                                                                            <span className="truncate">{file.name}</span>
                                                                            <span className="text-xs text-muted-foreground flex-shrink-0">
                                                                                ({(file.size / 1024).toFixed(1)} KB)
                                                                            </span>
                                                                        </div>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleRemoveFile(milestone.id, index)}
                                                                            className="h-6 w-6 p-0 flex-shrink-0"
                                                                        >
                                                                            <XCircle className="w-4 h-4 text-destructive" />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    {editingMilestoneId === milestone.id && (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                setEditingMilestoneId(null);
                                                                setSubmissionDescriptions(prev => {
                                                                    const newState = { ...prev };
                                                                    delete newState[milestone.id];
                                                                    return newState;
                                                                });
                                                                setSubmissionLinks(prev => {
                                                                    const newState = { ...prev };
                                                                    delete newState[milestone.id];
                                                                    return newState;
                                                                });
                                                                setSubmissionFiles(prev => {
                                                                    const newState = { ...prev };
                                                                    delete newState[milestone.id];
                                                                    return newState;
                                                                });
                                                            }}
                                                            className="flex-1"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                    <Button
                                                        onClick={() => {
                                                            handleSubmitMilestone(milestone.id);
                                                            if (editingMilestoneId === milestone.id) {
                                                                setEditingMilestoneId(null);
                                                            }
                                                        }}
                                                        disabled={
                                                            isSubmitting[milestone.id] ||
                                                            !(submissionDescriptions[milestone.id] || "").trim()
                                                        }
                                                        className={editingMilestoneId === milestone.id ? "flex-1 bg-primary" : "w-full bg-primary"}
                                                    >
                                                        {isSubmitting[milestone.id] ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                {editingMilestoneId === milestone.id ? "Updating..." : "Submitting..."}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-4 h-4 mr-2" />
                                                                {editingMilestoneId === milestone.id ? "Update Submission" : "Submit Milestone"}
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                    {/* Submission Display */}
                                    {milestone.submission_description && editingMilestoneId !== milestone.id && (
                                        <div className="space-y-3">
                                            <Separator />
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-semibold flex items-center space-x-2">
                                                        <CheckCircle className="w-4 h-4 text-success" />
                                                        <span>Submitted Work</span>
                                                    </h4>
                                                    {!isRecruiter && (milestone.status === 'submitted' || milestone.status === 'revision_requested') && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingMilestoneId(milestone.id);
                                                                setSubmissionDescriptions(prev => ({
                                                                    ...prev,
                                                                    [milestone.id]: milestone.submission_description || ''
                                                                }));
                                                                setSubmissionLinks(prev => ({
                                                                    ...prev,
                                                                    [milestone.id]: (milestone.submission_links || []).join('\n')
                                                                }));
                                                            }}
                                                        >
                                                            {milestone.status === 'revision_requested' ? 'Edit & Resubmit' : 'Edit'}
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">
                                                    {milestone.submission_description}
                                                </p>
                                                {milestone.submission_files &&
                                                    milestone.submission_files.length > 0 && (
                                                        <div className="space-y-1 mb-3">
                                                            <p className="text-sm font-medium">Uploaded Files:</p>
                                                            {milestone.submission_files.map((fileUrl, idx) => {
                                                                const fileName = fileUrl.split('/').pop() || fileUrl;
                                                                return (
                                                                    <a
                                                                        key={idx}
                                                                        href={fileUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center space-x-2 text-sm text-primary hover:underline p-2 bg-muted/50 rounded"
                                                                    >
                                                                        <Download className="w-4 h-4 flex-shrink-0" />
                                                                        <span className="truncate">{fileName}</span>
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
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
                                                    className="flex-1 bg-primary"
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

                                    {/* Claim Reward Button (for Freelancers) */}
                                    {!isRecruiter &&
                                        milestone.status === 'approved' &&
                                        !milestone.payment_released &&
                                        project.status === "active" && (
                                            project.staking.total_staked > 0 ? (
                                                <div className="p-4 bg-success/5 rounded-lg border border-success/20">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div>
                                                            <h4 className="font-semibold text-success flex items-center space-x-2">
                                                                <CheckCircle className="w-5 h-5" />
                                                                <span>Milestone Approved!</span>
                                                            </h4>
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                Your work has been approved. Claim your reward of {milestone.payment_amount.toFixed(2)} SOL from escrow.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={() => handleClaimMilestone(milestone)}
                                                        disabled={isClaimingPayment[milestone.id]}
                                                        className="w-full bg-primary"
                                                    >
                                                        {isClaimingPayment[milestone.id] ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                Claiming Reward...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Coins className="w-4 h-4 mr-2" />
                                                                Claim {milestone.payment_amount.toFixed(2)} SOL Reward
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Alert className="border-warning/30 bg-warning/10">
                                                    <AlertCircle className="h-4 w-4 text-warning" />
                                                    <AlertDescription>
                                                        <strong>Milestone Approved!</strong> However, the escrow has not been funded yet.
                                                        The recruiter needs to stake funds before you can claim your payment.
                                                    </AlertDescription>
                                                </Alert>
                                            )
                                        )}

                                    {/* Payment Released Display */}
                                    {milestone.payment_released && (
                                        <div className="space-y-3">
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
                                            
                                            {milestone.transaction_signature && (
                                                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                                                    <label className="text-sm font-medium text-muted-foreground">
                                                        Transaction Signature:
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <code className="flex-1 text-xs font-mono bg-background px-3 py-2 rounded border break-all">
                                                            {milestone.transaction_signature}
                                                        </code>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(milestone.transaction_signature!);
                                                                toast.success("Transaction signature copied!");
                                                            }}
                                                            className="h-8 w-8 p-0 flex-shrink-0"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                window.open(
                                                                    `https://explorer.solana.com/tx/${milestone.transaction_signature}?cluster=devnet`,
                                                                    '_blank'
                                                                );
                                                            }}
                                                            className="gap-2 flex-shrink-0"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                            Explorer
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Payment Summary */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Payment Summary</CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={fetchEscrowData}
                                        disabled={isLoadingEscrow}
                                        className="h-8 w-8 p-0"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isLoadingEscrow ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
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
                                        <span className="text-muted-foreground">Initial Staked:</span>
                                        <span className="font-semibold text-blue-500">
                                            {escrowData ? escrowData.initialStaked.toFixed(2) : '0.00'} SOL
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Current Staked:</span>
                                        <span className="font-semibold text-warning">
                                            {escrowData ? escrowData.currentStaked.toFixed(2) : project.staking.total_staked.toFixed(2)} SOL
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Claimable:</span>
                                        <span className="font-semibold text-purple-500">
                                            {escrowData ? escrowData.claimable.toFixed(2) : '0.00'} SOL
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Released:</span>
                                        <span className="font-semibold text-success">
                                            {escrowData ? escrowData.released.toFixed(2) : project.staking.total_released.toFixed(2)} SOL
                                        </span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Remaining:</span>
                                        <span className="text-xl font-bold text-primary">
                                            {escrowData ?
                                                (escrowData.currentStaked - escrowData.claimable).toFixed(2) :
                                                (project.staking.total_staked - project.staking.total_released).toFixed(2)
                                            } SOL
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
                        <Card className="bg-card border-border">
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

                    </div>

                    {/* Project Completed - Rating CTA */}
                    <div className="space-y-6">
                        {project.status === "completed" && !hasRated && counterpartyInfo && (
                            <Card className="bg-card border-success/30 bg-success/5">
                                <CardContent className="pt-6">
                                    <div className="text-center space-y-4">
                                        <h3 className="text-lg font-semibold">Project Completed! 🎉</h3>
                                        <p className="text-sm text-muted-foreground">
                                            How was your experience working with {counterpartyInfo.name}?
                                        </p>
                                        <Button
                                            onClick={() => setShowRatingModal(true)}
                                            className="bg-primary"
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

                {/* Transaction History Section */}
                <TransactionHistory
                    projectId={project.id}
                    className="mb-8"
                />
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
