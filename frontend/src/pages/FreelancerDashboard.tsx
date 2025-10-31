import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/apiClient/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RatingBadge } from "@/components/RatingBadge";
import { Briefcase, TrendingUp, Coins, Award, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { VerifyFundsButton } from "@/components/VerifyFundsButton";

interface Application {
    id: string;
    job_id: string;
    status: string;
    created_at: string;
    job: {
        title: string;
        total_payment: number;
        recruiter_name: string;
        company_name: string | null;
    };
}

interface Project {
    id: string;
    status: string;
    current_stage: number;
    started_at: string;
    claimed_amount: number;
    approved_amount: number;
    job: {
        id: string;
        title: string;
        total_payment: number;
        recruiter_wallet: string | null;
        freelancer_wallet: string | null;
    };
}

export default function FreelancerDashboard() {
    const { user, userRole } = useAuth();
    const navigate = useNavigate();
    const [applications, setApplications] = useState<Application[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [trustPoints, setTrustPoints] = useState({
        total_points: 0,
        completed_projects: 0,
        tier: "iron" as "gold" | "silver" | "bronze" | "iron",
        average_rating: 0,
    });
    const [stats, setStats] = useState({
        totalApplications: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalEarned: 0,
    });

    useEffect(() => {
        if (!user || userRole !== "freelancer") {
            navigate("/");
            return;
        }

        fetchDashboardData();
    }, [user, userRole]);

    const fetchDashboardData = async () => {
        console.log("FETCHING DASHBOARD DATA");
        if (!user) return;

        try {
            setLoading(true);

            // Fetch applications
            const { data: applicationsData, error: applicationsError } = await apiClient.applications.getMyApplications();

            if (applicationsError) throw new Error(applicationsError);

            setApplications(applicationsData || []);

            // Fetch projects
            const { data: projectsData, error: projectsError } = await apiClient.projects.getMyProjects();
            console.log("PROJECTS DATA", projectsData);

            if (projectsError) throw new Error(projectsError);

            setProjects(projectsData || []);

            // Fetch trust points from user profile
            const { data: profileData, error: profileError } = await apiClient.profile.getById(user.id);

            if (!profileError && profileData && profileData.trust_points) {
                setTrustPoints({
                    total_points: profileData.trust_points.total_points,
                    completed_projects: profileData.trust_points.completed_projects,
                    tier: profileData.trust_points.tier,
                    average_rating: profileData.trust_points.average_rating || 0,
                });
            }

            // Calculate stats
            const totalApplications = (applicationsData || []).length;
            const activeProjects = (projectsData || []).filter(
                (p) => p.status === "active"
            ).length;
            const completedProjects = (projectsData || []).filter(
                (p) => p.status === "completed"
            ).length;

            const totalEarned = (projectsData || [])
                .filter((p) => p.status === "completed")
                .reduce((sum, p) => sum + p.job.total_payment, 0);

            setStats({
                totalApplications,
                activeProjects,
                completedProjects,
                totalEarned,
            });
        } catch (error: any) {
            console.error("Error fetching dashboard data:", error);
            toast.error("Failed to load dashboard");
        } finally {
            setLoading(false);
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

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                            Freelancer <span className="text-primary">Dashboard</span>
                        </h1>
                        <RatingBadge tier={trustPoints.tier} points={trustPoints.total_points} size="lg" />
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Track your applications and manage active projects
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-3">
                            <CardDescription>Applications</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-bold">{stats.totalApplications}</p>
                                </div>
                                <Briefcase className="w-8 h-8 text-primary" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="pb-3">
                            <CardDescription>Active Projects</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-bold text-primary">{stats.activeProjects}</p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-primary" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="pb-3">
                            <CardDescription>Completed</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-bold text-success">{stats.completedProjects}</p>
                                </div>
                                <Award className="w-8 h-8 text-success" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="pb-3">
                            <CardDescription>Total Earned</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-bold text-primary">{stats.totalEarned.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">SOL</p>
                                </div>
                                <Coins className="w-8 h-8 text-secondary" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Content Tabs */}
                <Card className="bg-card border-border">
                    <CardContent className="pt-6">
                        <Tabs defaultValue="applications" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4 sm:mb-6">
                                <TabsTrigger value="applications" className="text-xs sm:text-sm">
                                    <span className="hidden sm:inline">My </span>Applications
                                </TabsTrigger>
                                <TabsTrigger value="projects" className="text-xs sm:text-sm">Active</TabsTrigger>
                                <TabsTrigger value="completed" className="text-xs sm:text-sm">Completed</TabsTrigger>
                                <TabsTrigger value="cancelled" className="text-xs sm:text-sm">Cancelled</TabsTrigger>
                            </TabsList>

                            <TabsContent value="applications" className="space-y-4">
                                {loading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className="h-24 rounded-lg bg-card border border-border animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : applications.filter(app => {
                                    // Filter out applications where the job has a completed or cancelled project
                                    const hasCompletedOrCancelledProject = projects.some(
                                        p => p.job.id === app.job_id && (p.status === 'completed' || p.status === 'cancelled')
                                    );
                                    return !hasCompletedOrCancelledProject;
                                }).length > 0 ? (
                                    applications.filter(app => {
                                        // Filter out applications where the job has a completed or cancelled project
                                        const hasCompletedOrCancelledProject = projects.some(
                                            p => p.job.id === app.job_id && (p.status === 'completed' || p.status === 'cancelled')
                                        );
                                        return !hasCompletedOrCancelledProject;
                                    }).map((application) => (
                                        <div
                                            key={application.id}
                                            className="p-3 sm:p-4 rounded-lg bg-card border border-border hover:border-border transition-colors cursor-pointer"
                                            onClick={() => navigate(`/jobs/${application.job_id}`)}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-2">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-base sm:text-lg mb-1">
                                                        {application.job.title}
                                                    </h3>
                                                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                                                        {application.job.company_name || application.job.recruiter_name}
                                                    </p>
                                                    <div className="flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground">
                                                        <span>
                                                            Applied {formatDistanceToNow(new Date(application.created_at))} ago
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between sm:justify-end space-x-4">
                                                    <div className="text-left sm:text-right">
                                                        <div className="flex items-center space-x-1 text-lg sm:text-xl font-bold text-primary">
                                                            <Coins className="w-4 sm:w-5 h-4 sm:h-5" />
                                                            <span>{application.job.total_payment.toFixed(2)} SOL</span>
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={`${getStatusColor(application.status)} text-xs`}
                                                    >
                                                        {application.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-muted-foreground mb-4">
                                            You haven't applied to any jobs yet
                                        </p>
                                        <Button
                                            onClick={() => navigate("/#jobs")}
                                            className="bg-primary"
                                        >
                                            Browse Jobs
                                        </Button>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="projects" className="space-y-4">
                                {loading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className="h-24 rounded-lg bg-card border border-border animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : projects.filter(p => p.status === "active").length > 0 ? (
                                    projects.filter(p => p.status === "active").map((project) => (
                                        <div
                                            key={project.id}
                                            className="p-4 rounded-lg bg-card border border-border hover:border-border transition-colors cursor-pointer"
                                            onClick={() => navigate(`/projects/${project.id}`)}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg mb-1">
                                                        {project.job.title}
                                                    </h3>
                                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                                                        <span>Stage {project.current_stage} of 3</span>
                                                        <span>•</span>
                                                        <span>
                                                            Started {formatDistanceToNow(new Date(project.started_at))} ago
                                                        </span>
                                                    </div>

                                                    {/* Stage Progress */}
                                                    <div className="flex items-center space-x-2 mt-3">
                                                        {[1, 2, 3].map((stage) => {
                                                            const isCompleted = stage < project.current_stage;
                                                            const isCurrent = stage === project.current_stage;
                                                            const isPending = stage > project.current_stage;
                                                            
                                                            return (
                                                                <div
                                                                    key={stage}
                                                                    className={`h-2 flex-1 rounded-full relative overflow-hidden ${
                                                                        isPending ? "bg-muted" : "bg-muted"
                                                                    }`}
                                                                >
                                                                    {(isCompleted || isCurrent) && (
                                                                        <div
                                                                            className="h-full bg-primary rounded-full transition-all duration-300"
                                                                            style={{
                                                                                width: isCompleted ? '100%' : '50%'
                                                                            }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end space-y-2 ml-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center space-x-1 text-xl font-bold text-primary">
                                                            <Coins className="w-5 h-5" />
                                                            <span>{project.job.total_payment.toFixed(2)} SOL</span>
                                                        </div>
                                                        <div className="flex items-center justify-end space-x-3 text-xs">
                                                            <div className="flex items-center space-x-1 text-success">
                                                                <span className="font-medium">Claimed:</span>
                                                                <span>{project.claimed_amount.toFixed(2)} SOL</span>
                                                            </div>
                                                            <div className="flex items-center space-x-1 text-warning">
                                                                <span className="font-medium">Approved:</span>
                                                                <span>{project.approved_amount.toFixed(2)} SOL</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        {/* Show Verify Funds button for active projects */}
                                                        {project.status === "active" && (
                                                            project.job.recruiter_wallet ? (
                                                                <div onClick={(e) => { e.stopPropagation() }}>
                                                                    <VerifyFundsButton
                                                                        jobId={project.job.id}
                                                                        jobTitle={project.job.title}
                                                                        recruiterWallet={project.job.recruiter_wallet}
                                                                        freelancerWallet={project.job.freelancer_wallet || undefined}
                                                                        expectedAmount={project.job.total_payment}
                                                                        variant="outline"
                                                                        size="sm"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                                                    Escrow not funded
                                                                </Badge>
                                                            )
                                                        )}

                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                project.status === "active"
                                                                    ? "bg-primary/10 text-primary border-primary/30"
                                                                    : "bg-success/10 text-success border-success/30"
                                                            }
                                                        >
                                                            {project.status.replace("_", " ")}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-muted-foreground mb-4">
                                            No active projects yet
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Apply to jobs and get selected to start working on projects
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="completed" className="space-y-4">
                                {loading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className="h-24 rounded-lg bg-card border border-border animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : projects.filter(p => p.status === "completed").length > 0 ? (
                                    projects.filter(p => p.status === "completed").map((project) => (
                                        <div
                                            key={project.id}
                                            className="p-4 rounded-lg bg-card border border-border hover:border-border transition-colors cursor-pointer"
                                            onClick={() => navigate(`/projects/${project.id}`)}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg mb-1">
                                                        {project.job.title}
                                                    </h3>
                                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                                                        <span>Completed Project</span>
                                                        <span>•</span>
                                                        <span>
                                                            Started {formatDistanceToNow(new Date(project.started_at))} ago
                                                        </span>
                                                    </div>

                                                    {/* Completed Progress Bar */}
                                                    <div className="flex items-center space-x-2 mt-3">
                                                        {[1, 2, 3].map((stage) => (
                                                            <div
                                                                key={stage}
                                                                className="h-2 flex-1 rounded-full bg-primary"
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end space-y-2 ml-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center space-x-1 text-xl font-bold text-primary">
                                                            <Coins className="w-5 h-5" />
                                                            <span>{project.job.total_payment.toFixed(2)} SOL</span>
                                                        </div>
                                                        <div className="flex items-center justify-end space-x-3 text-xs">
                                                            <div className="flex items-center space-x-1 text-success">
                                                                <span className="font-medium">Claimed:</span>
                                                                <span>{project.claimed_amount.toFixed(2)} SOL</span>
                                                            </div>
                                                            <div className="flex items-center space-x-1 text-warning">
                                                                <span className="font-medium">Approved:</span>
                                                                <span>{project.approved_amount.toFixed(2)} SOL</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-success/10 text-success border-success/30"
                                                        >
                                                            <Award className="w-3 h-3 mr-1" />
                                                            completed
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-muted-foreground mb-4">
                                            No completed projects yet
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Complete your active projects to see them here
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="cancelled" className="space-y-4">
                                {loading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className="h-24 rounded-lg bg-card border border-border animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : projects.filter(p => p.status === "cancelled").length > 0 ? (
                                    projects.filter(p => p.status === "cancelled").map((project) => (
                                        <div
                                            key={project.id}
                                            className="p-4 rounded-lg bg-card border border-destructive/30 hover:border-destructive/50 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/projects/${project.id}`)}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg mb-1">
                                                        {project.job.title}
                                                    </h3>
                                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                                                        <span className="text-destructive font-medium">
                                                            Cancelled by Recruiter
                                                        </span>
                                                        <span>•</span>
                                                        <span>
                                                            Started {formatDistanceToNow(new Date(project.started_at))} ago
                                                        </span>
                                                    </div>

                                                    <p className="text-sm text-muted-foreground mt-2 bg-destructive/5 p-2 rounded border border-destructive/20">
                                                        ⚠️ This job was cancelled by the recruiter. 
                                                        {project.claimed_amount > 0 
                                                            ? ` You have claimed ${project.claimed_amount.toFixed(2)} SOL for completed work.`
                                                            : ' No payments were claimed before cancellation.'
                                                        }
                                                    </p>
                                                </div>

                                                <div className="flex flex-col items-end space-y-2 ml-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center space-x-1 text-xl font-bold text-muted-foreground line-through">
                                                            <Coins className="w-5 h-5" />
                                                            <span>{project.job.total_payment.toFixed(2)} SOL</span>
                                                        </div>
                                                        <div className="flex items-center justify-end space-x-3 text-xs">
                                                            <div className="flex items-center space-x-1 text-success">
                                                                <span className="font-medium">Claimed:</span>
                                                                <span>{project.claimed_amount.toFixed(2)} SOL</span>
                                                            </div>
                                                            <div className="flex items-center space-x-1 text-warning">
                                                                <span className="font-medium">Approved:</span>
                                                                <span>{project.approved_amount.toFixed(2)} SOL</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <Badge
                                                        variant="outline"
                                                        className="bg-destructive/10 text-destructive border-destructive/30"
                                                    >
                                                        <XCircle className="w-3 h-3 mr-1" />
                                                        Cancelled
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="flex justify-center mb-4">
                                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                                <XCircle className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                        </div>
                                        <p className="text-muted-foreground mb-2">
                                            No cancelled jobs
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Jobs that are cancelled by recruiters will appear here
                                        </p>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}

