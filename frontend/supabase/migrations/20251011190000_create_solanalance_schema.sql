-- ============================================================================
-- SolanaLance Database Schema Migration
-- Created: 2025-10-11
-- Description: Complete database schema for decentralized freelancing platform
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types/enums
CREATE TYPE app_role AS ENUM ('recruiter', 'freelancer');
CREATE TYPE job_status AS ENUM ('draft', 'open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE experience_level AS ENUM ('beginner', 'intermediate', 'expert');
CREATE TYPE project_duration AS ENUM ('short_term', 'medium_term', 'long_term');
CREATE TYPE rating_tier AS ENUM ('gold', 'silver', 'bronze', 'iron');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    email text NOT NULL,
    avatar_url text,
    bio text,
    skills text[] DEFAULT '{}',
    hourly_rate decimal(10,2),
    company_name text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (id)
);

-- User roles table
CREATE TABLE public.user_roles (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Jobs table
CREATE TABLE public.jobs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    recruiter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL,
    skills text[] DEFAULT '{}',
    experience_level experience_level DEFAULT 'intermediate',
    project_duration project_duration DEFAULT 'medium_term',
    category text,
    total_payment decimal(10,2) NOT NULL,
    status job_status DEFAULT 'open',
    views_count integer DEFAULT 0,
    selected_freelancer_id uuid REFERENCES public.profiles(id),
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Job stages/milestones structure
CREATE TABLE public.job_stages (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    stage_number integer NOT NULL,
    payment decimal(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Applications table
CREATE TABLE public.applications (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
    freelancer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    cover_letter text,
    estimated_completion_days integer NOT NULL,
    portfolio_urls text[],
    status text DEFAULT 'pending', -- pending, shortlisted, selected, rejected
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Projects table (active contracts)
CREATE TABLE public.projects (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
    recruiter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    freelancer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text DEFAULT 'active', -- active, completed, cancelled, disputed
    current_stage integer DEFAULT 1,
    started_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Milestones table (project progress tracking)
CREATE TABLE public.milestones (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    stage_id uuid REFERENCES public.job_stages(id) ON DELETE CASCADE,
    stage_number integer NOT NULL,
    status text DEFAULT 'pending', -- pending, submitted, approved, rejected
    payment_amount decimal(10,2) NOT NULL,
    payment_released boolean DEFAULT false,
    submission_description text,
    submission_files text[],
    submission_links text[],
    submitted_at timestamp with time zone,
    reviewed_at timestamp with time zone,
    reviewer_comments text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- BLOCKCHAIN & PAYMENTS
-- ============================================================================

-- Staking table (SOL staked by recruiters)
CREATE TABLE public.staking (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    recruiter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_address text NOT NULL,
    total_staked decimal(18,9) NOT NULL, -- SOL amount with precision
    total_released decimal(18,9) DEFAULT 0,
    transaction_signature text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Transactions table (all blockchain transactions)
CREATE TABLE public.transactions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    from_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_user_id uuid REFERENCES public.profiles(id),
    project_id uuid REFERENCES public.projects(id),
    milestone_id uuid REFERENCES public.milestones(id),
    type text NOT NULL, -- stake, payment, refund
    amount decimal(18,9) NOT NULL,
    wallet_from text NOT NULL,
    wallet_to text,
    wallet_signature text NOT NULL,
    status text DEFAULT 'pending', -- pending, confirmed, failed
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User wallet addresses
CREATE TABLE public.user_wallets (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_address text NOT NULL,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(wallet_address)
);

-- ============================================================================
-- RATINGS & TRUST SYSTEM
-- ============================================================================

-- Ratings table
CREATE TABLE public.ratings (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    rater_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    ratee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    overall_rating integer NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    quality_rating integer NOT NULL CHECK (quality_rating >= 1 AND quality_rating <= 5),
    communication_rating integer NOT NULL CHECK (communication_rating >= 1 AND communication_rating <= 5),
    professionalism_rating integer NOT NULL CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    review_text text,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trust points system
CREATE TABLE public.trust_points (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_points integer DEFAULT 0,
    completed_projects integer DEFAULT 0,
    successful_projects integer DEFAULT 0,
    average_rating decimal(3,2),
    tier rating_tier DEFAULT 'iron',
    last_calculated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- COMMUNICATION & NOTIFICATIONS
-- ============================================================================

-- Messages table (project communication)
CREATE TABLE public.messages (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    message_type text DEFAULT 'text', -- text, file, system
    file_url text,
    file_name text,
    file_size integer,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Notifications table
CREATE TABLE public.notifications (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL, -- job_application, milestone_submission, payment_released, etc.
    related_id uuid, -- ID of related object (job, project, etc.)
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own role" ON public.user_roles FOR UPDATE USING (auth.uid() = user_id);

-- Jobs policies
CREATE POLICY "Anyone can view open jobs" ON public.jobs FOR SELECT USING (status = 'open' OR auth.uid() = recruiter_id);
CREATE POLICY "Recruiters can insert jobs" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = recruiter_id);
CREATE POLICY "Recruiters can update own jobs" ON public.jobs FOR UPDATE USING (auth.uid() = recruiter_id);

-- Job stages policies
CREATE POLICY "Anyone can view job stages" ON public.job_stages FOR SELECT USING (true);
CREATE POLICY "Job owners can manage stages" ON public.job_stages FOR INSERT WITH CHECK (
    auth.uid() = (SELECT recruiter_id FROM public.jobs WHERE id = job_id)
);
CREATE POLICY "Job owners can update stages" ON public.job_stages FOR UPDATE USING (
    auth.uid() = (SELECT recruiter_id FROM public.jobs WHERE id = job_id)
);

-- Applications policies
CREATE POLICY "Users can view applications they're involved in" ON public.applications FOR SELECT USING (
    auth.uid() = freelancer_id OR 
    auth.uid() = (SELECT recruiter_id FROM public.jobs WHERE id = job_id)
);
CREATE POLICY "Freelancers can insert applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = freelancer_id);
CREATE POLICY "Users can update applications they're involved in" ON public.applications FOR UPDATE USING (
    auth.uid() = freelancer_id OR 
    auth.uid() = (SELECT recruiter_id FROM public.jobs WHERE id = job_id)
);

-- Projects policies
CREATE POLICY "Project members can view projects" ON public.projects FOR SELECT USING (
    auth.uid() = recruiter_id OR auth.uid() = freelancer_id
);
CREATE POLICY "Recruiters can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = recruiter_id);
CREATE POLICY "Project members can update projects" ON public.projects FOR UPDATE USING (
    auth.uid() = recruiter_id OR auth.uid() = freelancer_id
);

-- Milestones policies
CREATE POLICY "Project members can view milestones" ON public.milestones FOR SELECT USING (
    auth.uid() = (SELECT recruiter_id FROM public.projects WHERE id = project_id) OR
    auth.uid() = (SELECT freelancer_id FROM public.projects WHERE id = project_id)
);
CREATE POLICY "Project members can manage milestones" ON public.milestones FOR INSERT WITH CHECK (
    auth.uid() = (SELECT recruiter_id FROM public.projects WHERE id = project_id) OR
    auth.uid() = (SELECT freelancer_id FROM public.projects WHERE id = project_id)
);
CREATE POLICY "Project members can update milestones" ON public.milestones FOR UPDATE USING (
    auth.uid() = (SELECT recruiter_id FROM public.projects WHERE id = project_id) OR
    auth.uid() = (SELECT freelancer_id FROM public.projects WHERE id = project_id)
);

-- Staking policies
CREATE POLICY "Users can view own staking" ON public.staking FOR SELECT USING (auth.uid() = recruiter_id);
CREATE POLICY "Recruiters can create stakes" ON public.staking FOR INSERT WITH CHECK (auth.uid() = recruiter_id);
CREATE POLICY "Recruiters can update own stakes" ON public.staking FOR UPDATE USING (auth.uid() = recruiter_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (
    auth.uid() = from_user_id OR auth.uid() = to_user_id
);
CREATE POLICY "Users can create transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- User wallets policies
CREATE POLICY "Users can view own wallets" ON public.user_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own wallets" ON public.user_wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wallets" ON public.user_wallets FOR UPDATE USING (auth.uid() = user_id);

-- Ratings policies
CREATE POLICY "Users can view public ratings" ON public.ratings FOR SELECT USING (is_public = true OR auth.uid() = rater_id OR auth.uid() = ratee_id);
CREATE POLICY "Users can create ratings" ON public.ratings FOR INSERT WITH CHECK (auth.uid() = rater_id);
CREATE POLICY "Users can update own ratings" ON public.ratings FOR UPDATE USING (auth.uid() = rater_id);

-- Trust points policies
CREATE POLICY "Anyone can view trust points" ON public.trust_points FOR SELECT USING (true);
CREATE POLICY "System can manage trust points" ON public.trust_points FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update trust points" ON public.trust_points FOR UPDATE USING (true);

-- Messages policies
CREATE POLICY "Project members can view messages" ON public.messages FOR SELECT USING (
    auth.uid() = sender_id OR
    auth.uid() = (SELECT recruiter_id FROM public.projects WHERE id = project_id) OR
    auth.uid() = (SELECT freelancer_id FROM public.projects WHERE id = project_id)
);
CREATE POLICY "Project members can send messages" ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
        auth.uid() = (SELECT recruiter_id FROM public.projects WHERE id = project_id) OR
        auth.uid() = (SELECT freelancer_id FROM public.projects WHERE id = project_id)
    )
);
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to handle user registration
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  
  INSERT INTO public.trust_points (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_staking_updated_at BEFORE UPDATE ON public.staking FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON public.ratings FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_user_wallets_updated_at BEFORE UPDATE ON public.user_wallets FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(
  _role text,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role::app_role
  );
END;
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.user_roles 
  WHERE user_id = _user_id
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

-- Function to increment job views
CREATE OR REPLACE FUNCTION public.increment_job_views(job_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.jobs 
  SET views_count = views_count + 1 
  WHERE id = job_uuid;
END;
$$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User roles indexes
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Jobs indexes
CREATE INDEX idx_jobs_recruiter_id ON public.jobs(recruiter_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX idx_jobs_skills ON public.jobs USING GIN(skills);

-- Applications indexes
CREATE INDEX idx_applications_job_id ON public.applications(job_id);
CREATE INDEX idx_applications_freelancer_id ON public.applications(freelancer_id);
CREATE INDEX idx_applications_status ON public.applications(status);

-- Projects indexes
CREATE INDEX idx_projects_recruiter_id ON public.projects(recruiter_id);
CREATE INDEX idx_projects_freelancer_id ON public.projects(freelancer_id);
CREATE INDEX idx_projects_status ON public.projects(status);

-- Transactions indexes
CREATE INDEX idx_transactions_from_user ON public.transactions(from_user_id);
CREATE INDEX idx_transactions_to_user ON public.transactions(to_user_id);
CREATE INDEX idx_transactions_project ON public.transactions(project_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);

-- Ratings indexes
CREATE INDEX idx_ratings_ratee_id ON public.ratings(ratee_id);
CREATE INDEX idx_ratings_rater_id ON public.ratings(rater_id);
CREATE INDEX idx_ratings_project_id ON public.ratings(project_id);

-- Messages indexes
CREATE INDEX idx_messages_project_id ON public.messages(project_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for job listings with recruiter info
CREATE OR REPLACE VIEW public.job_listings AS
SELECT 
  j.id,
  j.title,
  j.description,
  j.skills,
  j.experience_level,
  j.project_duration,
  j.total_payment,
  j.status,
  j.views_count,
  j.created_at,
  p.full_name as recruiter_name,
  p.company_name,
  p.avatar_url as recruiter_avatar,
  COALESCE(tp.tier, 'iron'::public.rating_tier) as recruiter_tier,
  (SELECT COUNT(*) FROM public.applications WHERE applications.job_id = j.id) as applicants_count
FROM public.jobs j
LEFT JOIN public.profiles p ON p.id = j.recruiter_id
LEFT JOIN public.trust_points tp ON tp.user_id = j.recruiter_id
WHERE j.status = 'open';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to authenticated users
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.jobs TO authenticated;
GRANT ALL ON public.job_stages TO authenticated;
GRANT ALL ON public.applications TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.milestones TO authenticated;
GRANT ALL ON public.staking TO authenticated;
GRANT ALL ON public.transactions TO authenticated;

GRANT ALL ON public.user_wallets TO authenticated;
GRANT ALL ON public.ratings TO authenticated;
GRANT ALL ON public.trust_points TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.notifications TO authenticated;

-- Grant access to functions
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_job_views TO authenticated;

-- Grant access to sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant access to views
GRANT SELECT ON public.job_listings TO authenticated;
