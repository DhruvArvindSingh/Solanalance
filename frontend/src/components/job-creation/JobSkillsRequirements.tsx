import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { X, Plus } from "lucide-react";
import { JobFormData } from "@/pages/CreateJob";

interface JobSkillsRequirementsProps {
    formData: JobFormData;
    updateFormData: (updates: Partial<JobFormData>) => void;
}

export const JobSkillsRequirements = ({
    formData,
    updateFormData,
}: JobSkillsRequirementsProps) => {
    const [skillInput, setSkillInput] = useState("");
    const [deliverableInput, setDeliverableInput] = useState("");

    const addSkill = () => {
        if (skillInput.trim() && formData.skills.length < 15) {
            updateFormData({ skills: [...formData.skills, skillInput.trim()] });
            setSkillInput("");
        }
    };

    const removeSkill = (index: number) => {
        const newSkills = formData.skills.filter((_, i) => i !== index);
        updateFormData({ skills: newSkills });
    };

    const addDeliverable = () => {
        if (deliverableInput.trim()) {
            updateFormData({
                deliverables: [...formData.deliverables, deliverableInput.trim()],
            });
            setDeliverableInput("");
        }
    };

    const removeDeliverable = (index: number) => {
        const newDeliverables = formData.deliverables.filter((_, i) => i !== index);
        updateFormData({ deliverables: newDeliverables });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="skills">Required Skills * (Min: 3, Max: 15)</Label>
                <div className="flex space-x-2">
                    <Input
                        id="skills"
                        placeholder="e.g., React, TypeScript, Solana"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addSkill();
                            }
                        }}
                    />
                    <Button
                        type="button"
                        onClick={addSkill}
                        disabled={formData.skills.length >= 15}
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    {formData.skills.map((skill, index) => (
                        <Badge
                            key={index}
                            variant="secondary"
                            className="px-3 py-1 text-sm flex items-center space-x-1"
                        >
                            <span>{skill}</span>
                            <button
                                onClick={() => removeSkill(index)}
                                className="ml-1 hover:text-destructive"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
                {formData.skills.length < 3 && (
                    <p className="text-xs text-warning">
                        Please add at least 3 skills
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="experience">Experience Level</Label>
                <Select
                    value={formData.experienceLevel}
                    onValueChange={(value: "beginner" | "intermediate" | "expert") =>
                        updateFormData({ experienceLevel: value })
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="deliverables">Required Deliverables</Label>
                <div className="flex space-x-2">
                    <Textarea
                        id="deliverables"
                        placeholder="e.g., Fully functional web application"
                        value={deliverableInput}
                        onChange={(e) => setDeliverableInput(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === "Enter" && e.ctrlKey) {
                                e.preventDefault();
                                addDeliverable();
                            }
                        }}
                        rows={2}
                    />
                    <Button type="button" onClick={addDeliverable} className="self-start">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Press Ctrl+Enter or click + to add
                </p>
                <ul className="space-y-2 mt-2">
                    {formData.deliverables.map((deliverable, index) => (
                        <li
                            key={index}
                            className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                        >
                            <span className="text-sm flex-1">{deliverable}</span>
                            <button
                                onClick={() => removeDeliverable(index)}
                                className="ml-2 hover:text-destructive"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground">
                    <strong>Tip:</strong> Be specific about the skills you need and what deliverables you expect. This helps freelancers understand if they're a good fit.
                </p>
            </div>
        </div>
    );
};

