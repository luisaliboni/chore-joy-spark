import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Save, Play, Trash2, Edit, GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Routine {
  id: string;
  name: string;
  task_ids: string[];
  created_at: string;
}

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
  child_order: number;
}

interface RoutineFormData {
  name: string;
  selectedTasks: string[];
}

const DAYS_OF_WEEK = [
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
  { id: 0, label: 'Sunday' }
];

export default function ManageRoutines() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [formData, setFormData] = useState<RoutineFormData>({
    name: '',
    selectedTasks: []
  });
  const [applyData, setApplyData] = useState({
    children: [] as string[],
    days: [] as number[]
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch routines
      const { data: routinesData } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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

      if (routinesData) setRoutines(routinesData);
      if (tasksData) setTasks(tasksData);
      if (childrenData) setChildren(childrenData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || formData.selectedTasks.length === 0) return;

    try {
      if (editingRoutine) {
        // Update existing routine
        await supabase
          .from('routines')
          .update({
            name: formData.name,
            task_ids: formData.selectedTasks
          })
          .eq('id', editingRoutine.id);
        
        toast.success('Routine updated successfully!');
      } else {
        // Create new routine
        await supabase
          .from('routines')
          .insert({
            user_id: user.id,
            name: formData.name,
            task_ids: formData.selectedTasks
          });
        
        toast.success('Routine created successfully!');
      }

      setIsCreateDialogOpen(false);
      setEditingRoutine(null);
      setFormData({ name: '', selectedTasks: [] });
      fetchData();
    } catch (error) {
      console.error('Error saving routine:', error);
      toast.error('Failed to save routine');
    }
  };

  const handleEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine);
    setFormData({
      name: routine.name,
      selectedTasks: [...routine.task_ids]
    });
    setIsCreateDialogOpen(true);
  };

  const handleSaveRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !formData.name.trim() || formData.selectedTasks.length === 0) {
      toast.error('Please provide a name and select at least one task');
      return;
    }

    try {
      if (editingRoutine) {
        // Update existing routine
        await supabase
          .from('routines')
          .update({
            name: formData.name.trim(),
            task_ids: formData.selectedTasks
          })
          .eq('id', editingRoutine.id);
        
        toast.success('Routine updated successfully!');
      } else {
        // Create new routine
        await supabase
          .from('routines')
          .insert({
            user_id: user.id,
            name: formData.name.trim(),
            task_ids: formData.selectedTasks
          });
        
        toast.success('Routine created successfully!');
      }

      setIsCreateDialogOpen(false);
      setEditingRoutine(null);
      setFormData({ name: '', selectedTasks: [] });
      fetchData();
    } catch (error) {
      console.error('Error saving routine:', error);
      toast.error('Failed to save routine');
    }
  };

  const handleApplyRoutine = async () => {
    if (!user || !selectedRoutine || applyData.children.length === 0 || applyData.days.length === 0) {
      toast.error('Please select children and days to apply the routine');
      return;
    }

    try {
      const assignments = [];
      
      for (const childId of applyData.children) {
        for (const day of applyData.days) {
          // Calculate the date for the current week's occurrence of this day
          const today = new Date();
          const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
          // day is already in the correct format (0-6 where 0 = Sunday)
          const targetDayOfWeek = day;
          
          // Get the start of current week (Sunday)
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - currentDay);
          
          // Calculate the target date for this week
          const targetDate = new Date(startOfWeek);
          targetDate.setDate(startOfWeek.getDate() + targetDayOfWeek);
          const dateStr = targetDate.toISOString().split('T')[0];
          
          // Check for existing assignments for this child and date
          const { data: existingAssignments } = await supabase
            .from('task_assignments')
            .select('task_id')
            .eq('user_id', user.id)
            .eq('child_id', childId)
            .eq('assigned_date', dateStr);

          const existingTaskIds = new Set(existingAssignments?.map(a => a.task_id) || []);
          
          // Get the highest display_order for existing assignments on this date
          const { data: maxOrderData } = await supabase
            .from('task_assignments')
            .select('display_order')
            .eq('user_id', user.id)
            .eq('child_id', childId)
            .eq('assigned_date', dateStr)
            .order('display_order', { ascending: false })
            .limit(1);
          
          const startOrder = maxOrderData && maxOrderData.length > 0 
            ? maxOrderData[0].display_order + 1 
            : 0;
          
          // Create assignments for all tasks in the routine that don't already exist
          let orderOffset = 0;
          for (let i = 0; i < selectedRoutine.task_ids.length; i++) {
            const taskId = selectedRoutine.task_ids[i];
            if (!existingTaskIds.has(taskId)) {
              assignments.push({
                user_id: user.id,
                task_id: taskId,
                child_id: childId,
                assigned_date: dateStr,
                weekday: day,
                display_order: startOrder + orderOffset
              });
              orderOffset++;
            }
          }
        }
      }

      if (assignments.length > 0) {
        await supabase
          .from('task_assignments')
          .insert(assignments);
        
        toast.success(`Routine applied successfully! Created ${assignments.length} task assignments.`);
      } else {
        toast.info('All tasks from this routine are already assigned for the selected days.');
      }

      setIsApplyDialogOpen(false);
      setSelectedRoutine(null);
      setApplyData({ children: [], days: [] });
    } catch (error: any) {
      console.error('Error applying routine:', error);
      if (error.code === '23505') {
        toast.error('Some tasks are already assigned for the selected days. Please check existing assignments.');
      } else {
        toast.error('Failed to apply routine');
      }
    }
  };

  const handleDeleteRoutine = async (routineId: string) => {
    try {
      // First get the routine data before deleting
      const { data: routineToDelete } = await supabase
        .from('routines')
        .select('*')
        .eq('id', routineId)
        .single();

      if (!routineToDelete) {
        toast.error('Routine not found');
        return;
      }

      // Delete the routine
      await supabase
        .from('routines')
        .delete()
        .eq('id', routineId);
      
      // Show undo toast
      toast.success('Routine deleted!', {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              // Restore the routine
              await supabase
                .from('routines')
                .insert({
                  id: routineToDelete.id,
                  user_id: routineToDelete.user_id,
                  name: routineToDelete.name,
                  task_ids: routineToDelete.task_ids
                });

              toast.success('Routine restored!');
              fetchData();
            } catch (error) {
              console.error('Error restoring routine:', error);
              toast.error('Failed to restore routine');
            }
          }
        },
        duration: 10000 // 10 seconds to undo
      });
      
      fetchData();
    } catch (error) {
      console.error('Error deleting routine:', error);
      toast.error('Failed to delete routine');
    }
  };

  const getTasksForRoutine = (routine: Routine) => {
    return routine.task_ids
      .map(taskId => tasks.find(task => task.id === taskId))
      .filter(Boolean) as Task[];
  };

  const handleDragEnd = async (event: DragEndEvent, routine: Routine) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const routineTasks = getTasksForRoutine(routine);
      const oldIndex = routineTasks.findIndex(task => task.id === active.id);
      const newIndex = routineTasks.findIndex(task => task.id === over.id);

      const newTaskIds = arrayMove(routine.task_ids, oldIndex, newIndex);

      // Optimistically update UI
      setRoutines(prev => prev.map(r => 
        r.id === routine.id ? { ...r, task_ids: newTaskIds } : r
      ));

      // Save to database
      try {
        await supabase
          .from('routines')
          .update({ task_ids: newTaskIds })
          .eq('id', routine.id);
        
        toast.success('Task order updated');
      } catch (error) {
        console.error('Error updating task order:', error);
        toast.error('Failed to update task order');
        // Revert on error
        fetchData();
      }
    }
  };

  const handleFormDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData(prev => {
        const oldIndex = prev.selectedTasks.indexOf(active.id as string);
        const newIndex = prev.selectedTasks.indexOf(over.id as string);
        return {
          ...prev,
          selectedTasks: arrayMove(prev.selectedTasks, oldIndex, newIndex)
        };
      });
    }
  };

  interface SortableTaskItemProps {
    task: Task;
    index: number;
  }

  const SortableTaskItem = ({ task, index }: SortableTaskItemProps) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: task.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm cursor-grab active:cursor-grabbing"
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <span>{index + 1}.</span>
        <div className="flex items-center gap-1">
          {task.icon.split(',').map((icon, idx) => (
            icon.startsWith('http') ? (
              <img 
                key={idx}
                src={icon} 
                alt="Task icon" 
                className="w-4 h-4 object-cover rounded"
              />
            ) : (
              <span key={idx}>{icon}</span>
            )
          ))}
        </div>
        <span>{task.title}</span>
      </div>
    );
  };

  interface SortableFormTaskProps {
    task: Task;
  }

  const SortableFormTask = ({ task }: SortableFormTaskProps) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: task.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center space-x-2 p-2 bg-muted/50 rounded"
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-1 text-xl">
            {task.icon.split(',').map((icon, idx) => (
              icon.startsWith('http') ? (
                <img 
                  key={idx}
                  src={icon} 
                  alt="Task icon" 
                  className="w-5 h-5 object-cover rounded"
                />
              ) : (
                <span key={idx}>{icon}</span>
              )
            ))}
          </div>
          <span className="flex-1">
            {task.title} ({task.points} pts)
          </span>
        </div>
      </div>
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/manage-tasks')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tasks
          </Button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold">Manage Routines</h1>
            <p className="text-muted-foreground">Create and apply task sequences</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setEditingRoutine(null);
              setFormData({ name: '', selectedTasks: [] });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Routine
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingRoutine ? 'Edit Routine' : 'Create New Routine'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveRoutine} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="routineName">Routine Name</Label>
                  <Input
                    id="routineName"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Morning Routine, Bedtime Tasks"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Select Tasks (in order)</Label>
                  <div className="max-h-64 overflow-y-auto space-y-2 border rounded p-4">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`task-${task.id}`}
                          checked={formData.selectedTasks.includes(task.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({
                                ...prev,
                                selectedTasks: [...prev.selectedTasks, task.id]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                selectedTasks: prev.selectedTasks.filter(id => id !== task.id)
                              }));
                            }
                          }}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex items-center gap-1 text-xl">
                            {task.icon.split(',').map((icon, idx) => (
                              icon.startsWith('http') ? (
                                <img 
                                  key={idx}
                                  src={icon} 
                                  alt="Task icon" 
                                  className="w-5 h-5 object-cover rounded"
                                />
                              ) : (
                                <span key={idx}>{icon}</span>
                              )
                            ))}
                          </div>
                          <Label htmlFor={`task-${task.id}`} className="flex-1">
                            {task.title} ({task.points} pts)
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                  {formData.selectedTasks.length > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {formData.selectedTasks.length} tasks selected - Drag to reorder:
                      </p>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleFormDragEnd}
                      >
                        <SortableContext
                          items={formData.selectedTasks}
                          strategy={horizontalListSortingStrategy}
                        >
                          <div className="flex flex-wrap gap-2 p-4 border rounded bg-muted/30">
                            {formData.selectedTasks.map((taskId) => {
                              const task = tasks.find(t => t.id === taskId);
                              return task ? <SortableFormTask key={task.id} task={task} /> : null;
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setFormData({ name: '', selectedTasks: [] });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Create Routine
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Routines List */}
        <div className="space-y-4">
          {routines.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-muted-foreground">
                  <p className="text-lg mb-2">No routines created yet</p>
                  <p className="text-sm">Create your first routine to quickly assign multiple tasks!</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            routines.map((routine) => {
              const routineTasks = getTasksForRoutine(routine);
              return (
                <Card key={routine.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        📋 {routine.name}
                      </CardTitle>
                       <div className="flex gap-2">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => handleEditRoutine(routine)}
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                         <Button
                           size="sm"
                           onClick={() => {
                             setSelectedRoutine(routine);
                             setIsApplyDialogOpen(true);
                           }}
                         >
                           <Play className="h-4 w-4 mr-2" />
                           Apply
                         </Button>
                         <Button
                           size="sm"
                           variant="destructive"
                           onClick={() => handleDeleteRoutine(routine.id)}
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {routineTasks.length} tasks • Total: {routineTasks.reduce((sum, task) => sum + task.points, 0)} points
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Drag tasks to reorder
                      </p>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => handleDragEnd(event, routine)}
                      >
                        <SortableContext
                          items={routineTasks.map(t => t.id)}
                          strategy={horizontalListSortingStrategy}
                        >
                          <div className="flex flex-wrap gap-2">
                            {routineTasks.map((task, index) => (
                              <SortableTaskItem key={task.id} task={task} index={index} />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Apply Routine Dialog */}
        <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply Routine: {selectedRoutine?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Assign to Children</Label>
                <div className="space-y-2">
                  {children.map((child) => (
                    <div key={child.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`apply-child-${child.id}`}
                        checked={applyData.children.includes(child.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setApplyData(prev => ({
                              ...prev,
                              children: [...prev.children, child.id]
                            }));
                          } else {
                            setApplyData(prev => ({
                              ...prev,
                              children: prev.children.filter(id => id !== child.id)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`apply-child-${child.id}`}>{child.name}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assign to Days</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`apply-day-${day.id}`}
                        checked={applyData.days.includes(day.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setApplyData(prev => ({
                              ...prev,
                              days: [...prev.days, day.id]
                            }));
                          } else {
                            setApplyData(prev => ({
                              ...prev,
                              days: prev.days.filter(d => d !== day.id)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`apply-day-${day.id}`}>{day.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsApplyDialogOpen(false);
                    setSelectedRoutine(null);
                    setApplyData({ children: [], days: [] });
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleApplyRoutine}>
                  Apply Routine
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}