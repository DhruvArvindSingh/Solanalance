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
import {
    ArrowLeft,
    Edit,
    Briefcase,
    Star,
    TrendingUp,
    Award,
    MapPin,
    Link as LinkIcon,
    Mail,
    Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Profile {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    bio: string | null;
    skills: string[] | null;
    hourly_rate: number | null;
    company_name: string | null;
    created_at: string;
}

interface TrustPoints {
    total_points: number;
    completed_projects: number;
    successful_projects: number;
    tier: "gold" | "silver" | "bronze" | "iron";
    average_rating: number | null;
}

interface Rating {
    id: string;
    overall_rating: number;
    communication_rating: number;
    quality_rating: number;
    professionalism_rating: number;
    review_text: string | null;
    created_at: string;
    rater: {
        full_name: string;
        avatar_url: string | null;
    };
    project: {
        job_title: string;
    };
}

export default function UserProfile() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [trustPoints, setTrustPoints] = useState<TrustPoints | null>(null);
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const isOwnProfile = user?.id === id;

    useEffect(() => {
        if (id) {
            fetchProfileData();
        }
    }, [id]);

    const fetchProfileData = async () => {
        if (!id) return;

        try {
            setLoading(true);

            // Fetch profile
            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", id)
                .single();

            if (profileError) throw profileError;
            setProfile(profileData);

            // Fetch user role
            const { data: roleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", id)
                .single();

            setUserRole(roleData?.role || null);

            // Fetch trust points
            const { data: trustData } = await supabase
                .from("trust_points")
                .select("*")
                .eq("user_id", id)
                .single();

            setTrustPoints(trustData);

            // Fetch public ratings with rater info
            const { data: ratingsData } = await supabase
                .from("ratings")
                .select(`
          id,
          overall_rating,
          communication_rating,
          quality_rating,
          professionalism_rating,
          review_text,
          created_at,
          profiles!ratings_rater_id_fkey (
            full_name,
            avatar_url
          ),
          projects!inner (
            jobs!inner (
              title
            )
          )
        `)
                .eq("ratee_id", id)
                .eq("is_public", true)
                .order("created_at", { ascending: false })
                .limit(10);

            if (ratingsData) {
                const transformedRatings = ratingsData.map((r: any) => ({
                    id: r.id,
                    overall_rating: r.overall_rating,
                    communication_rating: r.communication_rating,
                    quality_rating: r.quality_rating,
                    professionalism_rating: r.professionalism_rating,
                    review_text: r.review_text,
                    created_at: r.created_at,
                    rater: {
                        full_name: r.profiles?.full_name || "Anonymous",
                        avatar_url: r.profiles?.avatar_url,
                    },
                    project: {
                        job_title: r.projects?.jobs?.title || "Unknown Project",
                    },
                }));
                setRatings(transformedRatings);
            }
        } catch (error: any) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24">
                    <div className="animate-pulse space-y-8">
                        <div className="h-48 bg-muted rounded-xl"></div>
                        <div className="h-64 bg-muted rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 text-center">
                    <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
                    <Button onClick={() => navigate("/")}>Go back home</Button>
                </div>
            </div>
        );
    }

    const successRate = trustPoints && trustPoints.completed_projects > 0
        ? (trustPoints.successful_projects / trustPoints.completed_projects) * 100
        : 0;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                {/* Profile Header */}
                <Card className="glass border-white/10 mb-8">
                    <CardContent className="pt-8">
                        <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
                            <Avatar className="w-32 h-32 border-4 border-white/10">
                                <AvatarImage src={profile.avatar_url || undefined} />
                                <AvatarFallback className="bg-gradient-solana text-background text-4xl font-bold">
                                    {profile.full_name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h1 className="text-3xl font-bold mb-2">{profile.full_name}</h1>
                                        {profile.company_name && (
                                            <p className="text-lg text-muted-foreground mb-2">
                                                {profile.company_name}
                                            </p>
                                        )}
                                        {userRole && (
                                            <Badge variant="outline" className="capitalize mb-3">
                                                {userRole}
                                            </Badge>
                                        )}
                                    </div>

                                    {isOwnProfile && (
                                        <Button
                                            onClick={() => navigate("/profile/edit")}
                                            variant="outline"
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit Profile
                                        </Button>
                                    )}
                                </div>

                                {trustPoints && (
                                    <div className="mb-4">
                                        <RatingBadge
                                            tier={trustPoints.tier}
                                            points={trustPoints.total_points}
                                            size="lg"
                                        />
                                    </div>
                                )}

                                {profile.bio && (
                                    <p className="text-muted-foreground leading-relaxed mb-4">
                                        {profile.bio}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center space-x-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                            Member since {formatDistanceToNow(new Date(profile.created_at))} ago
                                        </span>
                                    </div>
                                    {profile.hourly_rate && (
                                        <div className="flex items-center space-x-1">
                                            <Award className="w-4 h-4" />
                                            <span>{profile.hourly_rate} SOL/hour</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {profile.skills && profile.skills.length > 0 && (
                            <>
                                <Separator className="my-6" />
                                <div>
                                    <h3 className="text-sm font-semibold mb-3">Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.skills.map((skill, index) => (
                                            <Badge key={index} variant="secondary">
                                                {skill}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Stats Row */}
                {trustPoints && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <Card className="glass border-white/10">
                            <CardContent className="pt-6 text-center">
                                <Briefcase className="w-8 h-8 text-primary mx-auto mb-2" />
                                <p className="text-2xl font-bold">{trustPoints.completed_projects}</p>
                                <p className="text-sm text-muted-foreground">Projects</p>
                            </CardContent>
                        </Card>

                        <Card className="glass border-white/10">
                            <CardContent className="pt-6 text-center">
                                <Star className="w-8 h-8 text-warning mx-auto mb-2" />
                                <p className="text-2xl font-bold">
                                    {trustPoints.average_rating?.toFixed(1) || "N/A"}
                                </p>
                                <p className="text-sm text-muted-foreground">Avg Rating</p>
                            </CardContent>
                        </Card>

                        <Card className="glass border-white/10">
                            <CardContent className="pt-6 text-center">
                                <TrendingUp className="w-8 h-8 text-success mx-auto mb-2" />
                                <p className="text-2xl font-bold">{successRate.toFixed(0)}%</p>
                                <p className="text-sm text-muted-foreground">Success Rate</p>
                            </CardContent>
                        </Card>

                        <Card className="glass border-white/10">
                            <CardContent className="pt-6 text-center">
                                <Award className="w-8 h-8 text-secondary mx-auto mb-2" />
                                <p className="text-2xl font-bold">{trustPoints.total_points}</p>
                                <p className="text-sm text-muted-foreground">Trust Points</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Reviews */}
                <Card className="glass border-white/10">
                    <CardHeader>
                        <CardTitle>Reviews ({ratings.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {ratings.length > 0 ? (
                            <div className="space-y-6">
                                {ratings.map((rating) => (
                                    <div key={rating.id} className="pb-6 last:pb-0 last:border-0 border-b border-white/5">
                                        <div className="flex items-start space-x-4">
                                            <Avatar className="w-12 h-12">
                                                <AvatarImage src={rating.rater.avatar_url || undefined} />
                                                <AvatarFallback className="bg-gradient-solana text-background">
                                                    {rating.rater.full_name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div className="flex-1">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <p className="font-semibold">{rating.rater.full_name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {rating.project.job_title}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Star className="w-4 h-4 fill-warning text-warning" />
                                                        <span className="font-semibold">
                                                            {rating.overall_rating.toFixed(1)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex space-x-4 text-sm text-muted-foreground mb-2">
                                                    <span>Communication: {rating.communication_rating}/5</span>
                                                    <span>Quality: {rating.quality_rating}/5</span>
                                                    <span>Professionalism: {rating.professionalism_rating}/5</span>
                                                </div>

                                                {rating.review_text && (
                                                    <p className="text-sm leading-relaxed">{rating.review_text}</p>
                                                )}

                                                <p className="text-xs text-muted-foreground mt-2">
                                                    {formatDistanceToNow(new Date(rating.created_at))} ago
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">No reviews yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

