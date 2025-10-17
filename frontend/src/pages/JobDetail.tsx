import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/apiClient/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

                // Check if current user has applied
                if (user) {
                    const { data: applicationData, error: appError } = await apiClient.applications.checkApplication(id!);
                    console.log("applicationData", applicationData);
                    console.log("appError", appError);
                    if (!appError && applicationData) {
                        setHasApplied(applicationData.hasApplied);
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

