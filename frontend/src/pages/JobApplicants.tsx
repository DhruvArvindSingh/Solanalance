import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingBadge } from "@/components/RatingBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StakingModal } from "@/components/StakingModal";
import {
    ArrowLeft,
    Calendar,
    ExternalLink,
    CheckCircle,
    XCircle,
    Clock,
    Star,
    Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Application {
    id: string;
    freelancer_id: string;
    cover_letter: string | null;
    estimated_completion_days: number;
    portfolio_urls: string[] | null;
    status: string;
    created_at: string;
    freelancer: {
        full_name: string;
        avatar_url: string | null;
        bio: string | null;
        skills: string[] | null;
        hourly_rate: number | null;
    };
    trust_points: {
        total_points: number;
        completed_projects: number;
        tier: "gold" | "silver" | "bronze" | "iron";
        average_rating: number | null;
    } | null;
}

export default function JobApplicants() {
    const { id } = useParams<{ id: string }>();
    const { user, userRole } = useAuth();
    const navigate = useNavigate();

    const [job, setJob] = useState<any>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [loading, setLoading] = useState(true);
    const [showStakingModal, setShowStakingModal] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectingId, setRejectingId] = useState<string | null>(null);

    useEffect(() => {
        if (!id || !user || userRole !== "recruiter") {
            navigate("/");
            return;
        }

        fetchApplications();
    }, [id, user, userRole]);

    const fetchApplications = async () => {
        if (!id || !user) return;

        try {
            setLoading(true);

            // Fetch job details
            const { data: jobData, error: jobError } = await supabase
                .from("jobs")
                .select("*")
                .eq("id", id)
                .eq("recruiter_id", user.id)
                .single();

            if (jobError) throw jobError;
            setJob(jobData);

            // Fetch applications with freelancer info
            const { data: applicationsData, error: applicationsError } = await supabase
                .from("applications")
                .select(`
          id,
          freelancer_id,
          cover_letter,
          estimated_completion_days,
          portfolio_urls,
          status,
          created_at
        `)
                .eq("job_id", id)
                .order("created_at", { ascending: false });

            if (applicationsError) throw applicationsError;

            // Fetch freelancer profiles and trust points for each application
            const enrichedApplications = await Promise.all(
                (applicationsData || []).map(async (app) => {
                    const [{ data: profile }, { data: trustData }] = await Promise.all([
                        supabase
                            .from("profiles")
                            .select("full_name, avatar_url, bio, skills, hourly_rate")
                            .eq("id", app.freelancer_id)
                            .single(),
                        supabase
                            .from("trust_points")
                            .select("total_points, completed_projects, tier, average_rating")
                            .eq("user_id", app.freelancer_id)
                            .single(),
                    ]);

                    return {
                        ...app,
                        freelancer: profile || {
                            full_name: "Unknown",
                            avatar_url: null,
                            bio: null,
                            skills: null,
                            hourly_rate: null,
                        },
                        trust_points: trustData,
                    };
                })
            );

            setApplications(enrichedApplications);
        } catch (error: any) {
            console.error("Error fetching applications:", error);
            toast.error("Failed to load applications");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFreelancer = async (application: Application) => {
        setSelectedApplication(application);
        setShowStakingModal(true);
    };

    const handleStakingSuccess = async () => {
        if (!selectedApplication) return;

        try {
            // Update job status
            await supabase
                .from("jobs")
                .update({
                    status: "in_progress",
                    selected_freelancer_id: selectedApplication.freelancer_id,
                })
                .eq("id", id);

            // Update application status to selected
            await supabase
                .from("applications")
                .update({ status: "selected" })
                .eq("id", selectedApplication.id);

            // Reject other applications
            const otherApplicationIds = applications
                .filter((app) => app.id !== selectedApplication.id)
                .map((app) => app.id);

            if (otherApplicationIds.length > 0) {
                await supabase
                    .from("applications")
                    .update({ status: "rejected" })
                    .in("id", otherApplicationIds);
            }

            toast.success("Freelancer selected successfully!");
            setShowStakingModal(false);
            navigate("/dashboard/recruiter");
        } catch (error: any) {
            console.error("Error selecting freelancer:", error);
            toast.error("Failed to select freelancer");
        }
    };

    const handleShortlist = async (applicationId: string) => {
        try {
            await supabase
                .from("applications")
                .update({ status: "shortlisted" })
                .eq("id", applicationId);

            toast.success("Applicant shortlisted");
            fetchApplications();
        } catch (error: any) {
            console.error("Error shortlisting:", error);
            toast.error("Failed to shortlist applicant");
        }
    };

    const handleReject = async (applicationId: string) => {
        try {
            await supabase
                .from("applications")
                .update({ status: "rejected" })
                .eq("id", applicationId);

            toast.success("Applicant rejected");
            setShowRejectDialog(false);
            setRejectingId(null);
            fetchApplications();
        } catch (error: any) {
            console.error("Error rejecting:", error);
            toast.error("Failed to reject applicant");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending":
                return "bg-warning/10 text-warning border-warning/30";
            case "shortlisted":
                return "bg-primary/10 text-primary border-primary/30";
            case "selected":
                return "bg-success/10 text-success border-success/30";
            case "rejected":
                return "bg-destructive/10 text-destructive border-destructive/30";
            default:
                return "bg-muted text-muted-foreground border-muted";
        }
    };

    const ApplicationCard = ({ application }: { application: Application }) => (
        <Card className="glass border-white/10 hover:border-white/20 transition-colors">
            <CardContent className="pt-6">
                <div className="flex items-start space-x-4 mb-4">
                    <Avatar className="w-16 h-16 border-2 border-white/10">
                        <AvatarImage src={application.freelancer.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-solana text-background text-xl font-semibold">
                            {application.freelancer.full_name.charAt(0)}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h3 className="text-lg font-semibold">{application.freelancer.full_name}</h3>
                                {application.trust_points && (
                                    <RatingBadge
                                        tier={application.trust_points.tier}
                                        points={application.trust_points.total_points}
                                        size="sm"
                                    />
                                )}
                            </div>
                            <Badge variant="outline" className={getStatusColor(application.status)}>
                                {application.status}
                            </Badge>
                        </div>

                        {application.freelancer.bio && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {application.freelancer.bio}
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                            <div className="flex items-center space-x-2 text-muted-foreground">
                                <Briefcase className="w-4 h-4" />
                                <span>
                                    {application.trust_points?.completed_projects || 0} completed
                                </span>
                            </div>
                            <div className="flex items-center space-x-2 text-muted-foreground">
                                <Star className="w-4 h-4" />
                                <span>
                                    {application.trust_points?.average_rating
                                        ? application.trust_points.average_rating.toFixed(1)
                                        : "No rating"}
                                </span>
                            </div>
                            <div className="flex items-center space-x-2 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>{application.estimated_completion_days} days</span>
                            </div>
                            <div className="flex items-center space-x-2 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>
                                    {formatDistanceToNow(new Date(application.created_at))} ago
                                </span>
                            </div>
                        </div>

                        {application.freelancer.skills && application.freelancer.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                                {application.freelancer.skills.slice(0, 5).map((skill, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                        {skill}
                                    </Badge>
                                ))}
                                {application.freelancer.skills.length > 5 && (
                                    <Badge variant="secondary" className="text-xs">
                                        +{application.freelancer.skills.length - 5}
                                    </Badge>
                                )}
                            </div>
                        )}

                        {application.cover_letter && (
                            <>
                                <Separator className="my-3" />
                                <div>
                                    <p className="text-sm font-medium mb-1">Cover Letter</p>
                                    <p className="text-sm text-muted-foreground">
                                        {application.cover_letter}
                                    </p>
                                </div>
                            </>
                        )}

                        {application.portfolio_urls && application.portfolio_urls.length > 0 && (
                            <>
                                <Separator className="my-3" />
                                <div>
                                    <p className="text-sm font-medium mb-2">Portfolio</p>
                                    <div className="space-y-1">
                                        {application.portfolio_urls.map((url, idx) => (
                                            <a
                                                key={idx}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center space-x-1 text-sm text-primary hover:underline"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                <span className="truncate">{url}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {application.status === "pending" && (
                            <>
                                <Separator className="my-4" />
                                <div className="flex space-x-2">
                                    <Button
                                        onClick={() => handleSelectFreelancer(application)}
                                        className="flex-1 bg-gradient-solana"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Select & Stake
                                    </Button>
                                    <Button
                                        onClick={() => handleShortlist(application.id)}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Shortlist
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setRejectingId(application.id);
                                            setShowRejectDialog(true);
                                        }}
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </Button>
                                </div>
                            </>
                        )}

                        {application.status === "shortlisted" && (
                            <>
                                <Separator className="my-4" />
                                <div className="flex space-x-2">
                                    <Button
                                        onClick={() => handleSelectFreelancer(application)}
                                        className="flex-1 bg-gradient-solana"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Select & Stake
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setRejectingId(application.id);
                                            setShowRejectDialog(true);
                                        }}
                                        variant="outline"
                                        className="flex-1 text-destructive"
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Reject
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

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
                    <Button onClick={() => navigate("/dashboard/recruiter")}>
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    const pendingApplications = applications.filter((a) => a.status === "pending");
    const shortlistedApplications = applications.filter((a) => a.status === "shortlisted");
    const rejectedApplications = applications.filter((a) => a.status === "rejected");

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

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">{job.title}</h1>
                    <p className="text-muted-foreground">
                        Review applications and select the best freelancer for your project
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="glass border-white/10">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-3xl font-bold">{applications.length}</p>
                                <p className="text-sm text-muted-foreground">Total Applications</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="glass border-white/10">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-warning">{pendingApplications.length}</p>
                                <p className="text-sm text-muted-foreground">Pending Review</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="glass border-white/10">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-primary">{shortlistedApplications.length}</p>
                                <p className="text-sm text-muted-foreground">Shortlisted</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="glass border-white/10">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-gradient">{job.total_payment.toFixed(2)} SOL</p>
                                <p className="text-sm text-muted-foreground">Total Payment</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Applications Tabs */}
                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-6">
                        <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
                        <TabsTrigger value="pending">Pending ({pendingApplications.length})</TabsTrigger>
                        <TabsTrigger value="shortlisted">Shortlisted ({shortlistedApplications.length})</TabsTrigger>
                        <TabsTrigger value="rejected">Rejected ({rejectedApplications.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-4">
                        {applications.length > 0 ? (
                            applications.map((app) => <ApplicationCard key={app.id} application={app} />)
                        ) : (
                            <Card className="glass border-white/10">
                                <CardContent className="py-16 text-center">
                                    <p className="text-muted-foreground">No applications yet</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="pending" className="space-y-4">
                        {pendingApplications.length > 0 ? (
                            pendingApplications.map((app) => <ApplicationCard key={app.id} application={app} />)
                        ) : (
                            <Card className="glass border-white/10">
                                <CardContent className="py-16 text-center">
                                    <p className="text-muted-foreground">No pending applications</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="shortlisted" className="space-y-4">
                        {shortlistedApplications.length > 0 ? (
                            shortlistedApplications.map((app) => <ApplicationCard key={app.id} application={app} />)
                        ) : (
                            <Card className="glass border-white/10">
                                <CardContent className="py-16 text-center">
                                    <p className="text-muted-foreground">No shortlisted applications</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="rejected" className="space-y-4">
                        {rejectedApplications.length > 0 ? (
                            rejectedApplications.map((app) => <ApplicationCard key={app.id} application={app} />)
                        ) : (
                            <Card className="glass border-white/10">
                                <CardContent className="py-16 text-center">
                                    <p className="text-muted-foreground">No rejected applications</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Staking Modal */}
            {selectedApplication && showStakingModal && (
                <StakingModal
                    isOpen={showStakingModal}
                    onClose={() => {
                        setShowStakingModal(false);
                        setSelectedApplication(null);
                    }}
                    jobId={job.id}
                    jobTitle={job.title}
                    freelancerName={selectedApplication.freelancer.full_name}
                    totalPayment={job.total_payment}
                    onSuccess={handleStakingSuccess}
                />
            )}

            {/* Reject Confirmation Dialog */}
            <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <AlertDialogContent className="glass border-white/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reject Application?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The freelancer will be notified that their
                            application has been rejected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRejectingId(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => rejectingId && handleReject(rejectingId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Reject
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

