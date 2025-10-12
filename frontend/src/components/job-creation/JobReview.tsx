import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Coins, Clock, Briefcase, Award, CheckCircle } from "lucide-react";
import { JobFormData } from "@/pages/CreateJob";

interface JobReviewProps {
    formData: JobFormData;
}

export const JobReview = ({ formData }: JobReviewProps) => {
    const getDurationLabel = (duration: string) => {
        switch (duration) {
            case "short_term":
                return "Short-term (< 1 month)";
            case "medium_term":
                return "Medium-term (1-3 months)";
            case "long_term":
                return "Long-term (3+ months)";
            default:
                return duration;
        }
    };

    const getExperienceLabel = (level: string) => {
        return level.charAt(0).toUpperCase() + level.slice(1);
    };

    return (
        <div className="space-y-6">
            {/* Preview Card */}
            <div className="p-6 bg-gradient-card rounded-xl border border-white/10">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">{formData.title || "Untitled Job"}</h2>
                        {formData.category && (
                            <Badge variant="secondary" className="mb-2">
                                <Briefcase className="w-3 h-3 mr-1" />
                                {formData.category}
                            </Badge>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="flex items-center space-x-2 text-2xl font-bold text-gradient">
                            <Coins className="w-6 h-6" />
                            <span>{formData.totalPayment.toFixed(2)} SOL</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Total Payment</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{getDurationLabel(formData.projectDuration)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <Award className="w-4 h-4" />
                        <span>{getExperienceLabel(formData.experienceLevel)}</span>
                    </div>
                </div>

                <p className="text-muted-foreground whitespace-pre-wrap">
                    {formData.description || "No description provided"}
                </p>

                {formData.skills.length > 0 && (
                    <>
                        <Separator className="my-4" />
                        <div>
                            <h3 className="text-sm font-semibold mb-2">Required Skills</h3>
                            <div className="flex flex-wrap gap-2">
                                {formData.skills.map((skill, index) => (
                                    <Badge key={index} variant="outline" className="border-primary/30">
                                        {skill}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {formData.deliverables.length > 0 && (
                    <>
                        <Separator className="my-4" />
                        <div>
                            <h3 className="text-sm font-semibold mb-2">Required Deliverables</h3>
                            <ul className="space-y-2">
                                {formData.deliverables.map((deliverable, index) => (
                                    <li key={index} className="flex items-start space-x-2 text-sm">
                                        <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                                        <span>{deliverable}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
            </div>

            {/* Payment Stages */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Payment Structure</h3>
                <div className="space-y-4">
                    {/* Stage 1 */}
                    <div className="p-4 bg-muted/50 rounded-lg border border-white/5">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-solana flex items-center justify-center text-xs font-bold">
                                    1
                                </div>
                                <h4 className="font-medium">{formData.stage1Name}</h4>
                            </div>
                            <div className="flex items-center space-x-1 text-lg font-bold text-gradient">
                                <Coins className="w-4 h-4" />
                                <span>{formData.stage1Payment.toFixed(2)} SOL</span>
                            </div>
                        </div>
                        {formData.stage1Description && (
                            <p className="text-sm text-muted-foreground ml-8">
                                {formData.stage1Description}
                            </p>
                        )}
                    </div>

                    {/* Stage 2 */}
                    <div className="p-4 bg-muted/50 rounded-lg border border-white/5">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-solana flex items-center justify-center text-xs font-bold">
                                    2
                                </div>
                                <h4 className="font-medium">{formData.stage2Name}</h4>
                            </div>
                            <div className="flex items-center space-x-1 text-lg font-bold text-gradient">
                                <Coins className="w-4 h-4" />
                                <span>{formData.stage2Payment.toFixed(2)} SOL</span>
                            </div>
                        </div>
                        {formData.stage2Description && (
                            <p className="text-sm text-muted-foreground ml-8">
                                {formData.stage2Description}
                            </p>
                        )}
                    </div>

                    {/* Stage 3 */}
                    <div className="p-4 bg-muted/50 rounded-lg border border-white/5">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-solana flex items-center justify-center text-xs font-bold">
                                    3
                                </div>
                                <h4 className="font-medium">{formData.stage3Name}</h4>
                            </div>
                            <div className="flex items-center space-x-1 text-lg font-bold text-gradient">
                                <Coins className="w-4 h-4" />
                                <span>{formData.stage3Payment.toFixed(2)} SOL</span>
                            </div>
                        </div>
                        {formData.stage3Description && (
                            <p className="text-sm text-muted-foreground ml-8">
                                {formData.stage3Description}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Staking Info */}
            <div className="p-4 bg-warning/10 rounded-lg border border-warning/30">
                <h4 className="font-medium mb-2 flex items-center space-x-2">
                    <span className="text-warning">⚠️</span>
                    <span>Staking Requirement</span>
                </h4>
                <p className="text-sm text-muted-foreground">
                    When you select a freelancer, you'll be required to stake at least{" "}
                    <strong className="text-warning">{(formData.totalPayment * 0.2).toFixed(2)} SOL</strong>{" "}
                    (20% of total payment). This ensures payment security for the freelancer.
                </p>
            </div>

            <div className="p-4 bg-success/10 rounded-lg border border-success/30">
                <p className="text-sm text-muted-foreground">
                    <strong>Ready to post?</strong> Your job will be visible to all freelancers on the platform. You'll receive applications and can review freelancer profiles before making your selection.
                </p>
            </div>
        </div>
    );
};

