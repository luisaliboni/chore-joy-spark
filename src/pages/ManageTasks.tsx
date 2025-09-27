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

const TASK_ICONS = {
  'Personal Care': [
    '🦷', '🧼', '🚿', '🧽', '🪥', '🧴', '💊', '🩹'
  ],
  'Clothing': [
    '👕', '👔', '👗', '👖', '🧦', '👞', '🧺', '👚'
  ],
  'Food & Kitchen': [
    '🍽️', '🥛', '🍎', '🥕', '🍌', '🥪', '🍳', '🧊', '🫖', '🥤'
  ],
  'Cleaning': [
    '🧹', '🗑️', '🧽', '🚮', '🪣', '🧴', '🧻'
  ],
  'School': [
    '📚', '📝', '✏️', '📖', '🖊️', '📒', '🎒', '📐', '🖍️', '📏'
  ],
  'Pets': [
    '🐕', '🐱', '🐹', '🐰', '🐠', '🦮', '🦴', '🥫'
  ],
  'Outdoor': [
    '🌱', '🌸', '🌿', '🪴', '⛰️', '🌳', '🍃', '🌺'
  ],
  'Sports': [
    '⚽', '🏀', '🎾', '🏈', '🏃', '🚴', '🏊', '🤸', '🧘', '🏋️'
  ],
  'Music & Arts': [
    '🎵', '🎸', '🎹', '🎨', '🖼️', '🎭', '🎪', '🎬'
  ],
  'Technology': [
    '📱', '💻', '🎮', '📺', '🔌', '💡', '🔋', '📷'
  ],
  'Toys': [
    '🧸', '🪀', '🎲', '🧩', '🪁', '🎯', '🪆', '🎊'
  ],
  'Time': [
    '⏰', '📅', '⏲️', '📝', '📋', '📌', '📍', '🗓️'
  ],
  'Transportation': [
    '🚗', '🚌', '🚲', '✈️', '🚂', '🛴', '🚁', '⛵'
  ],
  'Home': [
    '🏠', '🏡', '🚪', '🛏️', '🪑', '🛋️', '🚻'
  ],
  'Special': [
    '🎉', '🎁', '🎂', '🎈', '⭐', '🏆', '🥇', '🎀'
  ]
};

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
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
      <div className="text-2xl">
        {task.icon.startsWith('http') ? (
          <img src={task.icon} alt="Task icon" className="w-8 h-8 object-cover rounded" />
        ) : (
          task.icon
        )}
      </div>
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
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-xl">
          {assignment.tasks.icon.startsWith('http') ? (
            <img src={assignment.tasks.icon} alt="Task icon" className="w-6 h-6 object-cover rounded" />
          ) : (
            assignment.tasks.icon
          )}
        </div>
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
  const [selectedDay, setSelectedDay] = useState<string>('monday');
  const [taskAssignments, setTaskAssignments] = useState<Record<string, any[]>>({});
  const [uploadedIcons, setUploadedIcons] = useState<string[]>([]);
  const [uploadingIcon, setUploadingIcon] = useState(false);
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
      fetchUploadedIcons();
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
                points
              )
            `)
            .eq('user_id', user.id)
            .eq('child_id', child.id)
            .order('weekday', { ascending: true });

          assignments[child.id] = data || [];
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

  const fetchUploadedIcons = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.storage
        .from('task-icons')
        .list(user.id, {
          limit: 100,
          offset: 0
        });

      if (error) throw error;

      const iconUrls = data?.map(file => {
        const { data: { publicUrl } } = supabase.storage
          .from('task-icons')
          .getPublicUrl(`${user.id}/${file.name}`);
        return publicUrl;
      }) || [];

      setUploadedIcons(iconUrls);
    } catch (error) {
      console.error('Error fetching uploaded icons:', error);
    }
  };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setUploadingIcon(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-icons')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('task-icons')
        .getPublicUrl(filePath);

      // Update form data with new icon
      setFormData(prev => ({ ...prev, icon: publicUrl }));
      
      // Refresh uploaded icons
      await fetchUploadedIcons();
      
      toast.success('Icon uploaded successfully!');
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast.error('Failed to upload icon');
    } finally {
      setUploadingIcon(false);
      // Reset file input
      event.target.value = '';
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
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

                  <div className="space-y-4">
                    <Label>Task Icon</Label>
                    
                    {/* Upload Section */}
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Label htmlFor="icon-upload" className="text-sm font-medium">Upload Custom Icon</Label>
                      </div>
                      <div className="flex gap-2">
                        <input
                          id="icon-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleIconUpload}
                          className="hidden"
                        />
                        <Label
                          htmlFor="icon-upload"
                          className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-accent text-sm"
                        >
                          <Upload className="h-4 w-4" />
                          {uploadingIcon ? 'Uploading...' : 'Choose Image'}
                        </Label>
                        {formData.icon.startsWith('http') && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData(prev => ({ ...prev, icon: '🦷' }))}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Current Selection Display */}
                    <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/20">
                      <span className="text-sm font-medium">Selected:</span>
                      <div className="w-8 h-8 flex items-center justify-center border rounded text-xl">
                        {formData.icon.startsWith('http') ? (
                          <img src={formData.icon} alt="Custom icon" className="w-6 h-6 object-cover rounded" />
                        ) : (
                          formData.icon
                        )}
                      </div>
                    </div>

                    {/* Icon Selection Tabs */}
                    <div className="border rounded-lg p-4 max-h-80 overflow-y-auto bg-muted/30">
                      <Tabs defaultValue="Personal Care" className="w-full">
                        <TabsList className="grid grid-cols-3 lg:grid-cols-5 gap-1 h-auto p-1 mb-4">
                          {Object.keys(TASK_ICONS).slice(0, 5).map((category) => (
                            <TabsTrigger key={category} value={category} className="text-xs p-2">
                              {category}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        <TabsList className="grid grid-cols-3 lg:grid-cols-5 gap-1 h-auto p-1 mb-4">
                          {Object.keys(TASK_ICONS).slice(5, 10).map((category) => (
                            <TabsTrigger key={category} value={category} className="text-xs p-2">
                              {category}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        <TabsList className="grid grid-cols-3 lg:grid-cols-5 gap-1 h-auto p-1 mb-4">
                          {Object.keys(TASK_ICONS).slice(10).map((category) => (
                            <TabsTrigger key={category} value={category} className="text-xs p-2">
                              {category}
                            </TabsTrigger>
                          ))}
                        </TabsList>

                        {/* Uploaded Icons Tab */}
                        {uploadedIcons.length > 0 && (
                          <TabsList className="grid grid-cols-1 gap-1 h-auto p-1 mb-4">
                            <TabsTrigger value="uploaded" className="text-xs p-2">
                              My Uploads ({uploadedIcons.length})
                            </TabsTrigger>
                          </TabsList>
                        )}

                        {/* Category Content */}
                        {Object.entries(TASK_ICONS).map(([category, icons]) => (
                          <TabsContent key={category} value={category} className="mt-2">
                            <div className="grid grid-cols-8 gap-2">
                              {icons.map((icon, index) => (
                                <Button
                                  key={`${category}-${icon}-${index}`}
                                  type="button"
                                  variant={formData.icon === icon ? 'default' : 'outline'}
                                  className="aspect-square p-2 text-xl h-12 w-12 hover:scale-105 transition-transform"
                                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                                >
                                  {icon}
                                </Button>
                              ))}
                            </div>
                          </TabsContent>
                        ))}

                        {/* Uploaded Icons Content */}
                        {uploadedIcons.length > 0 && (
                          <TabsContent value="uploaded" className="mt-2">
                            <div className="grid grid-cols-8 gap-2">
                              {uploadedIcons.map((iconUrl, index) => (
                                <Button
                                  key={`uploaded-${iconUrl}-${index}`}
                                  type="button"
                                  variant={formData.icon === iconUrl ? 'default' : 'outline'}
                                  className="aspect-square p-1 h-12 w-12 hover:scale-105 transition-transform"
                                  onClick={() => setFormData(prev => ({ ...prev, icon: iconUrl }))}
                                >
                                  <img src={iconUrl} alt="Custom icon" className="w-8 h-8 object-cover rounded" />
                                </Button>
                              ))}
                            </div>
                          </TabsContent>
                        )}
                      </Tabs>
                    </div>
                  </div>

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