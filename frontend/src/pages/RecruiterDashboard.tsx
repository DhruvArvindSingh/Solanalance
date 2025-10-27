import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/apiClient/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase, Users, TrendingUp, Coins } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { VerifyFundsButton } from "@/components/VerifyFundsButton";

interface JobWithStats {
    id: string;
    title: string;
    status: string;
    total_payment: number;
    created_at: string;
    applicants_count: number;
    recruiter_wallet?: string;
    freelancer_wallet?: string;
    project_id?: string; // For active jobs
}

export default function RecruiterDashboard() {
    const { user, userRole } = useAuth();
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<JobWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [jobProjectMap, setJobProjectMap] = useState<Record<string, string>>({});
    const [stats, setStats] = useState({
        totalJobs: 0,
        openJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        totalSpent: 0,
    });

    useEffect(() => {
        if (!user || userRole !== "recruiter") {
            navigate("/");
            return;
        }

        fetchDashboardData();
    }, [user, userRole]);

    const fetchDashboardData = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // Fetch jobs for recruiter
            const { data: jobsData, error: jobsError } = await apiClient.jobs.getRecruiterJobs();

            if (jobsError) throw new Error(jobsError);

            const jobsWithStats = jobsData || [];
            setJobs(jobsWithStats);

            // Fetch active projects to map jobs to projects
            const { data: projectsData, error: projectsError } = await apiClient.projects.getMyProjects();
            if (!projectsError && projectsData) {
                const projectMap: Record<string, string> = {};
                projectsData.forEach((project: any) => {
                    if (project.status === 'active') {
                        projectMap[project.job_id] = project.id;
                    }
                });
                setJobProjectMap(projectMap);
            }

            // Calculate stats
            const totalJobs = jobsWithStats.length;
            const openJobs = jobsWithStats.filter((j) => j.status === "open").length;
            const activeJobs = jobsWithStats.filter((j) => j.status === "active").length;
            const completedJobs = jobsWithStats.filter((j) => j.status === "completed").length;

            // Calculate total spent (sum of completed job payments)
            const totalSpent = jobsWithStats
                .filter(job => job.status === "completed")
                .reduce((sum, job) => sum + job.total_payment, 0);

            setStats({
                totalJobs,
                openJobs,
                activeJobs,
                completedJobs,
                totalSpent,
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
            case "open":
                return "bg-success/10 text-success border-success/30";
            case "active":
                return "bg-primary/10 text-primary border-primary/30";
            case "completed":
                return "bg-muted text-muted-foreground border-muted";
            case "draft":
                return "bg-warning/10 text-warning border-warning/30";
            default:
                return "bg-muted text-muted-foreground border-muted";
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">
                            Recruiter <span className="text-gradient">Dashboard</span>
                        </h1>
                        <p className="text-muted-foreground">
                            Manage your job postings and track applications
                        </p>
                    </div>

                    <Button
                        onClick={() => navigate("/jobs/create")}
                        className="bg-gradient-solana"
                        size="lg"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Post New Job
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="glass border-white/10">
                        <CardHeader className="pb-3">
                            <CardDescription>Total Jobs</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-bold">{stats.totalJobs}</p>
                                </div>
                                <Briefcase className="w-8 h-8 text-primary" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass border-white/10">
                        <CardHeader className="pb-3">
                            <CardDescription>Open Jobs</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-bold text-success">{stats.openJobs}</p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-success" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass border-white/10">
                        <CardHeader className="pb-3">
                            <CardDescription>In Progress</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-bold text-primary">{stats.activeJobs}</p>
                                </div>
                                <Users className="w-8 h-8 text-primary" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass border-white/10">
                        <CardHeader className="pb-3">
                            <CardDescription>Total Spent</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-bold text-gradient">{stats.totalSpent.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">SOL</p>
                                </div>
                                <Coins className="w-8 h-8 text-secondary" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Jobs Tabs */}
                <Card className="glass border-white/10">
                    <CardContent className="pt-6">
                        <Tabs defaultValue="all" className="w-full">
                            <TabsList className="grid w-full grid-cols-5 mb-6">
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="open">Open</TabsTrigger>
                                <TabsTrigger value="active">Active</TabsTrigger>
                                <TabsTrigger value="completed">Completed</TabsTrigger>
                                <TabsTrigger value="draft">Drafts</TabsTrigger>
                            </TabsList>

                            {["all", "open", "active", "completed", "draft"].map((tab) => {
                                const filteredJobs =
                                    tab === "all" ? jobs : jobs.filter((j) => j.status === tab);

                                return (
                                    <TabsContent key={tab} value={tab} className="space-y-4">
                                        {loading ? (
                                            <div className="space-y-4">
                                                {[1, 2, 3].map((i) => (
                                                    <div
                                                        key={i}
                                                        className="h-24 rounded-lg glass border border-white/10 animate-pulse"
                                                    />
                                                ))}
                                            </div>
                                        ) : filteredJobs.length > 0 ? (
                                            filteredJobs.map((job) => (
                                                <div
                                                    key={job.id}
                                                    className="p-4 rounded-lg glass border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                                                    onClick={() => {
                                                        // For active jobs, navigate to project workspace
                                                        if (job.status === "active" && jobProjectMap[job.id]) {
                                                            navigate(`/projects/${jobProjectMap[job.id]}`);
                                                        } else if (job.status === "open" && job.applicants_count > 0) {
                                                            navigate(`/jobs/${job.id}/applicants`);
                                                        } else {
                                                            navigate(`/jobs/${job.id}`);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-lg mb-2">{job.title}</h3>
                                                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                                                <span>
                                                                    Posted {formatDistanceToNow(new Date(job.created_at))} ago
                                                                </span>
                                                                <span>•</span>
                                                                <span>{job.applicants_count} applicants</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center space-x-4">
                                                            <div className="text-right mr-4">
                                                                <div className="flex items-center space-x-1 text-xl font-bold text-gradient">
                                                                    <Coins className="w-5 h-5" />
                                                                    <span>{job.total_payment.toFixed(2)} SOL</span>
                                                                </div>
                                                            </div>

                                                            {/* Show Verify Funds button for active jobs */}
                                                            {job.status === "active" && job.recruiter_wallet && (
                                                                <div onClick={(e) => e.stopPropagation()}>
                                                                    <VerifyFundsButton
                                                                        jobId={job.id}
                                                                        jobTitle={job.title}
                                                                        recruiterWallet={job.recruiter_wallet}
                                                                        freelancerWallet={job.freelancer_wallet}
                                                                        expectedAmount={job.total_payment}
                                                                        variant="outline"
                                                                        size="sm"
                                                                    />
                                                                </div>
                                                            )}

                                                            <Badge
                                                                variant="outline"
                                                                className={getStatusColor(job.status)}
                                                            >
                                                                {job.status.replace("_", " ")}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-12">
                                                <p className="text-muted-foreground mb-4">
                                                    No {tab !== "all" ? tab.replace("_", " ") : ""} jobs found
                                                </p>
                                                {tab === "all" && (
                                                    <Button
                                                        onClick={() => navigate("/jobs/create")}
                                                        className="bg-gradient-solana"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Post Your First Job
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </TabsContent>
                                );
                            })}
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

