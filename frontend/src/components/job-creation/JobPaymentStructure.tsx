import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Coins, AlertCircle } from "lucide-react";
import { JobFormData } from "@/pages/CreateJob";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JobPaymentStructureProps {
    formData: JobFormData;
    updateFormData: (updates: Partial<JobFormData>) => void;
}

export const JobPaymentStructure = ({
    formData,
    updateFormData,
}: JobPaymentStructureProps) => {
    // Calculate total payment whenever stage payments change
    useEffect(() => {
        const total =
            (formData.stage1Payment || 0) +
            (formData.stage2Payment || 0) +
            (formData.stage3Payment || 0);
        updateFormData({ totalPayment: total });
    }, [formData.stage1Payment, formData.stage2Payment, formData.stage3Payment]);

    const minimumStake = formData.totalPayment * 0.2;

    return (
        <div className="space-y-6">
            <Alert className="border-primary/20 bg-primary/5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Define payment for each of the 3 milestones. You'll be required to stake at least 20% of the total amount when hiring a freelancer.
                </AlertDescription>
            </Alert>

            {/* Stage 1 */}
            <div className="p-6 bg-gradient-card rounded-xl border border-border space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold">
                        1
                    </div>
                    <h3 className="text-lg font-semibold">Stage 1: Initial Work</h3>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="stage1Name">Stage Name</Label>
                    <Input
                        id="stage1Name"
                        placeholder="e.g., UI Design & Wireframes"
                        value={formData.stage1Name}
                        onChange={(e) => updateFormData({ stage1Name: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="stage1Payment">Payment (SOL) *</Label>
                    <div className="relative">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            id="stage1Payment"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={formData.stage1Payment || ""}
                            onChange={(e) =>
                                updateFormData({ stage1Payment: parseFloat(e.target.value) || 0 })
                            }
                            className="pl-10"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="stage1Description">Description (Optional)</Label>
                    <Textarea
                        id="stage1Description"
                        placeholder="Describe what needs to be completed in this stage"
                        value={formData.stage1Description}
                        onChange={(e) =>
                            updateFormData({ stage1Description: e.target.value })
                        }
                        rows={2}
                    />
                </div>
            </div>

            {/* Stage 2 */}
            <div className="p-6 bg-gradient-card rounded-xl border border-border space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold">
                        2
                    </div>
                    <h3 className="text-lg font-semibold">Stage 2: Midpoint Milestone</h3>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="stage2Name">Stage Name</Label>
                    <Input
                        id="stage2Name"
                        placeholder="e.g., Backend Development"
                        value={formData.stage2Name}
                        onChange={(e) => updateFormData({ stage2Name: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="stage2Payment">Payment (SOL) *</Label>
                    <div className="relative">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            id="stage2Payment"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={formData.stage2Payment || ""}
                            onChange={(e) =>
                                updateFormData({ stage2Payment: parseFloat(e.target.value) || 0 })
                            }
                            className="pl-10"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="stage2Description">Description (Optional)</Label>
                    <Textarea
                        id="stage2Description"
                        placeholder="Describe what needs to be completed in this stage"
                        value={formData.stage2Description}
                        onChange={(e) =>
                            updateFormData({ stage2Description: e.target.value })
                        }
                        rows={2}
                    />
                </div>
            </div>

            {/* Stage 3 */}
            <div className="p-6 bg-gradient-card rounded-xl border border-border space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold">
                        3
                    </div>
                    <h3 className="text-lg font-semibold">Stage 3: Final Delivery</h3>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="stage3Name">Stage Name</Label>
                    <Input
                        id="stage3Name"
                        placeholder="e.g., Testing & Deployment"
                        value={formData.stage3Name}
                        onChange={(e) => updateFormData({ stage3Name: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="stage3Payment">Payment (SOL) *</Label>
                    <div className="relative">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            id="stage3Payment"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={formData.stage3Payment || ""}
                            onChange={(e) =>
                                updateFormData({ stage3Payment: parseFloat(e.target.value) || 0 })
                            }
                            className="pl-10"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="stage3Description">Description (Optional)</Label>
                    <Textarea
                        id="stage3Description"
                        placeholder="Describe what needs to be completed in this stage"
                        value={formData.stage3Description}
                        onChange={(e) =>
                            updateFormData({ stage3Description: e.target.value })
                        }
                        rows={2}
                    />
                </div>
            </div>

            {/* Summary */}
            <div className="p-6 bg-primary/10 rounded-xl border border-primary space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total Project Payment:</span>
                    <div className="flex items-center space-x-2">
                        <Coins className="w-6 h-6 text-secondary" />
                        <span className="text-3xl font-bold text-primary">
                            {formData.totalPayment.toFixed(2)} SOL
                        </span>
                    </div>
                </div>

                <div className="pt-3 border-t border-border">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                            Minimum Stake Required (20%):
                        </span>
                        <span className="font-semibold text-warning">
                            {minimumStake.toFixed(2)} SOL
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        You'll need to stake this amount when selecting a freelancer. It will be held in escrow and released as milestones are completed.
                    </p>
                </div>
            </div>
        </div>
    );
};

