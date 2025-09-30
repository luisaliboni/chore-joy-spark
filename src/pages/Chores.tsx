import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Settings, Plus, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addDays, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import PointCelebration from '@/components/PointCelebration';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

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

function SortableTaskAssignment({ assignment, child, onComplete, onUndo }: {
  assignment: TaskAssignment;
  child: Child;
  onComplete: (childId: string, assignmentId: string, points: number) => void;
  onUndo: (childId: string, assignmentId: string, points: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: assignment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mobile-drag-item flex items-center gap-responsive p-responsive rounded-lg border transition-all ${
        assignment.is_completed
          ? 'bg-success/10 border-success/20'
          : 'bg-card hover:bg-accent/50'
      }`}
    >
      <div {...attributes} {...listeners} className="drag-handle">
        <GripVertical className="h-6 w-6 tablet:h-7 tablet:w-7 text-muted-foreground" />
      </div>
      <div className="text-2xl tablet:text-3xl desktop:text-4xl">
        {assignment.tasks.icon.startsWith('http') ? (
          <img src={assignment.tasks.icon} alt="Task icon" className="icon-responsive object-cover rounded" />
        ) : (
          assignment.tasks.icon
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`font-medium text-responsive-sm ${assignment.is_completed ? 'line-through text-muted-foreground' : ''}`}>
          {assignment.tasks.title}
        </h3>
      </div>
      <div className="text-responsive-xs text-muted-foreground whitespace-nowrap">
        {assignment.tasks.points} pts
      </div>
      {assignment.is_completed ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUndo(child.id, assignment.id, assignment.tasks.points)}
          className="bg-success/20 hover:bg-success/30"
        >
          ↩️ Undo
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => onComplete(child.id, assignment.id, assignment.tasks.points)}
        >
          Complete
        </Button>
      )}
    </div>
  );
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

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        // Check if a new week has started for any child
        const { isNewWeek, resetWeeklyData } = await import('@/lib/weekUtils');
        const needsReset = childrenData.some(child => isNewWeek(child.week_start_date));
        
        if (needsReset) {
          const success = await resetWeeklyData(user.id, false);
          if (success) {
            // Re-fetch children data after reset
            const { data: updatedChildrenData } = await supabase
              .from('children')
              .select('*')
              .eq('user_id', user.id)
              .order('child_order');
            
            if (updatedChildrenData) {
              setChildren(updatedChildrenData);
              toast.success('New week detected! Points and tasks have been reset.');
            }
          }
        } else {
          setChildren(childrenData);
        }

        // Fetch task assignments for current weekday
        const currentWeekday = currentDate.getDay();
        const assignments: Record<string, TaskAssignment[]> = {};

        for (const child of childrenData) {
          // Fetch assignments for the current weekday
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
            .eq('weekday', currentWeekday)
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

  const handleTaskUndo = async (childId: string, assignmentId: string, points: number) => {
    try {
      // Update task to uncompleted
      await supabase
        .from('task_assignments')
        .update({ 
          is_completed: false,
          completed_at: null
        })
        .eq('id', assignmentId);

      // Remove points from child's weekly total
      const child = children.find(c => c.id === childId);
      if (child) {
        await supabase
          .from('children')
          .update({ weekly_points: Math.max(0, child.weekly_points - points) })
          .eq('id', childId);
      }

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error undoing task:', error);
    }
  };

  const handleTaskDragEnd = async (event: any, childId: string) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const childTasks = taskAssignments[childId] || [];
    const oldIndex = childTasks.findIndex(item => item.id === active.id);
    const newIndex = childTasks.findIndex(item => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(childTasks, oldIndex, newIndex);
    
    // Update display_order in database
    try {
      const updates = newOrder.map((assignment, index) => ({
        id: assignment.id,
        display_order: index
      }));

      for (const update of updates) {
        await supabase
          .from('task_assignments')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error updating task order:', error);
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
        <div className="flex flex-col tablet:flex-row items-center justify-between mb-6 tablet:mb-8 gap-4">
          <div className="flex items-center gap-2 tablet:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate('prev')}
              className="touch-target"
            >
              <ChevronLeft className="icon-responsive-sm" />
            </Button>
            
            <div className="text-center">
              <h1 className="text-responsive-xl font-bold">
                Daily Chores - {format(currentDate, 'EEEE')}
              </h1>
              <p className="text-responsive-sm text-muted-foreground">
                {format(currentDate, 'MMMM dd, yyyy')}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate('next')}
              className="touch-target"
            >
              <ChevronRight className="icon-responsive-sm" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 justify-center tablet:justify-end">
            <Button onClick={() => navigate('/points')} className="bg-gradient-primary text-responsive-sm">
              🏆 <span className="hidden tablet:inline">Points</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/manage-tasks')}
              className="text-responsive-sm"
            >
              <Plus className="icon-responsive-sm mr-1 tablet:mr-2" />
              <span className="hidden tablet:inline">Manage </span>Tasks
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/settings')}
              className="touch-target"
            >
              <Settings className="icon-responsive-sm" />
            </Button>
          </div>
        </div>

        {/* Children Columns */}
        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4 tablet:gap-6">
          {children.map((child) => (
            <div key={child.id} className="space-y-4">
              {/* Child Header */}
              <div 
                className="rounded-lg p-responsive text-white"
                style={{
                  background: child.child_order === 1 
                    ? 'var(--gradient-child1)' 
                    : 'var(--gradient-child2)'
                }}
              >
                <h2 className="text-responsive-lg font-bold">{child.name}</h2>
                <div className="flex flex-col tablet:flex-row tablet:items-center justify-between mt-2 gap-2">
                  <span className="text-responsive-sm opacity-90">
                    {taskAssignments[child.id]?.filter(t => t.is_completed).length || 0}/
                    {taskAssignments[child.id]?.length || 0} completed
                  </span>
                  <span className="text-responsive-base font-bold">
                    {child.weekly_points} pts this week
                  </span>
                </div>
              </div>

              {/* Tasks */}
              <div className="mobile-drag-container space-y-3">
                {(!taskAssignments[child.id] || taskAssignments[child.id].length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tasks assigned for today
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleTaskDragEnd(event, child.id)}
                    modifiers={[restrictToVerticalAxis]}
                  >
                    <SortableContext items={taskAssignments[child.id].map(a => a.id)} strategy={verticalListSortingStrategy}>
                      {taskAssignments[child.id].map((assignment) => (
                        <SortableTaskAssignment
                          key={assignment.id}
                          assignment={assignment}
                          child={child}
                          onComplete={handleTaskComplete}
                          onUndo={handleTaskUndo}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
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