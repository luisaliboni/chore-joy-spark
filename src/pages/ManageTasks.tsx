import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Edit, Trash2, GripVertical, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconSelector } from '@/components/IconSelector';

interface Task {
  id: string;
  title: string;
  icon: string;
  points: number;
  display_order: number;
}

interface Child {
  id: string;
  name: string;
  color: string;
  child_order: number;
}

interface TaskFormData {
  title: string;
  icon: string;
  points: number;
  assignTo: string[];
  days: string[];
}


const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' }
];

function SortableTaskItem({ task, onEdit, onDelete }: { 
  task: Task; 
  onEdit: (task: Task) => void; 
  onDelete: (id: string) => void; 
}) {
  return (
    <div className="flex items-center gap-responsive p-responsive border rounded-lg bg-card">
      {task.icon && (
        <div className="text-xl tablet:text-2xl desktop:text-3xl">
          {task.icon.startsWith('http') ? (
            <img src={task.icon} alt="Task icon" className="icon-responsive object-cover rounded" />
          ) : (
            task.icon
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-responsive-sm">{task.title}</h3>
        <p className="text-responsive-xs text-muted-foreground">{task.points} points</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(task)} className="touch-target">
          <Edit className="icon-responsive-sm" />
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onDelete(task.id)} className="touch-target">
          <Trash2 className="icon-responsive-sm" />
        </Button>
      </div>
    </div>
  );
}

function SortableAssignmentItem({ assignment }: { assignment: any }) {
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
      className="flex items-center justify-between p-3 border rounded-lg"
    >
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-3 -m-3 min-w-[48px] min-h-[48px] tablet:min-w-[56px] tablet:min-h-[56px] flex items-center justify-center touch-target">
          <GripVertical className="h-6 w-6 tablet:h-7 tablet:w-7 text-muted-foreground" />
        </div>
        {assignment.tasks.icon && (
          <div className="text-xl">
            {assignment.tasks.icon.startsWith('http') ? (
              <img src={assignment.tasks.icon} alt="Task icon" className="w-6 h-6 object-cover rounded" />
            ) : (
              assignment.tasks.icon
            )}
          </div>
        )}
        <div>
          <div className={`font-medium ${assignment.is_completed ? 'line-through text-muted-foreground' : ''}`}>
            {assignment.tasks.title}
          </div>
          <div className="text-sm text-muted-foreground">
            {DAYS_OF_WEEK.find(d => (DAYS_OF_WEEK.findIndex(day => day.id === d.id) + 1) % 7 === assignment.weekday)?.label} • {assignment.tasks.points} pts
          </div>
        </div>
      </div>
      <div className="text-sm">
        {assignment.is_completed ? (
          <span className="text-success">✅ Completed</span>
        ) : (
          <span className="text-muted-foreground">⏳ Pending</span>
        )}
      </div>
    </div>
  );
}

export default function ManageTasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayNames[today.getDay()];
  });
  const [taskAssignments, setTaskAssignments] = useState<Record<string, any[]>>({});
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    icon: '🦷',
    points: 1,
    assignTo: [],
    days: []
  });

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 8,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 100,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAssignmentDragEnd = async (event: any, childId: string) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const childAssignments = taskAssignments[childId] || [];
    const dayIndex = DAYS_OF_WEEK.findIndex(d => d.id === selectedDay);
    const targetWeekday = (dayIndex + 1) % 7; // Convert to JS day format (0 = Sunday)
    
    const filteredAssignments = childAssignments.filter(assignment => 
      assignment.weekday === targetWeekday
    );

    const oldIndex = filteredAssignments.findIndex(item => item.id === active.id);
    const newIndex = filteredAssignments.findIndex(item => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(filteredAssignments, oldIndex, newIndex);
    
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
      toast.success('Task order updated!');
    } catch (error) {
      console.error('Error updating task order:', error);
      toast.error('Failed to update task order');
    }
  };


  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order');

      // Fetch children
      const { data: childrenData } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.id)
        .order('child_order');

      // Fetch task assignments for all days if needed
      const assignments: Record<string, any[]> = {};
      if (childrenData) {
        for (const child of childrenData) {
          const { data } = await supabase
            .from('task_assignments')
            .select(`
              id,
              task_id,
              assigned_date,
              weekday,
              is_completed,
              display_order,
              tasks (
                title,
                icon,
                points,
                display_order
              )
            `)
            .eq('user_id', user.id)
            .eq('child_id', child.id)
            .order('weekday', { ascending: true });

          // Sort task assignments by their display_order to match the Chores screen ordering
          const sortedData = (data || []).sort((a, b) => {
            return (a.display_order ?? 0) - (b.display_order ?? 0);
          });
          assignments[child.id] = sortedData;
        }
      }

      setTasks(tasksData || []);
      setChildren(childrenData || []);
      setTaskAssignments(assignments);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !formData.title.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      let task;
      
      if (editingTask) {
        // Update existing task
        const { data } = await supabase
          .from('tasks')
          .update({
            title: formData.title.trim(),
            icon: formData.icon,
            points: formData.points
          })
          .eq('id', editingTask.id)
          .select()
          .single();
        
        task = data;

        // Delete existing assignments for this task
        await supabase
          .from('task_assignments')
          .delete()
          .eq('task_id', editingTask.id);
      } else {
        // Create new task
        const { data } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title: formData.title.trim(),
            icon: formData.icon,
            points: formData.points,
            display_order: tasks.length
          })
          .select()
          .single();
        
        task = data;
      }

      if (task && formData.assignTo.length > 0 && formData.days.length > 0) {
        // Create task assignments for selected children and days (weekday-based)
        const assignments = [];
        
        for (const childId of formData.assignTo) {
          for (const day of formData.days) {
            const dayIndex = DAYS_OF_WEEK.findIndex(d => d.id === day);
            const weekday = (dayIndex + 1) % 7; // Convert to JS day format (0 = Sunday)
            
            assignments.push({
              user_id: user.id,
              task_id: task.id,
              child_id: childId,
              assigned_date: new Date().toISOString().split('T')[0], // Keep for compatibility
              weekday: weekday,
              display_order: task.display_order // Use the task's display_order
            });
          }
        }

        if (assignments.length > 0) {
          await supabase
            .from('task_assignments')
            .insert(assignments);
        }
      }

      toast.success(editingTask ? 'Task updated!' : 'Task created!');
      setIsDialogOpen(false);
      setEditingTask(null);
      setFormData({ title: '', icon: '🦷', points: 1, assignTo: [], days: [] });
      fetchData();
    } catch (error: any) {
      console.error('Error saving task:', error);
      if (error.code === '23505') {
        toast.error('A task with this assignment already exists for this day');
      } else {
        toast.error('Failed to save task');
      }
    }
  };

  const handleEdit = async (task: Task) => {
    setEditingTask(task);
    
    // Get current assignments for this task
    const currentAssignments = Object.values(taskAssignments).flat().filter(
      assignment => assignment.task_id === task.id
    );
    
    const assignedChildren = [...new Set(currentAssignments.map(a => a.child_id))];
    const assignedWeekdays = [...new Set(currentAssignments.map(a => a.weekday))];
    const assignedDays = assignedWeekdays.map(weekday => {
      const dayIndex = weekday === 0 ? 6 : weekday - 1; // Convert from JS day format back to our format
      return DAYS_OF_WEEK[dayIndex]?.id;
    }).filter(Boolean);

    setFormData({
      title: task.title,
      icon: task.icon,
      points: task.points,
      assignTo: assignedChildren,
      days: assignedDays
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (taskId: string) => {
    try {
      // First get the task data before deleting
      const { data: taskToDelete } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (!taskToDelete) {
        toast.error('Task not found');
        return;
      }

      // Get task assignments before deleting
      const { data: assignmentsToDelete } = await supabase
        .from('task_assignments')
        .select('*')
        .eq('task_id', taskId);

      // Delete the task (this will cascade delete assignments due to foreign key)
      await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      // Show undo toast
      toast.success('Task deleted!', {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              // Restore the task
              const { data: restoredTask } = await supabase
                .from('tasks')
                .insert({
                  id: taskToDelete.id,
                  user_id: taskToDelete.user_id,
                  title: taskToDelete.title,
                  icon: taskToDelete.icon,
                  points: taskToDelete.points,
                  display_order: taskToDelete.display_order
                })
                .select()
                .single();

              // Restore assignments if any existed
              if (assignmentsToDelete && assignmentsToDelete.length > 0) {
                await supabase
                  .from('task_assignments')
                  .insert(assignmentsToDelete);
              }

              toast.success('Task restored!');
              fetchData();
            } catch (error) {
              console.error('Error restoring task:', error);
              toast.error('Failed to restore task');
            }
          }
        },
        duration: 10000 // 10 seconds to undo
      });
      
      fetchData();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex(task => task.id === active.id);
      const newIndex = tasks.findIndex(task => task.id === over.id);
      
      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      setTasks(newTasks);

      // Update display_order in database
      try {
        const updates = newTasks.map((task, index) => ({
          id: task.id,
          display_order: index
        }));

        for (const update of updates) {
          await supabase
            .from('tasks')
            .update({ display_order: update.display_order })
            .eq('id', update.id);
        }
      } catch (error) {
        console.error('Error updating task order:', error);
        toast.error('Failed to update task order');
        fetchData(); // Revert on error
      }
    }
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col tablet:flex-row items-center justify-between mb-6 tablet:mb-8 gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-responsive-sm"
          >
            <ArrowLeft className="icon-responsive-sm" />
            Back to Chores
          </Button>
          
          <h1 className="text-responsive-xl font-bold">Manage Tasks</h1>
          
          <div className="flex flex-wrap gap-2 justify-center tablet:justify-end">
            <Button onClick={() => navigate('/manage-routines')} variant="outline" className="text-responsive-sm">
              📋 <span className="hidden tablet:inline">Routines</span>
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 text-responsive-sm">
                  <Plus className="icon-responsive-sm" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-responsive-base">{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 tablet:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="title" className="text-sm">Task Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Brush teeth"
                        required
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="points" className="text-sm">Points</Label>
                      <Input
                        id="points"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.points}
                        onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
                        required
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Task Icon</Label>
                  <IconSelector
                    selectedIcon={formData.icon}
                    onIconSelect={(icon) => setFormData(prev => ({ ...prev, icon: typeof icon === 'string' ? icon : icon[0] || '' }))}
                    compact={true}
                    allowNoIcon={true}
                  />
                  </div>

                  {children.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-sm">Assign to Children</Label>
                      <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-md">
                        {children.map((child) => (
                          <label
                            key={child.id}
                            className="flex items-center space-x-1.5 text-sm cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.assignTo.includes(child.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({ ...prev, assignTo: [...prev.assignTo, child.id] }));
                                } else {
                                  setFormData(prev => ({ ...prev, assignTo: prev.assignTo.filter(id => id !== child.id) }));
                                }
                              }}
                              className="rounded"
                            />
                            <span>{child.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-sm">Assign to Days</Label>
                    <div className="grid grid-cols-2 tablet:grid-cols-4 gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <label
                          key={day.id}
                          className="flex items-center space-x-1.5 text-sm cursor-pointer p-2 border rounded hover:bg-accent"
                        >
                          <input
                            type="checkbox"
                            checked={formData.days.includes(day.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({ ...prev, days: [...prev.days, day.id] }));
                              } else {
                                setFormData(prev => ({ ...prev, days: prev.days.filter(d => d !== day.id) }));
                              }
                            }}
                            className="rounded"
                          />
                          <span>{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingTask(null);
                        setFormData({ title: '', icon: '🦷', points: 1, assignTo: [], days: [] });
                      }}
                      className="h-9"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="h-9">
                      {editingTask ? 'Update Task' : 'Create Task'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tasks List */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tasks ({tasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tasks created yet. Add your first task above!
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <SortableTaskItem
                    key={task.id}
                    task={task}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Day Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <Button
                  key={day.id}
                  variant={selectedDay === day.id ? 'default' : 'outline'}
                  onClick={() => setSelectedDay(day.id)}
                  size="sm"
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Task Assignments by Child */}
        {children.map((child) => {
          const childAssignments = taskAssignments[child.id] || [];
          const dayIndex = DAYS_OF_WEEK.findIndex(d => d.id === selectedDay);
          const targetWeekday = (dayIndex + 1) % 7; // Convert to JS day format (0 = Sunday)
          
          const filteredAssignments = childAssignments.filter(assignment => 
            assignment.weekday === targetWeekday
          );

          return (
            <Card key={child.id} className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: child.color }}
                  />
                  {child.name}'s Assigned Tasks - {DAYS_OF_WEEK.find(d => d.id === selectedDay)?.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredAssignments.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No tasks assigned for this day.
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleAssignmentDragEnd(event, child.id)}
                    modifiers={[restrictToVerticalAxis]}
                  >
                    <SortableContext items={filteredAssignments.map(a => a.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {filteredAssignments.map((assignment) => (
                          <SortableAssignmentItem
                            key={assignment.id}
                            assignment={assignment}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}