import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { SolanaWalletContextProvider } from "./contexts/SolanaWalletContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Discover from "./pages/Discover";
import HowItWorks from "./pages/HowItWorks";
import About from "./pages/About";
import CreateJob from "./pages/CreateJob";
import JobDetail from "./pages/JobDetail";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import FreelancerDashboard from "./pages/FreelancerDashboard";
import JobApplicants from "./pages/JobApplicants";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import UserProfile from "./pages/UserProfile";
import EditProfile from "./pages/EditProfile";
import TransactionHistory from "./pages/TransactionHistory";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SolanaWalletContextProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/about" element={<About />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/signup" element={<Auth />} />
              <Route path="/signin" element={<Auth />} />
              <Route path="/jobs/create" element={<CreateJob />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/jobs/:id/applicants" element={<JobApplicants />} />
              <Route path="/dashboard/recruiter" element={<RecruiterDashboard />} />
              <Route path="/dashboard/freelancer" element={<FreelancerDashboard />} />
              <Route path="/projects/:id" element={<ProjectWorkspace />} />
              <Route path="/profile/:id" element={<UserProfile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/transactions" element={<TransactionHistory />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SolanaWalletContextProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
