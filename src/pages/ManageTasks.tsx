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
import { ArrowLeft, Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

interface TaskFormData {
  title: string;
  icon: string;
  points: number;
  assignTo: string[];
  days: string[];
}

const TASK_ICONS = [
  '🦷', '🧼', '👕', '🍽️', '🧸', '📚', '🛏️', '🧹', '🗑️', '🐕',
  '🌱', '🏃', '🎵', '📝', '🧽', '🚿', '🥛', '🍎', '📱', '⚽'
];

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 border rounded-lg bg-card"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="text-2xl">{task.icon}</div>
      <div className="flex-1">
        <h3 className="font-medium">{task.title}</h3>
        <p className="text-sm text-muted-foreground">{task.points} points</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(task)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onDelete(task.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
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
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    icon: '🦷',
    points: 1,
    assignTo: [],
    days: []
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

      if (tasksData) setTasks(tasksData);
      if (childrenData) setChildren(childrenData);
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
        // Create task assignments for selected children and days
        const assignments = [];
        
        for (const childId of formData.assignTo) {
          for (const day of formData.days) {
            // Calculate the date for the day
            const today = new Date();
            const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const dayIndex = DAYS_OF_WEEK.findIndex(d => d.id === day);
            const daysUntilTarget = (dayIndex + 1 - currentDay + 7) % 7;
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + daysUntilTarget);
            
            assignments.push({
              user_id: user.id,
              task_id: task.id,
              child_id: childId,
              assigned_date: targetDate.toISOString().split('T')[0],
              display_order: 0
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

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      icon: task.icon,
      points: task.points,
      assignTo: [],
      days: []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (taskId: string) => {
    try {
      await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      toast.success('Task deleted!');
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
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chores
          </Button>
          
          <h1 className="text-2xl font-bold">Manage Tasks</h1>
          
          <div className="flex gap-2">
            <Button onClick={() => navigate('/manage-routines')} variant="outline">
              📋 Routines
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Task Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Brush teeth"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="points">Points</Label>
                      <Input
                        id="points"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.points}
                        onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Task Icon</Label>
                    <div className="grid grid-cols-10 gap-2">
                      {TASK_ICONS.map((icon) => (
                        <Button
                          key={icon}
                          type="button"
                          variant={formData.icon === icon ? 'default' : 'outline'}
                          className="aspect-square p-2"
                          onClick={() => setFormData(prev => ({ ...prev, icon }))}
                        >
                          {icon}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {!editingTask && (
                    <>
                      <div className="space-y-2">
                        <Label>Assign to Children</Label>
                        <div className="space-y-2">
                          {children.map((child) => (
                            <div key={child.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`child-${child.id}`}
                                checked={formData.assignTo.includes(child.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFormData(prev => ({
                                      ...prev,
                                      assignTo: [...prev.assignTo, child.id]
                                    }));
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      assignTo: prev.assignTo.filter(id => id !== child.id)
                                    }));
                                  }
                                }}
                              />
                              <Label htmlFor={`child-${child.id}`}>{child.name}</Label>
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
                                id={`day-${day.id}`}
                                checked={formData.days.includes(day.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFormData(prev => ({
                                      ...prev,
                                      days: [...prev.days, day.id]
                                    }));
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      days: prev.days.filter(d => d !== day.id)
                                    }));
                                  }
                                }}
                              />
                              <Label htmlFor={`day-${day.id}`}>{day.label}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingTask(null);
                        setFormData({ title: '', icon: '🦷', points: 1, assignTo: [], days: [] });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingTask ? 'Update Task' : 'Create Task'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks ({tasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tasks created yet. Add your first task above!
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
              >
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
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
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}