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
import { Switch } from "@/components/ui/switch";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface RatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectTitle: string;
    counterpartyName: string;
    counterpartyId: string;
    isRecruiter: boolean;
    onSuccess?: () => void;
}

const RatingCriteria = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
}) => {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        className="focus:outline-none transition-all hover:scale-110"
                    >
                        <Star
                            className={`w-8 h-8 ${star <= value
                                    ? "fill-warning text-warning"
                                    : "text-muted-foreground"
                                }`}
                        />
                    </button>
                ))}
                <span className="text-sm text-muted-foreground ml-2">
                    {value > 0 ? `${value}/5` : "Not rated"}
                </span>
            </div>
        </div>
    );
};

export const RatingModal = ({
    isOpen,
    onClose,
    projectId,
    projectTitle,
    counterpartyName,
    counterpartyId,
    isRecruiter,
    onSuccess,
}: RatingModalProps) => {
    const { user } = useAuth();
    const [overallRating, setOverallRating] = useState(0);
    const [communicationRating, setCommunicationRating] = useState(0);
    const [qualityRating, setQualityRating] = useState(0);
    const [professionalismRating, setProfessionalismRating] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [isPublic, setIsPublic] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            toast.error("You must be logged in to submit a rating");
            return;
        }

        if (overallRating === 0 || communicationRating === 0 || qualityRating === 0 || professionalismRating === 0) {
            toast.error("Please provide all ratings");
            return;
        }

        setIsSubmitting(true);

        try {
            // Insert rating
            const { error: ratingError } = await supabase.from("ratings").insert({
                project_id: projectId,
                rater_id: user.id,
                ratee_id: counterpartyId,
                overall_rating: overallRating,
                communication_rating: communicationRating,
                quality_rating: qualityRating,
                professionalism_rating: professionalismRating,
                review_text: reviewText || null,
                is_public: isPublic,
            });

            if (ratingError) throw ratingError;

            // Calculate trust points changes
            const averageRating = (overallRating + communicationRating + qualityRating + professionalismRating) / 4;
            let pointsChange = 0;

            // Points based on rating
            if (averageRating >= 4.5) {
                pointsChange += 15; // 5-star equivalent
            } else if (averageRating >= 3.5) {
                pointsChange += 10; // 4-star equivalent
            } else if (averageRating >= 2.5) {
                pointsChange += 5; // 3-star equivalent
            } else {
                pointsChange -= 15; // 1-2 star penalty
            }

            // Project completion bonus
            pointsChange += 20;

            // Update trust points for the rated user
            const { data: currentTrust } = await supabase
                .from("trust_points")
                .select("*")
                .eq("user_id", counterpartyId)
                .single();

            if (currentTrust) {
                const newPoints = Math.max(0, currentTrust.total_points + pointsChange);
                const newCompletedProjects = currentTrust.completed_projects + 1;
                const newSuccessfulProjects = averageRating >= 3 ? currentTrust.successful_projects + 1 : currentTrust.successful_projects;

                // Calculate new average rating
                const { data: allRatings } = await supabase
                    .from("ratings")
                    .select("overall_rating")
                    .eq("ratee_id", counterpartyId);

                const totalRatings = (allRatings || []).length + 1;
                const sumRatings = (allRatings || []).reduce((sum, r) => sum + r.overall_rating, 0) + overallRating;
                const newAverageRating = sumRatings / totalRatings;

                // Calculate success rate
                const successRate = newCompletedProjects > 0 ? newSuccessfulProjects / newCompletedProjects : 0;

                // Determine new tier using the database function
                const newTier = calculateTier(newPoints, newCompletedProjects, successRate);

                // Update trust points
                await supabase
                    .from("trust_points")
                    .update({
                        total_points: newPoints,
                        completed_projects: newCompletedProjects,
                        successful_projects: newSuccessfulProjects,
                        average_rating: newAverageRating,
                        tier: newTier,
                        last_calculated_at: new Date().toISOString(),
                    })
                    .eq("user_id", counterpartyId);
            }

            // Create notification
            await supabase.from("notifications").insert({
                user_id: counterpartyId,
                title: "New Rating Received",
                message: `You received a ${averageRating.toFixed(1)}-star rating for "${projectTitle}"`,
                type: "rating",
                related_id: projectId,
            });

            toast.success("Rating submitted successfully!");
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error("Error submitting rating:", error);
            if (error.code === "23505") {
                toast.error("You have already rated this project");
            } else {
                toast.error(error.message || "Failed to submit rating");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const calculateTier = (points: number, completed: number, successRate: number): "gold" | "silver" | "bronze" | "iron" => {
        if (points >= 1000 && completed >= 50 && successRate >= 0.95) {
            return "gold";
        } else if (points >= 500 && completed >= 20 && successRate >= 0.85) {
            return "silver";
        } else if (points >= 100 && completed >= 5 && successRate >= 0.75) {
            return "bronze";
        } else {
            return "iron";
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] glass border-white/10 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Rate Your Experience</DialogTitle>
                    <DialogDescription>
                        How was working with {counterpartyName} on "{projectTitle}"?
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="space-y-6">
                        <RatingCriteria
                            label="Overall Satisfaction"
                            value={overallRating}
                            onChange={setOverallRating}
                        />

                        <RatingCriteria
                            label="Communication"
                            value={communicationRating}
                            onChange={setCommunicationRating}
                        />

                        <RatingCriteria
                            label={isRecruiter ? "Quality of Work" : "Payment & Requirements Clarity"}
                            value={qualityRating}
                            onChange={setQualityRating}
                        />

                        <RatingCriteria
                            label="Professionalism"
                            value={professionalismRating}
                            onChange={setProfessionalismRating}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="review">
                            Written Review <span className="text-muted-foreground">(Optional)</span>
                        </Label>
                        <Textarea
                            id="review"
                            placeholder="Share your experience working together..."
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            maxLength={500}
                            rows={4}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {reviewText.length}/500 characters
                        </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                            <Label htmlFor="public-toggle" className="cursor-pointer">
                                Make review public
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                                Public reviews are visible on profiles
                            </p>
                        </div>
                        <Switch
                            id="public-toggle"
                            checked={isPublic}
                            onCheckedChange={setIsPublic}
                        />
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm text-muted-foreground">
                            <strong>Note:</strong> Ratings are permanent and cannot be changed after 48 hours. Your rating will affect the {isRecruiter ? "freelancer's" : "recruiter's"} trust score and tier.
                        </p>
                    </div>

                    <div className="flex space-x-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isSubmitting ||
                                overallRating === 0 ||
                                communicationRating === 0 ||
                                qualityRating === 0 ||
                                professionalismRating === 0
                            }
                            className="flex-1 bg-gradient-solana"
                        >
                            {isSubmitting ? "Submitting..." : "Submit Rating"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

