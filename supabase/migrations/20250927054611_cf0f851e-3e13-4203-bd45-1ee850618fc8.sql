-- Add function to reset weekly task completions
CREATE OR REPLACE FUNCTION public.reset_weekly_task_completions(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Reset all task completions for the user
  UPDATE public.task_assignments 
  SET 
    is_completed = false,
    completed_at = null,
    updated_at = now()
  WHERE user_id = target_user_id;
END;
$function$;