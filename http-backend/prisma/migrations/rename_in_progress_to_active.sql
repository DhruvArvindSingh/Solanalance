-- Migration: Rename 'in_progress' to 'active' in job_status enum
-- This migration updates the job_status enum and all existing data

-- Step 1: Add the new 'active' value to the enum
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'active';

-- Step 2: Update all existing 'in_progress' values to 'active' in jobs table
UPDATE jobs 
SET status = 'active' 
WHERE status = 'in_progress';

-- Step 3: Update all existing 'in_progress' values to 'pending' in milestones table
-- (Milestones should use 'pending' status, not 'in_progress')
UPDATE milestones 
SET status = 'pending' 
WHERE status = 'in_progress';

-- Note: PostgreSQL doesn't support removing enum values directly
-- The 'in_progress' value will remain in the enum but won't be used
-- To fully remove it, you would need to recreate the enum, which is more complex
-- and requires dropping all dependent columns first

-- Verify the changes
SELECT DISTINCT status FROM jobs;
SELECT DISTINCT status FROM milestones;
