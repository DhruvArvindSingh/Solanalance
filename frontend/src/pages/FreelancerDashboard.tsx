import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RatingBadge } from "@/components/RatingBadge";
import { Briefcase, TrendingUp, Coins, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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
    job: {
        id: string;
        title: string;
        total_payment: number;
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
        if (!user) return;

        try {
            setLoading(true);

            // Fetch applications with job info
            const { data: applicationsData, error: applicationsError } = await supabase
                .from("applications")
                .select(`
          id,
          job_id,
          status,
          created_at,
          jobs (
            title,
            total_payment,
            profiles!jobs_recruiter_id_fkey (
              full_name,
              company_name
            )
          )
        `)
                .eq("freelancer_id", user.id)
                .order("created_at", { ascending: false });

            if (applicationsError) throw applicationsError;

            // Transform applications data
            const transformedApplications = (applicationsData || []).map((app: any) => ({
                id: app.id,
                job_id: app.job_id,
                status: app.status,
                created_at: app.created_at,
                job: {
                    title: app.jobs?.title || "Unknown Job",
                    total_payment: app.jobs?.total_payment || 0,
                    recruiter_name: app.jobs?.profiles?.full_name || "Unknown",
                    company_name: app.jobs?.profiles?.company_name,
                },
            }));

            setApplications(transformedApplications);

            // Fetch projects
            const { data: projectsData, error: projectsError } = await supabase
                .from("projects")
                .select(`
          id,
          status,
          current_stage,
          started_at,
          jobs (
            id,
            title,
            total_payment
          )
        `)
                .eq("freelancer_id", user.id)
                .order("started_at", { ascending: false });

            if (projectsError) throw projectsError;

            const transformedProjects = (projectsData || []).map((proj: any) => ({
                id: proj.id,
                status: proj.status,
                current_stage: proj.current_stage,
                started_at: proj.started_at,
                job: {
                    id: proj.jobs?.id || "",
                    title: proj.jobs?.title || "Unknown Project",
                    total_payment: proj.jobs?.total_payment || 0,
                },
            }));

            setProjects(transformedProjects);

            // Fetch trust points
            const { data: trustData, error: trustError } = await supabase
                .from("trust_points")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (!trustError && trustData) {
                setTrustPoints({
                    total_points: trustData.total_points,
                    completed_projects: trustData.completed_projects,
                    tier: trustData.tier,
                    average_rating: trustData.average_rating || 0,
                });
            }

            // Calculate stats
            const totalApplications = transformedApplications.length;
            const activeProjects = transformedProjects.filter(
                (p) => p.status === "in_progress"
            ).length;
            const completedProjects = transformedProjects.filter(
                (p) => p.status === "completed"
            ).length;

            const totalEarned = transformedProjects
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
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-4xl font-bold">
                            Freelancer <span className="text-gradient">Dashboard</span>
                        </h1>
                        <RatingBadge tier={trustPoints.tier} points={trustPoints.total_points} size="lg" />
                    </div>
                    <p className="text-muted-foreground">
                        Track your applications and manage active projects
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="glass border-white/10">
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

                    <Card className="glass border-white/10">
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

                    <Card className="glass border-white/10">
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

                    <Card className="glass border-white/10">
                        <CardHeader className="pb-3">
                            <CardDescription>Total Earned</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-bold text-gradient">{stats.totalEarned.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">SOL</p>
                                </div>
                                <Coins className="w-8 h-8 text-secondary" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Content Tabs */}
                <Card className="glass border-white/10">
                    <CardContent className="pt-6">
                        <Tabs defaultValue="applications" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="applications">My Applications</TabsTrigger>
                                <TabsTrigger value="projects">Active Projects</TabsTrigger>
                            </TabsList>

                            <TabsContent value="applications" className="space-y-4">
                                {loading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className="h-24 rounded-lg glass border border-white/10 animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : applications.length > 0 ? (
                                    applications.map((application) => (
                                        <div
                                            key={application.id}
                                            className="p-4 rounded-lg glass border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/jobs/${application.job_id}`)}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg mb-1">
                                                        {application.job.title}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        {application.job.company_name || application.job.recruiter_name}
                                                    </p>
                                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                        <span>
                                                            Applied {formatDistanceToNow(new Date(application.created_at))} ago
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-4">
                                                    <div className="text-right mr-4">
                                                        <div className="flex items-center space-x-1 text-xl font-bold text-gradient">
                                                            <Coins className="w-5 h-5" />
                                                            <span>{application.job.total_payment.toFixed(2)} SOL</span>
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={getStatusColor(application.status)}
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
                                            className="bg-gradient-solana"
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
                                                className="h-24 rounded-lg glass border border-white/10 animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : projects.length > 0 ? (
                                    projects.map((project) => (
                                        <div
                                            key={project.id}
                                            className="p-4 rounded-lg glass border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
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
                                                        {[1, 2, 3].map((stage) => (
                                                            <div
                                                                key={stage}
                                                                className={`h-2 flex-1 rounded-full ${stage <= project.current_stage
                                                                    ? "bg-gradient-solana"
                                                                    : "bg-muted"
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="text-right ml-4">
                                                    <div className="flex items-center space-x-1 text-xl font-bold text-gradient mb-2">
                                                        <Coins className="w-5 h-5" />
                                                        <span>{project.job.total_payment.toFixed(2)} SOL</span>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            project.status === "in_progress"
                                                                ? "bg-primary/10 text-primary border-primary/30"
                                                                : "bg-success/10 text-success border-success/30"
                                                        }
                                                    >
                                                        {project.status.replace("_", " ")}
                                                    </Badge>
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
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}

