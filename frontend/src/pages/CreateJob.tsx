import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { JobBasicInfo } from "@/components/job-creation/JobBasicInfo";
import { JobSkillsRequirements } from "@/components/job-creation/JobSkillsRequirements";
import { JobPaymentStructure } from "@/components/job-creation/JobPaymentStructure";
import { JobReview } from "@/components/job-creation/JobReview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type JobFormData = {
    // Basic Info
    title: string;
    description: string;
    category: string;
    projectDuration: "short_term" | "medium_term" | "long_term";

    // Skills & Requirements
    skills: string[];
    experienceLevel: "beginner" | "intermediate" | "expert";
    deliverables: string[];

    // Payment Structure
    stage1Name: string;
    stage1Payment: number;
    stage1Description: string;
    stage2Name: string;
    stage2Payment: number;
    stage2Description: string;
    stage3Name: string;
    stage3Payment: number;
    stage3Description: string;
    totalPayment: number;
};

const STEPS = [
    { number: 1, title: "Basic Information", description: "Job title and description" },
    { number: 2, title: "Skills & Requirements", description: "Required skills and deliverables" },
    { number: 3, title: "Payment Structure", description: "Define 3-stage payments" },
    { number: 4, title: "Review & Post", description: "Preview and publish" },
];

export default function CreateJob() {
    const { user, userRole } = useAuth();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState<JobFormData>({
        title: "",
        description: "",
        category: "",
        projectDuration: "medium_term",
        skills: [],
        experienceLevel: "intermediate",
        deliverables: [],
        stage1Name: "Stage 1: Initial Work",
        stage1Payment: 0,
        stage1Description: "",
        stage2Name: "Stage 2: Midpoint Milestone",
        stage2Payment: 0,
        stage2Description: "",
        stage3Name: "Stage 3: Final Delivery",
        stage3Payment: 0,
        stage3Description: "",
        totalPayment: 0,
    });

    // Redirect if not a recruiter
    if (user && userRole !== "recruiter") {
        navigate("/");
        return null;
    }

    if (!user) {
        navigate("/auth");
        return null;
    }

    const updateFormData = (updates: Partial<JobFormData>) => {
        setFormData((prev) => ({ ...prev, ...updates }));
    };

    const handleNext = () => {
        if (currentStep < STEPS.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async (isDraft: boolean = false) => {
        setIsSubmitting(true);

        try {
            // Insert job
            const { data: job, error: jobError } = await supabase
                .from("jobs")
                .insert({
                    recruiter_id: user.id,
                    title: formData.title,
                    description: formData.description,
                    skills: formData.skills,
                    experience_level: formData.experienceLevel,
                    project_duration: formData.projectDuration,
                    category: formData.category,
                    status: isDraft ? "draft" : "open",
                    total_payment: formData.totalPayment,
                })
                .select()
                .single();

            if (jobError) throw jobError;

            // Insert job stages
            const stages = [
                {
                    job_id: job.id,
                    stage_number: 1,
                    name: formData.stage1Name,
                    description: formData.stage1Description,
                    payment: formData.stage1Payment,
                },
                {
                    job_id: job.id,
                    stage_number: 2,
                    name: formData.stage2Name,
                    description: formData.stage2Description,
                    payment: formData.stage2Payment,
                },
                {
                    job_id: job.id,
                    stage_number: 3,
                    name: formData.stage3Name,
                    description: formData.stage3Description,
                    payment: formData.stage3Payment,
                },
            ];

            const { error: stagesError } = await supabase
                .from("job_stages")
                .insert(stages);

            if (stagesError) throw stagesError;

            toast.success(isDraft ? "Job saved as draft!" : "Job posted successfully!");
            navigate("/dashboard/recruiter");
        } catch (error: any) {
            console.error("Error creating job:", error);
            toast.error(error.message || "Failed to create job");
        } finally {
            setIsSubmitting(false);
        }
    };

    const progress = (currentStep / STEPS.length) * 100;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="text-4xl font-bold mb-2">
                        Post a <span className="text-gradient">New Job</span>
                    </h1>
                    <p className="text-muted-foreground">
                        Create a milestone-based job posting to find the perfect freelancer
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <Progress value={progress} className="h-2 mb-4" />
                    <div className="grid grid-cols-4 gap-4">
                        {STEPS.map((step) => (
                            <div
                                key={step.number}
                                className={`flex items-center space-x-2 ${currentStep >= step.number ? "opacity-100" : "opacity-50"
                                    }`}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep > step.number
                                            ? "bg-gradient-solana text-background"
                                            : currentStep === step.number
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground"
                                        }`}
                                >
                                    {currentStep > step.number ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        step.number
                                    )}
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-sm font-medium">{step.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form Steps */}
                <Card className="glass border-white/10">
                    <CardHeader>
                        <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
                        <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {currentStep === 1 && (
                            <JobBasicInfo formData={formData} updateFormData={updateFormData} />
                        )}
                        {currentStep === 2 && (
                            <JobSkillsRequirements formData={formData} updateFormData={updateFormData} />
                        )}
                        {currentStep === 3 && (
                            <JobPaymentStructure formData={formData} updateFormData={updateFormData} />
                        )}
                        {currentStep === 4 && (
                            <JobReview formData={formData} />
                        )}
                    </CardContent>
                </Card>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                    <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentStep === 1 || isSubmitting}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Previous
                    </Button>

                    <div className="flex space-x-4">
                        {currentStep === STEPS.length && (
                            <Button
                                variant="outline"
                                onClick={() => handleSubmit(true)}
                                disabled={isSubmitting}
                            >
                                Save as Draft
                            </Button>
                        )}

                        {currentStep < STEPS.length ? (
                            <Button onClick={handleNext} className="bg-gradient-solana">
                                Next
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={() => handleSubmit(false)}
                                disabled={isSubmitting}
                                className="bg-gradient-solana"
                            >
                                {isSubmitting ? "Posting..." : "Post Job"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

