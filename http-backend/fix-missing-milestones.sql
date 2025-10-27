-- Fix missing milestones for project 83c93daf-4110-41d1-aaae-8c29bb20b2cb
-- This script creates milestones from job stages for projects that don't have them

-- First, let's check the job stages for this job
-- Job ID: 32fa53ce-fffc-4a18-be32-780b8324f50e

-- Insert milestones based on job stages
INSERT INTO milestones (
    id,
    project_id,
    stage_id,
    stage_number,
    status,
    payment_amount,
    payment_released,
    submission_files,
    submission_links,
    created_at
)
SELECT 
    uuid_generate_v4() as id,
    '83c93daf-4110-41d1-aaae-8c29bb20b2cb' as project_id,
    js.id as stage_id,
    js.stage_number,
    'pending' as status,
    js.payment as payment_amount,
    false as payment_released,
    ARRAY[]::text[] as submission_files,
    ARRAY[]::text[] as submission_links,
    NOW() as created_at
FROM job_stages js
WHERE js.job_id = '32fa53ce-fffc-4a18-be32-780b8324f50e'
ORDER BY js.stage_number ASC;

-- Verify the milestones were created
SELECT 
    m.id,
    m.stage_number,
    m.status,
    m.payment_amount,
    js.name as stage_name
FROM milestones m
JOIN job_stages js ON m.stage_id = js.id
WHERE m.project_id = '83c93daf-4110-41d1-aaae-8c29bb20b2cb'
ORDER BY m.stage_number;
