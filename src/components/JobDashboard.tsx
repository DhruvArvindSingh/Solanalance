import { JobCard } from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";

const mockJobs = [
  {
    title: "Full-Stack Web3 Developer",
    company: "DeFi Protocol Inc",
    recruiterName: "Sarah Chen",
    recruiterTier: "gold" as const,
    description: "Looking for an experienced full-stack developer to build our DeFi platform. Must have expertise in React, Node.js, and Solana smart contracts.",
    skills: ["React", "TypeScript", "Solana", "Web3.js", "Node.js", "Rust"],
    totalPayment: 50,
    stages: [
      { name: "Stage 1: UI Design", payment: 15 },
      { name: "Stage 2: Smart Contracts", payment: 20 },
      { name: "Stage 3: Integration", payment: 15 },
    ],
    postedDate: "2 days ago",
    applicants: 24,
  },
  {
    title: "NFT Marketplace Designer",
    company: "ArtChain Studios",
    recruiterName: "Mike Torres",
    recruiterTier: "silver" as const,
    description: "We need a talented UI/UX designer to create stunning designs for our NFT marketplace. Experience with Web3 interfaces preferred.",
    skills: ["Figma", "UI/UX", "Web3 Design", "Prototyping"],
    totalPayment: 35,
    stages: [
      { name: "Stage 1: Wireframes", payment: 10 },
      { name: "Stage 2: High-Fi Designs", payment: 15 },
      { name: "Stage 3: Handoff", payment: 10 },
    ],
    postedDate: "5 days ago",
    applicants: 18,
  },
  {
    title: "Solana Smart Contract Auditor",
    company: "SecureChain Labs",
    recruiterName: "Alex Kumar",
    recruiterTier: "gold" as const,
    description: "Seeking a security expert to audit our Solana smart contracts. Must have proven experience in identifying vulnerabilities.",
    skills: ["Rust", "Solana", "Security", "Auditing"],
    totalPayment: 80,
    stages: [
      { name: "Stage 1: Initial Review", payment: 25 },
      { name: "Stage 2: Deep Audit", payment: 35 },
      { name: "Stage 3: Report", payment: 20 },
    ],
    postedDate: "1 day ago",
    applicants: 12,
  },
  {
    title: "Content Writer for Crypto Blog",
    company: "CryptoDaily",
    recruiterName: "Emma Wilson",
    recruiterTier: "bronze" as const,
    description: "Looking for a talented writer to create engaging content about blockchain technology, DeFi, and NFTs. 10 articles needed.",
    skills: ["Content Writing", "SEO", "Blockchain", "Research"],
    totalPayment: 15,
    stages: [
      { name: "Stage 1: 3 Articles", payment: 5 },
      { name: "Stage 2: 4 Articles", payment: 6 },
      { name: "Stage 3: 3 Articles", payment: 4 },
    ],
    postedDate: "1 week ago",
    applicants: 45,
  },
  {
    title: "Mobile App Developer (React Native)",
    company: "WalletPro",
    recruiterName: "James Lee",
    recruiterTier: "silver" as const,
    description: "Build a mobile wallet app with React Native. Integration with Solana blockchain required. iOS and Android support needed.",
    skills: ["React Native", "TypeScript", "Solana", "Mobile Development"],
    totalPayment: 60,
    stages: [
      { name: "Stage 1: Core Features", payment: 20 },
      { name: "Stage 2: Blockchain Integration", payment: 25 },
      { name: "Stage 3: Testing & Polish", payment: 15 },
    ],
    postedDate: "3 days ago",
    applicants: 31,
  },
  {
    title: "Smart Contract Developer (Rust)",
    company: "GameFi Studio",
    recruiterName: "Lisa Park",
    recruiterTier: "gold" as const,
    description: "Develop custom Solana programs for our gaming platform. Experience with on-chain gaming mechanics essential.",
    skills: ["Rust", "Solana", "Gaming", "Smart Contracts"],
    totalPayment: 70,
    stages: [
      { name: "Stage 1: Core Logic", payment: 25 },
      { name: "Stage 2: Game Mechanics", payment: 30 },
      { name: "Stage 3: Optimization", payment: 15 },
    ],
    postedDate: "4 days ago",
    applicants: 19,
  },
];

export const JobDashboard = () => {
  return (
    <section className="py-20 relative" id="jobs">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 fade-in">
          <h2 className="text-4xl font-bold mb-4">
            Discover <span className="text-gradient">Opportunities</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Find the perfect project and start earning in SOL
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 fade-in">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search jobs, skills, or companies..."
                className="pl-12 h-12 glass border-white/10 focus:border-primary/50"
              />
            </div>
            <Button variant="outline" className="glass border-white/10 h-12 px-6">
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Job Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 fade-in">
          {mockJobs.map((job, index) => (
            <JobCard key={index} {...job} />
          ))}
        </div>

        {/* Load More */}
        <div className="mt-12 text-center fade-in">
          <Button size="lg" variant="outline" className="glass border-white/20 hover:bg-white/5 px-8">
            Load More Jobs
          </Button>
        </div>
      </div>
    </section>
  );
};
