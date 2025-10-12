import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Search, FileText, CheckCircle, Coins, Shield, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HowItWorks = () => {
    const navigate = useNavigate();

    const steps = [
        {
            step: 1,
            title: "Create Your Profile",
            description: "Sign up and create a comprehensive profile showcasing your skills, experience, and portfolio.",
            icon: <Users className="w-8 h-8 text-primary" />,
            details: [
                "Add your skills and expertise",
                "Upload portfolio samples",
                "Set your hourly rate in SOL",
                "Build your reputation with ratings"
            ]
        },
        {
            step: 2,
            title: "Browse Opportunities",
            description: "Discover projects that match your skills and interests from our curated marketplace.",
            icon: <Search className="w-8 h-8 text-primary" />,
            details: [
                "Advanced search and filtering",
                "Real-time job updates",
                "Detailed project requirements",
                "Competitive compensation in SOL"
            ]
        },
        {
            step: 3,
            title: "Submit Your Application",
            description: "Apply to projects with a compelling cover letter and showcase your relevant experience.",
            icon: <FileText className="w-8 h-8 text-primary" />,
            details: [
                "Custom cover letters",
                "Portfolio links and samples",
                "Estimated completion timeline",
                "Direct communication with recruiters"
            ]
        },
        {
            step: 4,
            title: "Get Selected & Start Working",
            description: "Once selected, the recruiter stakes funds and you begin working on clearly defined milestones.",
            icon: <CheckCircle className="w-8 h-8 text-primary" />,
            details: [
                "Secure fund staking by recruiters",
                "Milestone-based project structure",
                "Blockchain-verified payments",
                "Automatic fund release on approval"
            ]
        }
    ];

    const features = [
        {
            icon: <Coins className="w-6 h-6 text-secondary" />,
            title: "SOL Payments",
            description: "Get paid in Solana's native cryptocurrency with fast, low-cost transactions."
        },
        {
            icon: <Shield className="w-6 h-6 text-secondary" />,
            title: "Escrow Protection",
            description: "Funds are held in secure escrow until work is completed and approved."
        },
        {
            icon: <Clock className="w-6 h-6 text-secondary" />,
            title: "Milestone Payments",
            description: "Projects are divided into milestones with automatic payments upon completion."
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="pt-24 pb-16">
                {/* Header */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/")}
                        className="mb-8"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Button>

                    <div className="text-center mb-16">
                        <h1 className="text-5xl font-bold mb-6">
                            How <span className="text-gradient">SolanaLance</span> Works
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                            Connect with top talent and get your projects done with confidence.
                            Our blockchain-powered platform ensures secure, transparent, and efficient collaboration.
                        </p>
                    </div>
                </div>

                {/* Steps */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {steps.map((step, index) => (
                            <Card key={index} className="glass border-white/10 relative overflow-hidden">
                                <CardHeader className="pb-4">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                {step.icon}
                                            </div>
                                            <div>
                                                <Badge className="mb-2">Step {step.step}</Badge>
                                                <CardTitle className="text-xl">{step.title}</CardTitle>
                                            </div>
                                        </div>
                                    </div>
                                    <CardDescription className="text-base">
                                        {step.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {step.details.map((detail, detailIndex) => (
                                            <li key={detailIndex} className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                                                <span>{detail}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Features */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-20">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">Why Choose SolanaLance?</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Built on Solana blockchain for speed, security, and transparency.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <Card key={index} className="glass border-white/10 text-center">
                                <CardContent className="pt-8">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                                    <p className="text-muted-foreground">{feature.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <Card className="glass border-white/10 bg-gradient-to-r from-primary/5 to-secondary/5">
                        <CardContent className="text-center py-12">
                            <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
                            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                                Join thousands of freelancers and recruiters who trust SolanaLance for their project needs.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    size="lg"
                                    className="bg-gradient-solana"
                                    onClick={() => navigate("/auth")}
                                >
                                    Sign Up Now
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => navigate("/discover")}
                                >
                                    Browse Jobs
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default HowItWorks;
