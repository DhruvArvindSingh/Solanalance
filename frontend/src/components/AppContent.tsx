import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AuthLoading } from "./AuthLoading";
import { MessagingInitializer } from "./messaging/MessagingInitializer";
import { MessagingWidget } from "./messaging/MessagingWidget";
import { SolanaWalletContextProvider } from "../contexts/SolanaWalletContext";
import { Routes, Route } from "react-router-dom";
import Index from "../pages/Index";
import Auth from "../pages/Auth";
import NotFound from "../pages/NotFound";
import Discover from "../pages/Discover";
import HowItWorks from "../pages/HowItWorks";
import About from "../pages/About";
import CreateJob from "../pages/CreateJob";
import JobDetail from "../pages/JobDetail";
import RecruiterDashboard from "../pages/RecruiterDashboard";
import FreelancerDashboard from "../pages/FreelancerDashboard";
import JobApplicants from "../pages/JobApplicants";
import ProjectWorkspace from "../pages/ProjectWorkspace";
import UserProfile from "../pages/UserProfile";
import EditProfile from "../pages/EditProfile";
import TransactionHistory from "../pages/TransactionHistory";

export const AppContent = () => {
    return (
        <AuthProvider>
            <SolanaWalletContextProvider>
                <AppRoutes />
            </SolanaWalletContextProvider>
        </AuthProvider>
    );
};

// Separate component to use useAuth hook inside the providers
const AppRoutes = () => {
    const { loading } = useAuth();

    // Show loading screen while checking authentication
    if (loading) {
        return <AuthLoading />;
    }

    return (
        <>
            <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/about" element={<About />} />
                <Route path="/create-job" element={<CreateJob />} />
                <Route path="/jobs/create" element={<CreateJob />} />
                <Route path="/job/:id" element={<JobDetail />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/dashboard/recruiter" element={<RecruiterDashboard />} />
                <Route path="/dashboard/freelancer" element={<FreelancerDashboard />} />
                <Route path="/job/:id/applicants" element={<JobApplicants />} />
                <Route path="/jobs/:id/applicants" element={<JobApplicants />} />
                <Route path="/project/:id" element={<ProjectWorkspace />} />
                <Route path="/profile/:id" element={<UserProfile />} />
                <Route path="/profile/edit" element={<EditProfile />} />
                <Route path="/transactions" element={<TransactionHistory />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
            </Routes>
            <MessagingInitializer />
            <MessagingWidget />
        </>
    );
};
