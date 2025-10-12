import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface ApplicationModalProps {
    jobId: string;
    jobTitle: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const ApplicationModal = ({
    jobId,
    jobTitle,
    isOpen,
    onClose,
    onSuccess,
}: ApplicationModalProps) => {
    const { user } = useAuth();
    const [coverLetter, setCoverLetter] = useState("");
    const [estimatedDays, setEstimatedDays] = useState<number>(0);
    const [portfolioUrls, setPortfolioUrls] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            toast.error("You must be logged in to apply");
            return;
        }

        if (estimatedDays <= 0) {
            toast.error("Please provide a valid estimated completion time");
            return;
        }

        setIsSubmitting(true);

        try {
            // Parse portfolio URLs
            const urls = portfolioUrls
                .split("\n")
                .map((url) => url.trim())
                .filter((url) => url.length > 0);

            // Submit application using new API client
            const { data, error } = await supabase.applications.create({
                jobId,
                coverLetter: coverLetter || null,
                estimatedCompletionDays: estimatedDays,
                portfolioUrls: urls.length > 0 ? urls : null,
            });

            if (error) throw new Error(error);

            toast.success("Application submitted successfully!");
            onSuccess();
        } catch (error: any) {
            console.error("Error submitting application:", error);
            if (error.includes("Already applied")) {
                toast.error("You have already applied to this job");
            } else {
                toast.error(error || "Failed to submit application");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] glass border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Apply for Job</DialogTitle>
                    <DialogDescription>{jobTitle}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="coverLetter">
                            Cover Letter <span className="text-muted-foreground">(Optional)</span>
                        </Label>
                        <Textarea
                            id="coverLetter"
                            placeholder="Tell the recruiter why you're a great fit for this project..."
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            maxLength={1000}
                            rows={6}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {coverLetter.length}/1000 characters
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="estimatedDays">
                            Estimated Completion Time (Days) *
                        </Label>
                        <Input
                            id="estimatedDays"
                            type="number"
                            min="1"
                            placeholder="e.g., 30"
                            value={estimatedDays || ""}
                            onChange={(e) => setEstimatedDays(parseInt(e.target.value) || 0)}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            How many days do you estimate it will take to complete this project?
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="portfolioUrls">
                            Portfolio Links <span className="text-muted-foreground">(Optional)</span>
                        </Label>
                        <Textarea
                            id="portfolioUrls"
                            placeholder="https://github.com/yourprofile&#10;https://yourwebsite.com&#10;(one URL per line)"
                            value={portfolioUrls}
                            onChange={(e) => setPortfolioUrls(e.target.value)}
                            rows={4}
                            className="resize-none font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Add links to your portfolio, GitHub, or relevant work (one per line)
                        </p>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm text-muted-foreground">
                            <strong>Note:</strong> The recruiter will review your application along with your profile and ratings. Make sure your profile is complete to increase your chances of being selected.
                        </p>
                    </div>

                    <div className="flex justify-end space-x-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || estimatedDays <= 0}
                            className="bg-gradient-solana"
                        >
                            {isSubmitting ? (
                                "Submitting..."
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
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

