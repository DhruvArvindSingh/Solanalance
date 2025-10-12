import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { JobFormData } from "@/pages/CreateJob";

interface JobBasicInfoProps {
    formData: JobFormData;
    updateFormData: (updates: Partial<JobFormData>) => void;
}

export const JobBasicInfo = ({ formData, updateFormData }: JobBasicInfoProps) => {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                    id="title"
                    placeholder="e.g., Full-Stack Web3 Developer"
                    value={formData.title}
                    onChange={(e) => updateFormData({ title: e.target.value })}
                    maxLength={100}
                    required
                />
                <p className="text-xs text-muted-foreground">
                    {formData.title.length}/100 characters
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Full Description *</Label>
                <Textarea
                    id="description"
                    placeholder="Describe the project in detail. What are the goals? What will the freelancer be working on?"
                    value={formData.description}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                    maxLength={5000}
                    rows={8}
                    required
                    className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                    {formData.description.length}/5000 characters
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="category">Project Category</Label>
                    <Input
                        id="category"
                        placeholder="e.g., Web Development, Design, Marketing"
                        value={formData.category}
                        onChange={(e) => updateFormData({ category: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="duration">Project Duration</Label>
                    <Select
                        value={formData.projectDuration}
                        onValueChange={(value: "short_term" | "medium_term" | "long_term") =>
                            updateFormData({ projectDuration: value })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="short_term">Short-term (&lt; 1 month)</SelectItem>
                            <SelectItem value="medium_term">Medium-term (1-3 months)</SelectItem>
                            <SelectItem value="long_term">Long-term (3+ months)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground">
                    <strong>Tip:</strong> Clear and detailed job descriptions attract higher-quality applicants. Be specific about what you're looking for and what the freelancer will deliver.
                </p>
            </div>
        </div>
    );
};

