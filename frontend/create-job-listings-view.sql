-- Create the job_listings view (run this in Supabase SQL Editor if needed)

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
