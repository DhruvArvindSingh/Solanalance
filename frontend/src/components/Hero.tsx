import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export const Hero = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  const handleFreelancerClick = () => {
    if (!user) {
      navigate("/auth");
    } else {
      navigate("/dashboard/freelancer");
    }
  };

  const handleRecruiterClick = () => {
    if (!user) {
      navigate("/auth");
    } else {
      navigate("/dashboard/recruiter");
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Modern Grid Background */}
      <div className="absolute inset-0 grid-pattern"></div>

      {/* Subtle Accent Elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
      <div className="absolute top-40 left-0 w-px h-96 bg-gradient-to-b from-transparent via-primary/20 to-transparent"></div>
      <div className="absolute top-40 right-0 w-px h-96 bg-gradient-to-b from-transparent via-secondary/20 to-transparent"></div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center fade-in">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-md bg-primary/10 border border-primary/20 mb-8">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">POWERED BY SOLANA BLOCKCHAIN</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight">
            The Future of <br />
            <span className="text-primary">Decentralized Freelancing</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Secure milestone-based payments, transparent ratings, and automated escrow.
            Built on Solana for lightning-fast, low-cost transactions.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16">
            {/* Show both buttons if user is not signed in */}
            {!user && (
              <>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-base px-8 h-14 w-full sm:w-auto font-semibold accent-glow"
                  onClick={handleFreelancerClick}
                >
                  Start Freelancing
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-border hover:bg-muted h-14 w-full sm:w-auto font-semibold"
                  onClick={handleRecruiterClick}
                >
                  Post a Job
                </Button>
              </>
            )}

            {/* Show role-specific button if user is signed in */}
            {user && userRole === 'freelancer' && (
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-base px-8 h-14 w-full sm:w-auto font-semibold accent-glow"
                onClick={handleFreelancerClick}
              >
                Start Freelancing
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            )}

            {user && userRole === 'recruiter' && (
              <Button
                size="lg"
                variant="outline"
                className="border-border hover:bg-muted h-14 w-full sm:w-auto font-semibold"
                onClick={handleRecruiterClick}
              >
                Post a Job
              </Button>
            )}
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center space-x-2 px-4 py-2.5 rounded-md bg-card border border-border hover:border-primary/30 transition-colors">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">100% Stake Protection</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2.5 rounded-md bg-card border border-border hover:border-primary/30 transition-colors">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Instant Payments</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2.5 rounded-md bg-card border border-border hover:border-primary/30 transition-colors">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Rating-Based Trust</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 rounded-full bg-primary"></div>
        </div>
      </div>
    </section>
  );
};
