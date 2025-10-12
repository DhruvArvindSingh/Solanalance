import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Save, Plus, X } from "lucide-react";
import { toast } from "sonner";

export default function EditProfile() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [fullName, setFullName] = useState("");
    const [bio, setBio] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [hourlyRate, setHourlyRate] = useState<number>(0);
    const [skills, setSkills] = useState<string[]>([]);
    const [newSkill, setNewSkill] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate("/auth");
            return;
        }

        fetchProfile();
    }, [user]);

    const fetchProfile = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase.profile.getById(user.id);

            if (error) throw new Error(error);

            if (data) {
                setFullName(data.full_name || "");
                setBio(data.bio || "");
                setCompanyName(data.company_name || "");
                setHourlyRate(data.hourly_rate || 0);
                setSkills(data.skills || []);
                setAvatarUrl(data.avatar_url || "");
            }
        } catch (error: any) {
            console.error("Error fetching profile:", error);
            toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handleAddSkill = () => {
        if (newSkill.trim() && skills.length < 15) {
            if (!skills.includes(newSkill.trim())) {
                setSkills([...skills, newSkill.trim()]);
                setNewSkill("");
            } else {
                toast.error("Skill already added");
            }
        }
    };

    const handleRemoveSkill = (index: number) => {
        setSkills(skills.filter((_, i) => i !== index));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;

        if (!fullName.trim()) {
            toast.error("Full name is required");
            return;
        }

        if (skills.length < 3) {
            toast.error("Please add at least 3 skills");
            return;
        }

        setSaving(true);

        try {
            const { data, error } = await supabase.profile.update({
                fullName,
                bio: bio || null,
                companyName: companyName || null,
                hourlyRate: hourlyRate > 0 ? hourlyRate : null,
                skills: skills,
                avatarUrl: avatarUrl || null,
            });

            if (error) throw new Error(error);

            toast.success("Profile updated successfully!");
            navigate(`/profile/${user.id}`);
        } catch (error: any) {
            console.error("Error updating profile:", error);
            toast.error(error.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24">
                    <div className="animate-pulse space-y-8">
                        <div className="h-8 bg-muted rounded w-1/4"></div>
                        <div className="h-96 bg-muted rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 max-w-4xl">
                <Button
                    variant="ghost"
                    onClick={() => navigate(`/profile/${user?.id}`)}
                    className="mb-6"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Profile
                </Button>

                <h1 className="text-4xl font-bold mb-8">
                    Edit <span className="text-gradient">Profile</span>
                </h1>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Avatar */}
                    <Card className="glass border-white/10">
                        <CardHeader>
                            <CardTitle>Profile Picture</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-6">
                                <Avatar className="w-24 h-24 border-4 border-white/10">
                                    <AvatarImage src={avatarUrl || undefined} />
                                    <AvatarFallback className="bg-gradient-solana text-background text-3xl font-bold">
                                        {fullName.charAt(0) || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <Label htmlFor="avatar">Avatar URL</Label>
                                    <Input
                                        id="avatar"
                                        type="url"
                                        placeholder="https://example.com/avatar.jpg"
                                        value={avatarUrl}
                                        onChange={(e) => setAvatarUrl(e.target.value)}
                                        className="mt-2"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Provide a URL to your profile picture
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Basic Information */}
                    <Card className="glass border-white/10">
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">
                                    Full Name *
                                </Label>
                                <Input
                                    id="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    maxLength={100}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bio">
                                    Bio
                                </Label>
                                <Textarea
                                    id="bio"
                                    placeholder="Tell us about yourself and your experience..."
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    rows={5}
                                    maxLength={500}
                                    className="resize-none"
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    {bio.length}/500 characters
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="company">
                                    Company Name (Optional)
                                </Label>
                                <Input
                                    id="company"
                                    placeholder="Your company or organization"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    maxLength={100}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="hourlyRate">
                                    Hourly Rate (SOL) (Optional)
                                </Label>
                                <Input
                                    id="hourlyRate"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={hourlyRate || ""}
                                    onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Skills */}
                    <Card className="glass border-white/10">
                        <CardHeader>
                            <CardTitle>Skills (Min: 3, Max: 15)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex space-x-2">
                                <Input
                                    placeholder="e.g., React, Solana, UI/UX"
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddSkill();
                                        }
                                    }}
                                    maxLength={50}
                                />
                                <Button
                                    type="button"
                                    onClick={handleAddSkill}
                                    disabled={skills.length >= 15 || !newSkill.trim()}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>

                            {skills.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {skills.map((skill, index) => (
                                        <Badge
                                            key={index}
                                            variant="secondary"
                                            className="px-3 py-1 text-sm flex items-center space-x-2"
                                        >
                                            <span>{skill}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSkill(index)}
                                                className="hover:text-destructive"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {skills.length < 3 && (
                                <p className="text-xs text-warning">
                                    Please add at least 3 skills
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end space-x-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(`/profile/${user?.id}`)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving || !fullName.trim() || skills.length < 3}
                            className="bg-gradient-solana"
                        >
                            {saving ? (
                                "Saving..."
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

