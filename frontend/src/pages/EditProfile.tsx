import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/integrations/apiClient/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Save, Plus, X, Wallet, CheckCircle, AlertCircle, Upload, Loader2, Github, Linkedin, Mail, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export default function EditProfile() {
    const { user, refreshAuth } = useAuth();
    const navigate = useNavigate();

    const [fullName, setFullName] = useState("");
    const [bio, setBio] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [hourlyRate, setHourlyRate] = useState<number>(0);
    const [skills, setSkills] = useState<string[]>([]);
    const [newSkill, setNewSkill] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [walletAddress, setWalletAddress] = useState("");
    const [githubUrl, setGithubUrl] = useState("");
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [portfolioEmail, setPortfolioEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [uploadingProfilePic, setUploadingProfilePic] = useState(false);

    const { connection } = useConnection();
    const { publicKey, disconnect, connected } = useWallet();
    const { setVisible } = useWalletModal();

    useEffect(() => {
        if (!user) {
            navigate("/auth");
            return;
        }

        fetchProfile();
    }, [user]);

    // Monitor wallet connection status
    useEffect(() => {
        if (connected && publicKey) {
            setWalletAddress(publicKey.toBase58());
        }
    }, [connected, publicKey]);

    const fetchProfile = async () => {
        if (!user) return;

        try {
            const { data, error } = await apiClient.profile.getById(user.id);

            if (error) throw new Error(error);

            if (data) {
                setFullName(data.full_name || "");
                setBio(data.bio || "");
                setCompanyName(data.company_name || "");
                setHourlyRate(data.hourly_rate || 0);
                setSkills(data.skills || []);
                setAvatarUrl(data.avatar_url || "");
                setWalletAddress(data.wallet_address || "");
                setGithubUrl(data.github_url || "");
                setLinkedinUrl(data.linkedin_url || "");
                setPortfolioEmail(data.portfolio_email || "");
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

    const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (5 MB)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            toast.error("File size must be less than 5 MB");
            return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Only JPEG, PNG, GIF, and WebP images are allowed");
            return;
        }

        setProfilePictureFile(file);
        // Create preview URL
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
    };

    const handleUploadProfilePicture = async () => {
        if (!profilePictureFile) {
            toast.error("No file selected");
            return;
        }

        setUploadingProfilePic(true);
        try {
            const { data, error } = await apiClient.profile.uploadProfilePicture(profilePictureFile);

            if (error) throw new Error(error);

            setAvatarUrl(data.avatar_url);
            setProfilePictureFile(null);
            setPreviewUrl("");
            // Refresh auth context to update navbar profile picture
            await refreshAuth();
            toast.success("Profile picture uploaded successfully!");
        } catch (error: any) {
            console.error("Error uploading profile picture:", error);
            toast.error(error.message || "Failed to upload profile picture");
        } finally {
            setUploadingProfilePic(false);
        }
    };

    const handleRemoveProfilePicture = () => {
        setProfilePictureFile(null);
        setPreviewUrl("");
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
            // Use connected wallet address
            const finalWalletAddress = walletAddress || null;

            const { data, error } = await apiClient.profile.update({
                fullName,
                bio: bio || null,
                companyName: companyName || null,
                hourlyRate: hourlyRate > 0 ? hourlyRate : null,
                skills: skills,
                avatarUrl: avatarUrl || null,
                walletAddress: finalWalletAddress,
                githubUrl: githubUrl || null,
                linkedinUrl: linkedinUrl || null,
                portfolioEmail: portfolioEmail || null,
            });

            if (error) throw new Error(error);

            // Refresh auth context to update navbar with latest profile data
            await refreshAuth();
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
                                    <AvatarImage src={previewUrl || avatarUrl || undefined} />
                                    <AvatarFallback className="bg-gradient-solana text-background text-3xl font-bold">
                                        {(fullName.charAt(0) || "?").toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-3">
                                    {/* File Upload Section */}
                                    <div>
                                        <Label htmlFor="profilePicture" className="text-sm font-medium mb-2 block">
                                            Upload Profile Picture
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="profilePicture"
                                                type="file"
                                                accept="image/jpeg,image/png,image/gif,image/webp"
                                                onChange={handleProfilePictureChange}
                                                className="cursor-pointer"
                                            />
                                            {profilePictureFile && (
                                                <>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={handleUploadProfilePicture}
                                                        disabled={uploadingProfilePic}
                                                        className="bg-gradient-solana"
                                                    >
                                                        {uploadingProfilePic ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                Uploading...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-4 h-4 mr-2" />
                                                                Upload
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={handleRemoveProfilePicture}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {profilePictureFile
                                                ? `Selected: ${profilePictureFile.name} (${(profilePictureFile.size / 1024 / 1024).toFixed(2)} MB)`
                                                : "Max 5 MB. Supported: JPEG, PNG, GIF, WebP"
                                            }
                                        </p>
                                    </div>

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

                    {/* Wallet Address */}
                    <Card className="glass border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wallet className="w-5 h-5" />
                                Solana Wallet Address
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Wallet Address</Label>

                                {/* Wallet Method Toggle */}
                                <div className="flex gap-2 mb-4">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => setVisible(true)}
                                        className="bg-gradient-solana"
                                    >
                                        <Wallet className="w-4 h-4 mr-2" />
                                        Connect Wallet
                                    </Button>
                                </div>

                                <div className="p-4 border rounded-lg bg-muted/20">
                                    {/* Wallet Connection */}
                                    {walletAddress ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-green-600">
                                                <CheckCircle className="w-4 h-4" />
                                                <span className="text-sm font-medium">Wallet Connected</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded break-all">
                                                {walletAddress}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setVisible(true)}
                                                className="text-xs"
                                            >
                                                Change Wallet
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-orange-600">
                                                <AlertCircle className="w-4 h-4" />
                                                <span className="text-sm font-medium">No Wallet Connected</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Connect your Solana wallet for secure transactions and staking.
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setVisible(true)}
                                                className="bg-gradient-solana text-white hover:bg-gradient-solana/90"
                                            >
                                                <Wallet className="w-4 h-4 mr-2" />
                                                Select Wallet
                                            </Button>
                                        </div>
                                    )}
                                </div>
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

                    {/* Social Media Links */}
                    <Card className="glass border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <LinkIcon className="w-5 h-5" />
                                Social Media & Contact
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Help others connect with you by adding your professional profiles
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label htmlFor="githubUrl" className="flex items-center gap-2 text-base">
                                    <div className="p-1 rounded-md bg-gray-900 text-white">
                                        <Github className="w-4 h-4" />
                                    </div>
                                    GitHub Profile
                                </Label>
                                <Input
                                    id="githubUrl"
                                    type="url"
                                    placeholder="https://github.com/yourusername"
                                    value={githubUrl}
                                    onChange={(e) => setGithubUrl(e.target.value)}
                                    className="pl-4"
                                />
                                {githubUrl && (
                                    <div className="flex items-center gap-2 text-xs">
                                        {/^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/.test(githubUrl) ? (
                                            <CheckCircle className="w-3 h-3 text-green-600" />
                                        ) : (
                                            <AlertCircle className="w-3 h-3 text-red-600" />
                                        )}
                                        <span className={
                                            /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/.test(githubUrl)
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }>
                                            {/^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/.test(githubUrl)
                                                ? "Valid GitHub URL"
                                                : "Please use format: https://github.com/username"
                                            }
                                        </span>
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Showcase your code repositories and open source contributions
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="linkedinUrl" className="flex items-center gap-2 text-base">
                                    <div className="p-1 rounded-md bg-blue-600 text-white">
                                        <Linkedin className="w-4 h-4" />
                                    </div>
                                    LinkedIn Profile
                                </Label>
                                <Input
                                    id="linkedinUrl"
                                    type="url"
                                    placeholder="https://linkedin.com/in/yourusername"
                                    value={linkedinUrl}
                                    onChange={(e) => setLinkedinUrl(e.target.value)}
                                    className="pl-4"
                                />
                                {linkedinUrl && (
                                    <div className="flex items-center gap-2 text-xs">
                                        {/^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9_-]+\/?$/.test(linkedinUrl) ? (
                                            <CheckCircle className="w-3 h-3 text-green-600" />
                                        ) : (
                                            <AlertCircle className="w-3 h-3 text-red-600" />
                                        )}
                                        <span className={
                                            /^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9_-]+\/?$/.test(linkedinUrl)
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }>
                                            {/^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9_-]+\/?$/.test(linkedinUrl)
                                                ? "Valid LinkedIn URL"
                                                : "Please use format: https://linkedin.com/in/username"
                                            }
                                        </span>
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Connect with your professional network and career history
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="portfolioEmail" className="flex items-center gap-2 text-base">
                                    <div className="p-1 rounded-md bg-emerald-600 text-white">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    Portfolio/Contact Email
                                </Label>
                                <Input
                                    id="portfolioEmail"
                                    type="email"
                                    placeholder="contact@yourportfolio.com"
                                    value={portfolioEmail}
                                    onChange={(e) => setPortfolioEmail(e.target.value)}
                                    className="pl-4"
                                />
                                {portfolioEmail && (
                                    <div className="flex items-center gap-2 text-xs">
                                        {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(portfolioEmail) ? (
                                            <CheckCircle className="w-3 h-3 text-green-600" />
                                        ) : (
                                            <AlertCircle className="w-3 h-3 text-red-600" />
                                        )}
                                        <span className={
                                            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(portfolioEmail)
                                                ? "text-green-600"
                                                : "text-red-600"
                                        }>
                                            {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(portfolioEmail)
                                                ? "Valid email address"
                                                : "Please enter a valid email address"
                                            }
                                        </span>
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Alternative email for portfolio inquiries and business contacts
                                </p>
                            </div>
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

