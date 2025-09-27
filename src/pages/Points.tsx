import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Minus, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Child {
  id: string;
  name: string;
  color: string;
  weekly_points: number;
  child_order: number;
}

interface Reward {
  id: string;
  title: string;
  icon: string;
  cost_points: number;
  is_available: boolean;
}

export default function Points() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointsDialog, setPointsDialog] = useState<{
    isOpen: boolean;
    childId: string;
    childName: string;
    type: 'good' | 'bad';
    points: number;
  }>({
    isOpen: false,
    childId: '',
    childName: '',
    type: 'good',
    points: 5
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch children
      const { data: childrenData } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.id)
        .order('child_order');

      // Fetch rewards
      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_available', true)
        .order('display_order');

      if (childrenData) setChildren(childrenData);
      if (rewardsData) setRewards(rewardsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPointsDialog = (childId: string, childName: string, type: 'good' | 'bad') => {
    setPointsDialog({
      isOpen: true,
      childId,
      childName,
      type,
      points: 5
    });
  };

  const adjustPoints = async () => {
    try {
      const child = children.find(c => c.id === pointsDialog.childId);
      if (!child) return;

      const adjustment = pointsDialog.type === 'good' ? pointsDialog.points : -pointsDialog.points;
      const newPoints = Math.max(0, child.weekly_points + adjustment);
      
      await supabase
        .from('children')
        .update({ weekly_points: newPoints })
        .eq('id', pointsDialog.childId);

      toast.success(`${pointsDialog.type === 'good' ? 'Added' : 'Removed'} ${pointsDialog.points} points to ${pointsDialog.childName}!`);
      setPointsDialog(prev => ({ ...prev, isOpen: false }));
      fetchData();
    } catch (error) {
      console.error('Error adjusting points:', error);
      toast.error('Failed to adjust points');
    }
  };

  const resetWeeklyPoints = async () => {
    if (!user) return;

    try {
      await supabase.rpc('reset_weekly_points', { target_user_id: user.id });
      toast.success('Weekly points reset successfully!');
      fetchData();
    } catch (error) {
      console.error('Error resetting points:', error);
      toast.error('Failed to reset points');
    }
  };

  const redeemReward = async (childId: string, reward: Reward) => {
    try {
      const child = children.find(c => c.id === childId);
      if (!child) return;

      if (child.weekly_points < reward.cost_points) {
        toast.error('Not enough points for this reward!');
        return;
      }

      const newPoints = child.weekly_points - reward.cost_points;
      
      await supabase
        .from('children')
        .update({ weekly_points: newPoints })
        .eq('id', childId);

      toast.success(`${child.name} redeemed ${reward.title}! 🎉`);
      fetchData();
    } catch (error) {
      console.error('Error redeeming reward:', error);
      toast.error('Failed to redeem reward');
    }
  };

  const getCurrentWeek = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `Week of ${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;
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
        <div className="flex flex-col tablet:flex-row items-center justify-between mb-6 tablet:mb-8 gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-responsive-sm"
          >
            <ArrowLeft className="icon-responsive-sm" />
            Back to Chores
          </Button>
          
          <div className="text-center">
            <h1 className="text-responsive-xl font-bold">Points & Rewards</h1>
            <p className="text-responsive-sm text-muted-foreground">{getCurrentWeek()}</p>
          </div>
          
          <div className="tablet:w-24" />
        </div>

        {/* Children Points Cards */}
        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4 tablet:gap-6 mb-6 tablet:mb-8">
          {children.map((child) => (
            <Card key={child.id} className="overflow-hidden">
              <CardHeader 
                className="text-white"
                style={{
                  background: child.child_order === 1 
                    ? 'var(--gradient-child1)' 
                    : 'var(--gradient-child2)'
                }}
              >
                <CardTitle className="flex items-center gap-2">
                  ⭐ {child.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-responsive">
                <div className="text-center mb-4 tablet:mb-6">
                  <div className="text-3xl tablet:text-4xl desktop:text-5xl font-bold mb-2">{child.weekly_points}</div>
                  <div className="text-responsive-sm text-muted-foreground">Points This Week</div>
                  <div className="mt-2 text-responsive-xs text-muted-foreground">
                    Achievement Level: {child.weekly_points >= 50 ? 'Chore Champion' : 'Getting There'}
                  </div>
                </div>
                
                <div className="flex flex-col tablet:flex-row gap-2 justify-center">
                  <Button
                    size="sm"
                    onClick={() => openPointsDialog(child.id, child.name, 'good')}
                    className="bg-success text-white text-responsive-xs touch-target"
                  >
                    <Plus className="icon-responsive-sm mr-1" />
                    Good Behavior
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openPointsDialog(child.id, child.name, 'bad')}
                    className="text-responsive-xs touch-target"
                  >
                    <Minus className="icon-responsive-sm mr-1" />
                    Bad Behavior
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Available Rewards */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎁 Available Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rewards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No rewards available. Add some in the settings!
              </div>
            ) : (
              <div className="grid grid-cols-1 desktop:grid-cols-2 gap-4">
                {rewards.map((reward) => (
                  <div key={reward.id} className="flex items-center gap-responsive p-responsive border rounded-lg">
                    <div className="text-xl tablet:text-2xl desktop:text-3xl">
                      {reward.icon.startsWith('http') ? (
                        <img src={reward.icon} alt="Reward icon" className="icon-responsive object-cover rounded" />
                      ) : (
                        reward.icon
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-responsive-sm">{reward.title}</h3>
                    </div>
                    <div className="text-center">
                      <div className="text-responsive-base font-bold text-primary">{reward.cost_points} Points</div>
                      <div className="flex flex-col tablet:flex-row gap-1 mt-2">
                        {children.map((child) => (
                          <Button
                            key={child.id}
                            size="sm"
                            disabled={child.weekly_points < reward.cost_points}
                            onClick={() => redeemReward(child.id, reward)}
                            className="text-responsive-xs touch-target"
                            style={{
                              backgroundColor: child.weekly_points >= reward.cost_points 
                                ? (child.child_order === 1 ? 'hsl(var(--child1-color))' : 'hsl(var(--child2-color))')
                                : undefined
                            }}
                          >
                            {child.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-center mt-6 text-sm text-muted-foreground">
              ✨ Complete your chores to earn points and unlock these amazing rewards! ✨
            </div>
          </CardContent>
        </Card>

        {/* Reset Button */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={resetWeeklyPoints}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Weekly Points
          </Button>
        </div>
      </div>

      {/* Points Adjustment Dialog */}
      <Dialog open={pointsDialog.isOpen} onOpenChange={(open) => setPointsDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pointsDialog.type === 'good' ? '🌟 Good Behavior!' : '⚠️ Bad Behavior'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {pointsDialog.type === 'good' 
                ? `How many points would you like to add to ${pointsDialog.childName}?`
                : `How many points would you like to deduct from ${pointsDialog.childName}?`
              }
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                min="1"
                max="50"
                value={pointsDialog.points}
                onChange={(e) => setPointsDialog(prev => ({ 
                  ...prev, 
                  points: Math.max(1, Math.min(50, parseInt(e.target.value) || 1))
                }))}
                className="text-center text-lg font-bold"
              />
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setPointsDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={adjustPoints}
                className={pointsDialog.type === 'good' ? 'bg-success text-white flex-1' : 'flex-1'}
                variant={pointsDialog.type === 'good' ? 'default' : 'destructive'}
              >
                {pointsDialog.type === 'good' ? 'Add Points' : 'Deduct Points'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}