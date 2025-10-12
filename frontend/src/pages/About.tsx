import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    ArrowLeft,
    Target,
    Shield,
    Zap,
    Users,
    Globe,
    Award,
    TrendingUp,
    Heart,
    Star,
    CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const About = () => {
    const navigate = useNavigate();

    const values = [
        {
            icon: <Shield className="w-6 h-6 text-primary" />,
            title: "Security First",
            description: "Your funds and data are protected by blockchain technology and enterprise-grade security."
        },
        {
            icon: <Zap className="w-6 h-6 text-primary" />,
            title: "Lightning Fast",
            description: "Built on Solana for near-instant transactions and real-time collaboration."
        },
        {
            icon: <Users className="w-6 h-6 text-primary" />,
            title: "Community Driven",
            description: "Empowering freelancers and businesses to collaborate and grow together."
        },
        {
            icon: <Award className="w-6 h-6 text-primary" />,
            title: "Quality Assurance",
            description: "Rigorous vetting process and reputation system ensure high-quality work."
        }
    ];

    const stats = [
        { number: "10K+", label: "Active Users" },
        { number: "50K+", label: "Projects Completed" },
        { number: "98%", label: "Client Satisfaction" },
        { number: "$2M+", label: "Paid Out" }
    ];

    const team = [
        {
            name: "Alex Chen",
            role: "CEO & Founder",
            bio: "Former Google engineer with 10+ years in fintech and blockchain.",
            avatar: "AC"
        },
        {
            name: "Sarah Johnson",
            role: "CTO",
            bio: "Solana ecosystem expert and former lead developer at major DeFi protocols.",
            avatar: "SJ"
        },
        {
            name: "Marcus Rodriguez",
            role: "Head of Operations",
            bio: "Operations expert with extensive experience in scaling tech companies.",
            avatar: "MR"
        },
        {
            name: "Emily Zhang",
            role: "Lead Designer",
            bio: "Award-winning UX designer passionate about creating intuitive experiences.",
            avatar: "EZ"
        }
    ];

    const milestones = [
        {
            year: "2023",
            title: "Platform Launch",
            description: "SolanaLance goes live with core freelancing features."
        },
        {
            year: "2024",
            title: "1M Transactions",
            description: "Processed over 1 million SOL transactions on our platform."
        },
        {
            year: "2024",
            title: "Global Expansion",
            description: "Expanded to serve users in 50+ countries worldwide."
        },
        {
            year: "2025",
            title: "Enterprise Solutions",
            description: "Launched enterprise-grade features for large organizations."
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
                            About <span className="text-gradient">SolanaLance</span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                            We're revolutionizing freelancing by combining the power of blockchain technology
                            with a seamless user experience. Our mission is to create the most trusted and
                            efficient marketplace for digital talent.
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, index) => (
                            <Card key={index} className="glass border-white/10 text-center">
                                <CardContent className="pt-8">
                                    <div className="text-3xl font-bold text-gradient mb-2">{stat.number}</div>
                                    <div className="text-muted-foreground">{stat.label}</div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Mission */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-20">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
                            <p className="text-lg text-muted-foreground mb-6">
                                To democratize access to quality talent and create opportunities for skilled
                                professionals worldwide. We believe that by leveraging blockchain technology,
                                we can build a more transparent, fair, and efficient freelancing ecosystem.
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <CheckCircle className="w-5 h-5 text-success mt-1 flex-shrink-0" />
                                    <span className="text-muted-foreground">Eliminate payment disputes with smart contracts</span>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <CheckCircle className="w-5 h-5 text-success mt-1 flex-shrink-0" />
                                    <span className="text-muted-foreground">Reduce platform fees with direct blockchain transactions</span>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <CheckCircle className="w-5 h-5 text-success mt-1 flex-shrink-0" />
                                    <span className="text-muted-foreground">Create global opportunities without geographical barriers</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <Card className="glass border-white/10">
                                <CardContent className="p-8">
                                    <div className="text-center">
                                        <Target className="w-16 h-16 text-primary mx-auto mb-4" />
                                        <h3 className="text-xl font-semibold mb-4">What Makes Us Different</h3>
                                        <p className="text-muted-foreground">
                                            Unlike traditional freelancing platforms, SolanaLance combines the speed of
                                            Solana blockchain with intuitive design to deliver a superior experience for
                                            both freelancers and clients.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Values */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-20">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">Our Values</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            The principles that guide everything we do and build.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {values.map((value, index) => (
                            <Card key={index} className="glass border-white/10">
                                <CardContent className="p-6">
                                    <div className="flex items-start space-x-4">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            {value.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                                            <p className="text-muted-foreground">{value.description}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Timeline */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-20">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">Our Journey</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            From concept to industry leader in blockchain freelancing.
                        </p>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        {milestones.map((milestone, index) => (
                            <div key={index} className="flex items-start space-x-6 mb-8">
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full bg-gradient-solana flex items-center justify-center text-white font-bold">
                                        {milestone.year.slice(-2)}
                                    </div>
                                    {index < milestones.length - 1 && (
                                        <div className="w-0.5 h-16 bg-gradient-to-b from-primary to-secondary mt-4"></div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Badge className="mb-2">{milestone.year}</Badge>
                                    <h3 className="text-xl font-semibold mb-2">{milestone.title}</h3>
                                    <p className="text-muted-foreground">{milestone.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Team */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-20">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">Meet Our Team</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            The passionate individuals behind SolanaLance.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {team.map((member, index) => (
                            <Card key={index} className="glass border-white/10 text-center">
                                <CardContent className="pt-8">
                                    <Avatar className="w-20 h-20 mx-auto mb-4 border-4 border-primary/20">
                                        <AvatarFallback className="bg-gradient-solana text-white text-xl font-bold">
                                            {member.avatar}
                                        </AvatarFallback>
                                    </Avatar>
                                    <h3 className="text-lg font-semibold mb-1">{member.name}</h3>
                                    <Badge variant="secondary" className="mb-3">{member.role}</Badge>
                                    <p className="text-sm text-muted-foreground">{member.bio}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <Card className="glass border-white/10 bg-gradient-to-r from-primary/5 to-secondary/5">
                        <CardContent className="text-center py-12">
                            <Heart className="w-16 h-16 text-primary mx-auto mb-4" />
                            <h3 className="text-2xl font-bold mb-4">Join Our Community</h3>
                            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                                Be part of the future of work. Whether you're a freelancer looking for opportunities
                                or a business seeking talent, SolanaLance is your platform.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    size="lg"
                                    className="bg-gradient-solana"
                                    onClick={() => navigate("/auth")}
                                >
                                    Get Started Today
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => navigate("/discover")}
                                >
                                    Explore Opportunities
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default About;
