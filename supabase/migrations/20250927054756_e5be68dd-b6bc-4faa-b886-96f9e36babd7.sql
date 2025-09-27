-- Drop the old constraint that uses assigned_date
ALTER TABLE public.task_assignments DROP CONSTRAINT IF EXISTS task_assignments_task_id_child_id_assigned_date_key;

-- Ensure the new weekday-based constraint is in place
ALTER TABLE public.task_assignments DROP CONSTRAINT IF EXISTS task_assignments_weekday_unique;
ALTER TABLE public.task_assignments ADD CONSTRAINT task_assignments_weekday_unique 
UNIQUE (user_id, child_id, task_id, weekday);