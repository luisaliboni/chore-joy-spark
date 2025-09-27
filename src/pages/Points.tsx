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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-child2/10 p-2 sm:p-4 lg:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs sm:text-sm self-start sm:self-center"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Back to </span>Chores
          </Button>
          
          <div className="text-center">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold">Points & Rewards</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{getCurrentWeek()}</p>
          </div>
          
          <div className="hidden sm:block" />
        </div>

        {/* Children Points Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {children.map((child) => (
            <Card key={child.id} className="overflow-hidden">
              <CardHeader 
                className="text-white p-4 sm:p-6"
                style={{
                  background: child.child_order === 1 
                    ? 'var(--gradient-child1)' 
                    : 'var(--gradient-child2)'
                }}
              >
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  ⭐ {child.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="text-center mb-4 sm:mb-6">
                  <div className="text-2xl sm:text-4xl font-bold mb-2">{child.weekly_points}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Points This Week</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Achievement Level: {child.weekly_points >= 50 ? 'Chore Champion' : 'Getting There'}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    size="sm"
                    onClick={() => openPointsDialog(child.id, child.name, 'good')}
                    className="bg-success text-white text-xs sm:text-sm"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Good </span>Behavior
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openPointsDialog(child.id, child.name, 'bad')}
                    className="text-xs sm:text-sm"
                  >
                    <Minus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Bad </span>Behavior
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Available Rewards */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              🎁 Available Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {rewards.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">
                No rewards available. Add some in the settings!
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {rewards.map((reward) => (
                  <div key={reward.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                    <div className="text-xl sm:text-2xl shrink-0">{reward.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base">{reward.title}</h3>
                    </div>
                    <div className="flex flex-col sm:text-center w-full sm:w-auto">
                      <div className="text-sm sm:text-lg font-bold text-primary mb-2">{reward.cost_points} Points</div>
                      <div className="flex flex-wrap gap-1 sm:gap-1">
                        {children.map((child) => (
                          <Button
                            key={child.id}
                            size="sm"
                            disabled={child.weekly_points < reward.cost_points}
                            onClick={() => redeemReward(child.id, reward)}
                            className="text-xs flex-1 sm:flex-none"
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
            
            <div className="text-center mt-4 sm:mt-6 text-xs sm:text-sm text-muted-foreground">
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