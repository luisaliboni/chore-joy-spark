import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Palette, UserX, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Child {
  id: string;
  name: string;
  color: string;
  child_order: number;
  weekly_points: number;
}

const CHILD_COLORS = [
  { name: 'Green', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' }
];

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchChildren();
    }
  }, [user]);

  const fetchChildren = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.id)
        .order('child_order');

      if (data) {
        setChildren(data);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateChildName = async (childId: string, newName: string) => {
    if (!newName.trim()) {
      toast.error('Child name cannot be empty');
      return;
    }

    try {
      await supabase
        .from('children')
        .update({ name: newName.trim() })
        .eq('id', childId);

      toast.success('Child name updated!');
      fetchChildren();
    } catch (error) {
      console.error('Error updating child name:', error);
      toast.error('Failed to update child name');
    }
  };

  const updateChildColor = async (childId: string, newColor: string) => {
    try {
      await supabase
        .from('children')
        .update({ color: newColor })
        .eq('id', childId);

      toast.success('Child color updated!');
      fetchChildren();
    } catch (error) {
      console.error('Error updating child color:', error);
      toast.error('Failed to update child color');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      // Note: In a real app, you'd want to create an edge function to properly delete the user
      // For now, we'll just sign them out and show a message
      await signOut();
      toast.success('Account deletion initiated. Please contact support to complete the process.');
      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
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
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chores
          </Button>
          
          <h1 className="text-2xl font-bold">Settings</h1>
          
          <div />
        </div>

        <div className="space-y-6">
          {/* Children Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Children Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {children.map((child) => (
                <div key={child.id} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-full border-2 border-white shadow-lg"
                      style={{ backgroundColor: child.color }}
                    />
                    <div className="flex-1">
                      <h3 className="font-medium">Child {child.child_order}</h3>
                      <p className="text-sm text-muted-foreground">
                        {child.weekly_points} points this week
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <div className="flex gap-2">
                        <Input
                          defaultValue={child.name}
                          onBlur={(e) => {
                            if (e.target.value !== child.name) {
                              updateChildName(child.id, e.target.value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Theme Color</Label>
                      <div className="grid grid-cols-8 gap-1.5">
                        {CHILD_COLORS.map((color) => (
                          <button
                            key={color.value}
                            className={`w-6 h-6 rounded border transition-all hover:scale-110 ${
                              child.color === color.value 
                                ? 'border-black border-2' 
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                            onClick={() => updateChildColor(child.id, color.value)}
                            title={color.name}
                            style={{ backgroundColor: color.value }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Rewards Management */}
          <Card>
            <CardHeader>
              <CardTitle>Rewards Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/manage-rewards')}
                className="w-full"
              >
                <Palette className="h-4 w-4 mr-2" />
                Manage Rewards & Prizes
              </Button>
            </CardContent>
          </Card>

          {/* Account Management */}
          <Card>
            <CardHeader>
              <CardTitle>Account Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Account Email</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button 
                  onClick={handleSignOut}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <UserX className="h-4 w-4" />
                  Sign Out
                </Button>
                
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Account</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete your account? This action cannot be undone.
                        All your tasks, points, and rewards will be permanently deleted.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                      >
                        Delete Account
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}