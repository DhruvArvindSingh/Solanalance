import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, TrendingUp } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-hero">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary rounded-full blur-[120px] animate-pulse delay-1000"></div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center fade-in">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full glass mb-8 shine">
            <Zap className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium">Powered by Solana Blockchain</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            The Future of <br />
            <span className="text-gradient">Decentralized Freelancing</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-foreground/70 mb-12 max-w-2xl mx-auto">
            Secure milestone-based payments, transparent ratings, and automated escrow.
            Built on Solana for lightning-fast, low-cost transactions.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16">
            <Button size="lg" className="bg-gradient-solana hover:opacity-90 border-0 text-base px-8 h-14 w-full sm:w-auto">
              Start Freelancing
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="glass border-white/20 hover:bg-white/5 h-14 w-full sm:w-auto">
              Post a Job
            </Button>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full glass">
              <Shield className="w-5 h-5 text-success" />
              <span className="text-sm">20% Stake Protection</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full glass">
              <Zap className="w-5 h-5 text-warning" />
              <span className="text-sm">Instant Payments</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full glass">
              <TrendingUp className="w-5 h-5 text-secondary" />
              <span className="text-sm">Rating-Based Trust</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 rounded-full bg-white/40"></div>
        </div>
      </div>
    </section>
  );
};
