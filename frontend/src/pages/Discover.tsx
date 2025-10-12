import { Navbar } from "@/components/Navbar";
import { JobDashboard } from "@/components/JobDashboard";

const Discover = () => {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            {/* Header */}
            <div className="pt-24 pb-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center fade-in">
                        <h1 className="text-5xl font-bold mb-4">
                            Discover <span className="text-gradient">Opportunities</span>
                        </h1>
                        <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
                            Find the perfect project and start earning in SOL. Browse through thousands of opportunities from top companies worldwide.
                        </p>
                    </div>
                </div>
            </div>

            {/* Job Dashboard */}
            <div className="pb-16">
                <JobDashboard showHeader={false} />
            </div>
        </div>
    );
};

export default Discover;
