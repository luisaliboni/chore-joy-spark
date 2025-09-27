import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconSelector } from '@/components/IconSelector';

interface Reward {
  id: string;
  title: string;
  icon: string;
  cost_points: number;
  is_available: boolean;
  display_order: number;
}

interface RewardFormData {
  title: string;
  icon: string;
  cost_points: number;
  is_available: boolean;
}


function SortableRewardItem({ reward, onEdit, onDelete, onToggleAvailability }: { 
  reward: Reward; 
  onEdit: (reward: Reward) => void; 
  onDelete: (id: string) => void;
  onToggleAvailability: (id: string, available: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: reward.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 border rounded-lg transition-all ${
        reward.is_available ? 'bg-card' : 'bg-muted/50 opacity-60'
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="text-2xl min-w-[2rem] h-8 flex items-center justify-center">
        {reward.icon.startsWith('http') ? (
          <img 
            src={reward.icon} 
            alt="Reward icon" 
            className="w-8 h-8 object-cover rounded"
          />
        ) : (
          reward.icon
        )}
      </div>
      <div className="flex-1">
        <h3 className="font-medium">{reward.title}</h3>
        <p className="text-sm text-muted-foreground">{reward.cost_points} points</p>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={reward.is_available}
          onCheckedChange={(checked) => onToggleAvailability(reward.id, checked)}
        />
        <span className="text-xs text-muted-foreground">
          {reward.is_available ? 'Available' : 'Hidden'}
        </span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(reward)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onDelete(reward.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ManageRewards() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState<RewardFormData>({
    title: '',
    icon: '🎁',
    cost_points: 10,
    is_available: true
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user) {
      fetchRewards();
    }
  }, [user]);

  const fetchRewards = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('rewards')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order');

      if (data) setRewards(data);
    } catch (error) {
      console.error('Error fetching rewards:', error);
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
      if (editingReward) {
        // Update existing reward
        await supabase
          .from('rewards')
          .update({
            title: formData.title.trim(),
            icon: formData.icon,
            cost_points: formData.cost_points,
            is_available: formData.is_available
          })
          .eq('id', editingReward.id);
      } else {
        // Create new reward
        await supabase
          .from('rewards')
          .insert({
            user_id: user.id,
            title: formData.title.trim(),
            icon: formData.icon,
            cost_points: formData.cost_points,
            is_available: formData.is_available,
            display_order: rewards.length
          });
      }

      toast.success(editingReward ? 'Reward updated!' : 'Reward created!');
      setIsDialogOpen(false);
      setEditingReward(null);
      setFormData({ title: '', icon: '🎁', cost_points: 10, is_available: true });
      fetchRewards();
    } catch (error) {
      console.error('Error saving reward:', error);
      toast.error('Failed to save reward');
    }
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      title: reward.title,
      icon: reward.icon,
      cost_points: reward.cost_points,
      is_available: reward.is_available
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (rewardId: string) => {
    try {
      await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId);
      
      toast.success('Reward deleted!');
      fetchRewards();
    } catch (error) {
      console.error('Error deleting reward:', error);
      toast.error('Failed to delete reward');
    }
  };

  const handleToggleAvailability = async (rewardId: string, available: boolean) => {
    try {
      await supabase
        .from('rewards')
        .update({ is_available: available })
        .eq('id', rewardId);
      
      toast.success(`Reward ${available ? 'made available' : 'hidden'}!`);
      fetchRewards();
    } catch (error) {
      console.error('Error updating reward availability:', error);
      toast.error('Failed to update reward');
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = rewards.findIndex(reward => reward.id === active.id);
      const newIndex = rewards.findIndex(reward => reward.id === over.id);
      
      const newRewards = arrayMove(rewards, oldIndex, newIndex);
      setRewards(newRewards);

      // Update display_order in database
      try {
        const updates = newRewards.map((reward, index) => ({
          id: reward.id,
          display_order: index
        }));

        for (const update of updates) {
          await supabase
            .from('rewards')
            .update({ display_order: update.display_order })
            .eq('id', update.id);
        }
      } catch (error) {
        console.error('Error updating reward order:', error);
        toast.error('Failed to update reward order');
        fetchRewards(); // Revert on error
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-child2/10 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold">Manage Rewards</h1>
            <p className="text-muted-foreground">Set up rewards that kids can earn with their points</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Reward
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingReward ? 'Edit Reward' : 'Create New Reward'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Reward Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Screen time - 40 minutes"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost">Cost in Points</Label>
                  <Input
                    id="cost"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.cost_points}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost_points: parseInt(e.target.value) || 1 }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reward Icon</Label>
                  <IconSelector
                    selectedIcon={formData.icon}
                    onIconSelect={(icon) => setFormData(prev => ({ ...prev, icon }))}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="available"
                    checked={formData.is_available}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_available: checked }))}
                  />
                  <Label htmlFor="available">Available for redemption</Label>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingReward(null);
                      setFormData({ title: '', icon: '🎁', cost_points: 10, is_available: true });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingReward ? 'Update Reward' : 'Create Reward'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Rewards List */}
        <Card>
          <CardHeader>
            <CardTitle>Rewards ({rewards.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {rewards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No rewards created yet. Add your first reward above!
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
              >
                <SortableContext items={rewards.map(r => r.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {rewards.map((reward) => (
                      <SortableRewardItem
                        key={reward.id}
                        reward={reward}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleAvailability={handleToggleAvailability}
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