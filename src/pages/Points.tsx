import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const adjustPoints = async (childId: string, adjustment: number, type: 'good' | 'bad') => {
    try {
      const child = children.find(c => c.id === childId);
      if (!child) return;

      const newPoints = Math.max(0, child.weekly_points + adjustment);
      
      await supabase
        .from('children')
        .update({ weekly_points: newPoints })
        .eq('id', childId);

      toast.success(`${type === 'good' ? 'Added' : 'Removed'} ${Math.abs(adjustment)} points!`);
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
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chores
          </Button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold">Points & Rewards</h1>
            <p className="text-muted-foreground">{getCurrentWeek()}</p>
          </div>
          
          <div />
        </div>

        {/* Children Points Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold mb-2">{child.weekly_points}</div>
                  <div className="text-sm text-muted-foreground">Points This Week</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Achievement Level: {child.weekly_points >= 50 ? 'Chore Champion' : 'Getting There'}
                  </div>
                </div>
                
                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    onClick={() => adjustPoints(child.id, 5, 'good')}
                    className="bg-success text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Good Behavior
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => adjustPoints(child.id, -5, 'bad')}
                  >
                    <Minus className="h-4 w-4 mr-1" />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewards.map((reward) => (
                  <div key={reward.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="text-2xl">{reward.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-medium">{reward.title}</h3>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{reward.cost_points} Points</div>
                      <div className="flex gap-1 mt-2">
                        {children.map((child) => (
                          <Button
                            key={child.id}
                            size="sm"
                            disabled={child.weekly_points < reward.cost_points}
                            onClick={() => redeemReward(child.id, reward)}
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
    </div>
  );
}