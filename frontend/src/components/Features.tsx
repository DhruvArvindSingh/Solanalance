import { Shield, Zap, TrendingUp, Lock, Coins, Users } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "20% Stake Protection",
    description: "Recruiters stake funds upfront, ensuring payment security for freelancers on every project.",
  },
  {
    icon: Zap,
    title: "Lightning-Fast Payments",
    description: "Built on Solana for instant, low-cost transactions. Get paid in seconds, not days.",
  },
  {
    icon: TrendingUp,
    title: "Tier-Based Trust System",
    description: "Gold, Silver, Bronze, and Iron ratings based on performance and completed projects.",
  },
  {
    icon: Lock,
    title: "Automated Escrow",
    description: "Smart contract-based escrow automatically releases payments upon milestone approval.",
  },
  {
    icon: Coins,
    title: "Milestone Payments",
    description: "Three-stage payment structure ensures fair compensation throughout the project lifecycle.",
  },
  {
    icon: Users,
    title: "Transparent Ratings",
    description: "Public reviews and blockchain-verified transaction history build genuine trust.",
  },
];

export const Features = () => {
  return (
    <section className="py-20 relative" id="how-it-works">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 fade-in">
          <h2 className="text-4xl font-bold mb-4">
            Why Choose <span className="text-gradient">SolanaLance</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Experience the future of freelancing with blockchain-powered security and transparency
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 fade-in">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group p-6 rounded-2xl glass border border-white/10 hover:border-primary/30 transition-all duration-300 hover-lift"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-solana flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-background" />
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-gradient transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
