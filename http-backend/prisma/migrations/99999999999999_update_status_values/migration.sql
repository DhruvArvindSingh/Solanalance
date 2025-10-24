-- Step 1: Update all existing 'in_progress' values to 'active' in jobs table
UPDATE jobs 
SET status = 'active' 
WHERE status = 'in_progress';

-- Step 2: Update all existing 'in_progress' values to 'pending' in milestones table
UPDATE milestones 
SET status = 'pending' 
WHERE status = 'in_progress';

-- Step 3: Update all existing 'in_progress' values to 'active' in projects table
UPDATE projects 
SET status = 'active' 
WHERE status = 'in_progress';
