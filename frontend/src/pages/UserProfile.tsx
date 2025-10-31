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
    Github,
    Linkedin,
    Copy,
    Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Profile {
    id: string;
    user_id: number;
    full_name: string;
    email: string;
    avatar_url: string | null;
    bio: string | null;
    skills: string[] | null;
    hourly_rate: number | null;
    company_name: string | null;
    wallet_address: string | null;
    github_url: string | null;
    linkedin_url: string | null;
    portfolio_email: string | null;
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
    console.log('Component render - profile state:', profile);
    const [trustPoints, setTrustPoints] = useState<TrustPoints | null>(null);
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [copiedWallet, setCopiedWallet] = useState(false);

    const isOwnProfile = user?.id === id;

    const copyWalletAddress = async (address: string) => {
        try {
            await navigator.clipboard.writeText(address);
            setCopiedWallet(true);
            setTimeout(() => setCopiedWallet(false), 2000);
        } catch (err) {
            console.error('Failed to copy wallet address:', err);
        }
    };

    useEffect(() => {
        if (id) {
            fetchProfileData();
        }
    }, [id]);

    const fetchProfileData = async () => {
        if (!id) return;

        try {
            setLoading(true);

            // Fetch profile (includes role and trust points)
            const { data: profileData, error: profileError } = await apiClient.profile.getById(id);

            if (profileError) throw new Error(profileError);

            if (profileData) {
                console.log('Profile data received:', profileData);
                console.log('Social media fields:', {
                    github_url: profileData.github_url,
                    linkedin_url: profileData.linkedin_url,
                    portfolio_email: profileData.portfolio_email
                });
                setProfile({
                    id: profileData.id,
                    user_id: profileData.user_id,
                    full_name: profileData.full_name,
                    email: profileData.email,
                    avatar_url: profileData.avatar_url,
                    bio: profileData.bio,
                    skills: profileData.skills,
                    hourly_rate: profileData.hourly_rate,
                    company_name: profileData.company_name,
                    wallet_address: profileData.wallet_address,
                    github_url: profileData.github_url || null,
                    linkedin_url: profileData.linkedin_url || null,
                    portfolio_email: profileData.portfolio_email || null,
                    created_at: profileData.created_at
                });
                console.log('Profile state set:', {
                    user_id: profileData.user_id,
                    wallet_address: profileData.wallet_address,
                    github_url: profileData.github_url,
                    linkedin_url: profileData.linkedin_url,
                    portfolio_email: profileData.portfolio_email
                });

                setUserRole(profileData.role);
                setTrustPoints(profileData.trust_points);
                setRatings(profileData.ratings || []);
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
                <Card className="bg-card border-border mb-8">
                    <CardContent className="pt-8">
                        <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
                            <Avatar className="w-32 h-32 border-4 border-border">
                                <AvatarImage src={profile.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary text-background text-4xl font-bold">
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
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-sm text-muted-foreground">User ID:</span>
                                            <Badge variant="secondary" className="font-mono">
                                                #{profile.user_id}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-sm text-muted-foreground">Profile ID:</span>
                                            <Badge variant="outline" className="font-mono text-xs">
                                                {profile.id}
                                            </Badge>
                                        </div>
                                        {profile.wallet_address && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-sm text-muted-foreground">Wallet:</span>
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {profile.wallet_address.slice(0, 8)}...{profile.wallet_address.slice(-8)}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        copyWalletAddress(profile.wallet_address!);
                                                    }}
                                                >
                                                    {copiedWallet ? (
                                                        <Check className="h-3 w-3 text-success" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            </div>
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

                                {/* Social Media Links */}
                                {(profile.github_url || profile.linkedin_url || profile.portfolio_email) ? (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <LinkIcon className="w-5 h-5 text-primary" />
                                            Connect & Follow
                                        </h3>
                                        <div className="flex flex-wrap gap-3">
                                            {profile.github_url && (
                                                <a
                                                    href={profile.github_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 border border-gray-700"
                                                >
                                                    <Github className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">GitHub</span>
                                                        <span className="text-xs text-gray-300">View repositories</span>
                                                    </div>
                                                </a>
                                            )}
                                            {profile.linkedin_url && (
                                                <a
                                                    href={profile.linkedin_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                                                >
                                                    <Linkedin className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">LinkedIn</span>
                                                        <span className="text-xs text-blue-100">Professional profile</span>
                                                    </div>
                                                </a>
                                            )}
                                            {profile.portfolio_email && (
                                                <a
                                                    href={`mailto:${profile.portfolio_email}`}
                                                    className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                                                >
                                                    <Mail className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">Email</span>
                                                        <span className="text-xs text-emerald-100">Get in touch</span>
                                                    </div>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ) : isOwnProfile && (
                                    <div className="mb-6 p-4 border-2 border-dashed border-muted-foreground/30 rounded-xl bg-muted/20">
                                        <div className="text-center">
                                            <LinkIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                            <h3 className="text-sm font-medium text-muted-foreground mb-1">
                                                Add Social Media Links
                                            </h3>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                Help others connect with you by adding your GitHub, LinkedIn, or contact email
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => navigate("/profile/edit")}
                                                className="text-xs"
                                            >
                                                <Edit className="w-3 h-3 mr-1" />
                                                Add Links
                                            </Button>
                                        </div>
                                    </div>
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
                        <Card className="bg-card border-border">
                            <CardContent className="pt-6 text-center">
                                <Briefcase className="w-8 h-8 text-primary mx-auto mb-2" />
                                <p className="text-2xl font-bold">{trustPoints.completed_projects}</p>
                                <p className="text-sm text-muted-foreground">Projects</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                            <CardContent className="pt-6 text-center">
                                <Star className="w-8 h-8 text-warning mx-auto mb-2" />
                                <p className="text-2xl font-bold">
                                    {trustPoints.average_rating?.toFixed(1) || "N/A"}
                                </p>
                                <p className="text-sm text-muted-foreground">Avg Rating</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                            <CardContent className="pt-6 text-center">
                                <TrendingUp className="w-8 h-8 text-success mx-auto mb-2" />
                                <p className="text-2xl font-bold">{successRate.toFixed(0)}%</p>
                                <p className="text-sm text-muted-foreground">Success Rate</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                            <CardContent className="pt-6 text-center">
                                <Award className="w-8 h-8 text-secondary mx-auto mb-2" />
                                <p className="text-2xl font-bold">{trustPoints.total_points}</p>
                                <p className="text-sm text-muted-foreground">Trust Points</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Reviews */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle>Reviews ({ratings.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {ratings.length > 0 ? (
                            <div className="space-y-6">
                                {ratings.map((rating) => (
                                    <div key={rating.id} className="pb-6 last:pb-0 last:border-0 border-b border-border">
                                        <div className="flex items-start space-x-4">
                                            <Avatar className="w-12 h-12">
                                                <AvatarImage src={rating.rater.avatar_url || undefined} />
                                                <AvatarFallback className="bg-primary text-background">
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

