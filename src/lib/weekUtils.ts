import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const resetWeeklyData = async (userId: string, showToast: boolean = true) => {
  try {
    // Reset both weekly points and task completions
    await Promise.all([
      supabase.rpc('reset_weekly_points', { target_user_id: userId }),
      supabase.rpc('reset_weekly_task_completions', { target_user_id: userId })
    ]);
    
    if (showToast) {
      toast.success('Weekly points and task completions reset successfully!');
    }
    
    return true;
  } catch (error) {
    console.error('Error resetting weekly data:', error);
    if (showToast) {
      toast.error('Failed to reset weekly data');
    }
    return false;
  }
};

export const isNewWeek = (weekStartDate: string | null): boolean => {
  if (!weekStartDate) return true;
  
  const currentWeekStart = new Date();
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
  currentWeekStart.setHours(0, 0, 0, 0);
  
  const storedWeekStart = new Date(weekStartDate);
  storedWeekStart.setHours(0, 0, 0, 0);
  
  return currentWeekStart.getTime() > storedWeekStart.getTime();
};