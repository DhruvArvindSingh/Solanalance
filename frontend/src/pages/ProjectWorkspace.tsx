import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/apiClient/client";
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
import { VerifyFundsButton } from "@/components/VerifyFundsButton";
import { useMessagingStore } from "@/stores/messagingStore";
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
        id: string;
        title: string;
        description: string;
        total_payment: number;
        skills_required: string[];
        experience_level: string;
        duration: string;
        created_at: string;
        status: string;
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
    const { publicKey, sendTransaction } = useWallet();

    const [project, setProject] = useState<Project | null>(null);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);

    // Submission state - track per milestone
    const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
    const [submissionDescriptions, setSubmissionDescriptions] = useState<Record<string, string>>({});
    const [submissionLinks, setSubmissionLinks] = useState<Record<string, string>>({});
    const [submissionFiles, setSubmissionFiles] = useState<Record<string, File[]>>({});
    const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

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

            // TODO: Add rating check and counterparty profile fetch when API endpoints are available
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

            // Get freelancer wallet address
            const { data: freelancerProfile, error: profileError } = await apiClient.profile.getById(project.freelancer_id);
            if (profileError) throw new Error(profileError);

            if (!freelancerProfile?.wallet_address) {
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

            // Review milestone
            const { error: reviewError } = await apiClient.projects.reviewMilestone(milestone.id, {
                status: 'approved',
                comments: reviewComments || null,
                transaction_signature: signature,
            });

            if (reviewError) throw new Error(reviewError);

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

    const getStageProgress = () => {
        if (!project) return 0;
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
                        {/* Verify Funds Button for Freelancers on Active Jobs */}
                        {!isRecruiter && project.status === "active" && (
                            <div className="ml-4">
                                <VerifyFundsButton
                                    jobId={project.job.id}
                                    jobTitle={project.job.title}
                                    freelancerWallet={""} // Will be determined by the component
                                    expectedAmount={project.job.total_payment}
                                    variant="outline"
                                    size="default"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Job Details Section */}
                <Card className="glass border-white/10 mb-8">
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
                                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                                <Badge
                                    variant="outline"
                                    className={project.job.status === "active" ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground border-muted"}
                                >
                                    {project.job.status}
                                </Badge>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Total Payment</Label>
                                <div className="flex items-center space-x-1 text-xl font-bold text-gradient">
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
                    <Card className="glass border-white/10 mb-8">
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
                                                        className={editingMilestoneId === milestone.id ? "flex-1 bg-gradient-solana" : "w-full bg-gradient-solana"}
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
                                                    {!isRecruiter && milestone.status === 'submitted' && (
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
                                                            Edit
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
