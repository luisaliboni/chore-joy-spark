-- Add weekday column to task_assignments table
ALTER TABLE public.task_assignments ADD COLUMN weekday INTEGER;

-- Update existing task_assignments to set weekday based on assigned_date
UPDATE public.task_assignments 
SET weekday = EXTRACT(DOW FROM assigned_date::date);

-- Make weekday column required after populating it
ALTER TABLE public.task_assignments ALTER COLUMN weekday SET NOT NULL;

-- Add index for better performance on weekday queries
CREATE INDEX idx_task_assignments_weekday ON public.task_assignments(user_id, child_id, weekday);

-- Update the unique constraint to use weekday instead of assigned_date
ALTER TABLE public.task_assignments DROP CONSTRAINT IF EXISTS task_assignments_unique;
ALTER TABLE public.task_assignments ADD CONSTRAINT task_assignments_weekday_unique 
UNIQUE (user_id, child_id, task_id, weekday);