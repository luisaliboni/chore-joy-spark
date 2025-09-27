import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addDays, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import PointCelebration from '@/components/PointCelebration';

interface Child {
  id: string;
  name: string;
  color: string;
  weekly_points: number;
  child_order: number;
}

interface TaskAssignment {
  id: string;
  task_id: string;
  is_completed: boolean;
  display_order: number;
  tasks: {
    title: string;
    icon: string;
    points: number;
  };
}

export default function Chores() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [children, setChildren] = useState<Child[]>([]);
  const [taskAssignments, setTaskAssignments] = useState<Record<string, TaskAssignment[]>>({});
  const [loading, setLoading] = useState(true);
  const [celebrationData, setCelebrationData] = useState<{
    show: boolean;
    points: number;
  }>({ show: false, points: 0 });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, currentDate]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch children
      const { data: childrenData } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.id)
        .order('child_order');

      if (childrenData) {
        setChildren(childrenData);

        // Fetch task assignments for current date
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const assignments: Record<string, TaskAssignment[]> = {};

        for (const child of childrenData) {
          const { data } = await supabase
            .from('task_assignments')
            .select(`
              id,
              task_id,
              is_completed,
              display_order,
              tasks (
                title,
                icon,
                points
              )
            `)
            .eq('user_id', user.id)
            .eq('child_id', child.id)
            .eq('assigned_date', dateStr)
            .order('display_order');

          assignments[child.id] = data || [];
        }

        setTaskAssignments(assignments);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = async (childId: string, assignmentId: string, points: number) => {
    try {
      // Show celebration animation
      setCelebrationData({ show: true, points });
      
      // Update task completion
      await supabase
        .from('task_assignments')
        .update({ 
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      // Update child's weekly points
      const child = children.find(c => c.id === childId);
      if (child) {
        await supabase
          .from('children')
          .update({ weekly_points: child.weekly_points + points })
          .eq('id', childId);
      }

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-child1/10 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate('prev')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold">
                Daily Chores - {format(currentDate, 'EEEE')}
              </h1>
              <p className="text-muted-foreground">
                {format(currentDate, 'MMMM dd, yyyy')}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate('next')}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => navigate('/points')} className="bg-gradient-primary">
              🏆 Points
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/manage-tasks')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Manage Tasks
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/settings')}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Children Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map((child) => (
            <div key={child.id} className="space-y-4">
              {/* Child Header */}
              <div 
                className="rounded-lg p-6 text-white"
                style={{
                  background: child.child_order === 1 
                    ? 'var(--gradient-child1)' 
                    : 'var(--gradient-child2)'
                }}
              >
                <h2 className="text-xl font-bold">{child.name}</h2>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm opacity-90">
                    {taskAssignments[child.id]?.filter(t => t.is_completed).length || 0}/
                    {taskAssignments[child.id]?.length || 0} completed
                  </span>
                  <span className="text-lg font-bold">
                    {child.weekly_points} pts this week
                  </span>
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-3">
                {taskAssignments[child.id]?.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                      assignment.is_completed
                        ? 'bg-success/10 border-success/20'
                        : 'bg-card hover:bg-accent/50'
                    }`}
                  >
                    <div className="text-2xl">
                      {assignment.tasks.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{assignment.tasks.title}</h3>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {assignment.tasks.points} pts
                    </div>
                    <Button
                      size="sm"
                      disabled={assignment.is_completed}
                      onClick={() => handleTaskComplete(
                        child.id, 
                        assignment.id, 
                        assignment.tasks.points
                      )}
                      className={assignment.is_completed ? 'bg-success' : ''}
                    >
                      {assignment.is_completed ? '✓ Done' : 'Complete'}
                    </Button>
                  </div>
                ))}
                
                {(!taskAssignments[child.id] || taskAssignments[child.id].length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No tasks assigned for today
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <PointCelebration
        points={celebrationData.points}
        show={celebrationData.show}
        onComplete={() => setCelebrationData({ show: false, points: 0 })}
      />
    </div>
  );
}