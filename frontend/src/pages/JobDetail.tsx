import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/apiClient/client";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { approveMilestone } from "@/lib/escrow-operations";
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
    
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();


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
                    recruiter_id: jobData.recruiter_id
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
        if (!publicKey) {
            toast.error("Please connect your wallet to approve milestone");
            return;
        }

        if (!job || !activeProjectId) {
            toast.error("Project information not found");
            return;
        }

        setIsApproving(true);

        try {
            // Call smart contract to approve milestone
            const milestoneIndex = milestone.stage_number - 1; // Convert to 0-indexed
            
            toast.info("Approving milestone on blockchain...");
            const result = await approveMilestone(
                { publicKey, sendTransaction },
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
            toast.error(error.message || "Failed to approve milestone");
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Job Header */}
                        <Card className="glass border-white/10">
                            <CardHeader>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h1 className="text-3xl font-bold mb-3">{job.title}</h1>
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

                                    <div className="text-right">
                                        <div className="flex items-center space-x-2 text-3xl font-bold text-gradient mb-1">
                                            <Coins className="w-8 h-8" />
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
                        <Card className="glass border-white/10">
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
                        <Card className="glass border-white/10">
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
                            <Card className="glass border-white/10 border-success/30">
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
                                            <AvatarFallback className="bg-gradient-solana text-background text-xl font-semibold">
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

                        {/* Milestone Submissions (for active jobs) */}
                        {job.status === 'active' && milestones.length > 0 && (
                            <Card className="glass border-white/10">
                                <CardHeader>
                                    <CardTitle>Milestone Submissions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {milestones.map((milestone) => (
                                        <div
                                            key={milestone.id}
                                            className="p-4 bg-gradient-card rounded-lg border border-white/5"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-solana flex items-center justify-center text-sm font-bold">
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
                                                    <div className="flex items-center space-x-1 text-lg font-bold text-gradient">
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
                                                <div className="mt-3 p-3 bg-background/50 rounded border border-white/5">
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
                                                                <Button
                                                                    onClick={() => handleApproveMilestone(milestone)}
                                                                    disabled={isApproving || isRequestingChanges}
                                                                    className="flex-1 bg-gradient-solana"
                                                                >
                                                                    {isApproving ? (
                                                                        <>
                                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                            Approving...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                                            Approve & Disburse
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-sm font-medium">This milestone is awaiting your review</p>
                                                            <Button
                                                                onClick={() => setReviewingMilestoneId(milestone.id)}
                                                                size="sm"
                                                                className="bg-gradient-solana"
                                                            >
                                                                Review Submission
                                                            </Button>
                                                        </div>
                                                    )}
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
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Payment Structure */}
                        <Card className="glass border-white/10">
                            <CardHeader>
                                <CardTitle>Payment Structure</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {stages.map((stage) => (
                                    <div
                                        key={stage.id}
                                        className="p-4 bg-gradient-card rounded-lg border border-white/5"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-solana flex items-center justify-center text-sm font-bold">
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
                                            <div className="flex items-center space-x-1 text-lg font-bold text-gradient">
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
                        <Card className="glass border-white/10">
                            <CardHeader>
                                <CardTitle>About the Recruiter</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center space-x-3">
                                    <Avatar className="w-16 h-16 border-2 border-white/10">
                                        <AvatarImage src={recruiterProfile?.avatar_url || undefined} />
                                        <AvatarFallback className="bg-gradient-solana text-background text-xl font-semibold">
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
                            <Card className="glass border-white/10">
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
                                            className="w-full bg-gradient-solana text-lg py-6"
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
                            <Card className="glass border-white/10 border-primary/30">
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
                                            className="w-full bg-gradient-solana text-lg py-6"
                                            onClick={() => navigate(`/projects/${activeProjectId}`)}
                                        >
                                            View Project Workspace
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Staking Info */}
                        <Card className="glass border-white/10 border-warning/30">
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

