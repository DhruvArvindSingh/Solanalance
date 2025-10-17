import { useState } from "react";
import { apiClient } from "@/integrations/apiClient/client";
import { useAuth } from "@/hooks/useAuth";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertCircle, FileText, Upload, Loader2 } from "lucide-react";

interface ApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    jobTitle: string;
    onSuccess: () => void;
}

export const ApplicationModal = ({
    isOpen,
    onClose,
    jobId,
    jobTitle,
    onSuccess,
}: ApplicationModalProps) => {
    const { user } = useAuth();
    const [coverLetterText, setCoverLetterText] = useState("");
    const [estimatedDays, setEstimatedDays] = useState("");
    const [portfolioLinks, setPortfolioLinks] = useState("");
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'resume' | 'coverLetter') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            toast.error(`File size exceeds 10 MB. Please choose a smaller file.`);
            e.target.value = '';
            return;
        }

        // Validate file type
        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are allowed');
            e.target.value = '';
            return;
        }

        if (fileType === 'resume') {
            setResumeFile(file);
        } else {
            setCoverLetterFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!estimatedDays.trim()) {
            toast.error("Please enter estimated completion time");
            return;
        }

        if (isNaN(parseInt(estimatedDays))) {
            toast.error("Estimated completion time must be a number");
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('jobId', jobId);
            formData.append('coverLetterText', coverLetterText);
            formData.append('estimatedCompletionDays', estimatedDays);

            if (portfolioLinks.trim()) {
                const links = portfolioLinks
                    .split('\n')
                    .map(link => link.trim())
                    .filter(link => link);
                formData.append('portfolioUrls', JSON.stringify(links));
            }

            if (resumeFile) {
                formData.append('resume', resumeFile);
            }

            if (coverLetterFile) {
                formData.append('coverLetter', coverLetterFile);
            }

            // Debug: Check token
            const token = localStorage.getItem('token');
            console.log('Token available:', !!token);
            console.log('Auth header will be sent:', token ? `Bearer ${token.substring(0, 20)}...` : 'No token');

            const { data, error } = await apiClient.request('/applications', {
                method: 'POST',
                body: formData,
            });

            if (error) {
                throw new Error(error);
            }

            toast.success("Application submitted successfully!");
            onSuccess();
            onClose();

            // Reset form
            setCoverLetterText("");
            setEstimatedDays("");
            setPortfolioLinks("");
            setResumeFile(null);
            setCoverLetterFile(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to submit application");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto glass border-white/10">
                <DialogHeader>
                    <DialogTitle>Apply for Job</DialogTitle>
                    <DialogDescription>{jobTitle}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Cover Letter Text */}
                    <div className="space-y-2">
                        <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                        <Textarea
                            id="coverLetter"
                            placeholder="Tell the recruiter why you're a great fit for this project..."
                            value={coverLetterText}
                            onChange={(e) => setCoverLetterText(e.target.value)}
                            className="min-h-[120px]"
                        />
                        <p className="text-xs text-muted-foreground">
                            {coverLetterText.length}/1000 characters
                        </p>
                    </div>

                    {/* Resume File Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="resume" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Resume (PDF) - Optional
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="resume"
                                type="file"
                                accept=".pdf"
                                onChange={(e) => handleFileChange(e, 'resume')}
                                className="cursor-pointer"
                            />
                            <Upload className="w-4 h-4 text-muted-foreground" />
                        </div>
                        {resumeFile && (
                            <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/30 rounded">
                                <span className="text-sm text-green-600">
                                    ✓ {resumeFile.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Max file size: 10 MB
                        </p>
                    </div>

                    {/* Cover Letter File Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="coverLetterFile" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Cover Letter (PDF) - Optional
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="coverLetterFile"
                                type="file"
                                accept=".pdf"
                                onChange={(e) => handleFileChange(e, 'coverLetter')}
                                className="cursor-pointer"
                            />
                            <Upload className="w-4 h-4 text-muted-foreground" />
                        </div>
                        {coverLetterFile && (
                            <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/30 rounded">
                                <span className="text-sm text-green-600">
                                    ✓ {coverLetterFile.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {(coverLetterFile.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Max file size: 10 MB
                        </p>
                    </div>

                    {/* Estimated Completion Time */}
                    <div className="space-y-2">
                        <Label htmlFor="estimatedDays">
                            Estimated Completion Time (Days) *
                        </Label>
                        <Input
                            id="estimatedDays"
                            type="number"
                            placeholder="e.g., 30"
                            value={estimatedDays}
                            onChange={(e) => setEstimatedDays(e.target.value)}
                            min="1"
                        />
                        <p className="text-xs text-muted-foreground">
                            How many days do you estimate it will take to complete this project?
                        </p>
                    </div>

                    {/* Portfolio Links */}
                    <div className="space-y-2">
                        <Label htmlFor="portfolio">
                            Portfolio Links (Optional)
                        </Label>
                        <Textarea
                            id="portfolio"
                            placeholder="https://github.com/yourprofile https://yourwebsite.com (one URL per line)"
                            value={portfolioLinks}
                            onChange={(e) => setPortfolioLinks(e.target.value)}
                            className="min-h-[80px] font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Add links to your portfolio, GitHub, or relevant work (one per line)
                        </p>
                    </div>

                    {/* Info Alert */}
                    <Alert className="border-blue-500/30 bg-blue-500/10">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-sm">
                            The recruiter will review your application along with your profile and
                            ratings. Make sure your profile is complete to increase your chances of being selected.
                        </AlertDescription>
                    </Alert>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-gradient-solana"
                            disabled={loading || !estimatedDays.trim()}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Submit Application
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

