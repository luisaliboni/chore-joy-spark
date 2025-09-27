import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface IconSelectorProps {
  selectedIcon: string;
  onIconSelect: (icon: string) => void;
}

const ICON_CATEGORIES = {
  'Daily Tasks': [
    '🧥', '👕', '👖', '🧦', '👟', '👠', '🎒', '📚', '✏️', '📝',
    '🧽', '🚿', '🪥', '🧴', '🧼', '🛏️', '🧹', '🗑️', '🧺', '👔',
    '🩲', '👗', '🥿', '🩴', '🧢', '🎓', '💼', '📖', '📓', '🖊️'
  ],
  'Food & Drinks': [
    '🍎', '🥕', '🥛', '🍌', '🥪', '🍽️', '🥄', '🍴', '🥤', '🧃',
    '🍇', '🍊', '🥒', '🍞', '🧀', '🥯', '🥨', '🥐', '🍳', '🥣',
    '🍓', '🍑', '🥬', '🥦', '🍅', '🥖', '🧈', '🍯', '🥞', '🧇'
  ],
  'Hygiene & Health': [
    '🦷', '🪥', '🧼', '🚿', '🛁', '🧴', '💊', '🩹', '🌡️', '💉',
    '🧽', '🪒', '💅', '👶', '🧻', '🪞', '🧴', '🫧', '🧯', '🩴',
    '🧴', '🪥', '🧼', '🚿', '🛁', '🧴', '💊', '🩹', '🌡️', '💉'
  ],
  'School & Learning': [
    '📚', '📖', '📝', '✏️', '🖊️', '📓', '📔', '📒', '📕', '📗',
    '📘', '📙', '📐', '📏', '✂️', '📎', '📌', '🖇️', '📋', '📁',
    '🎓', '🏫', '🧮', '🔬', '🧪', '🔭', '🌍', '🎨', '🖌️', '🖍️'
  ],
  'Sports & Activities': [
    '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸', '🥅', '🏹',
    '🎯', '🏊', '🚴', '🏃', '⛹️', '🤸', '🧘', '🏋️', '🤾', '🏌️',
    '🎿', '🏂', '⛸️', '🛼', '🛹', '🏇', '🤺', '🥊', '🥋', '🎪'
  ],
  'Entertainment': [
    '🎮', '📱', '💻', '📺', '🎵', '🎶', '🎤', '🎧', '📻', '🎬',
    '🎭', '🎨', '🖼️', '📷', '📹', '🎪', '🎨', '🧩', '🎲', '🃏',
    '🎯', '🎳', '🎰', '🎮', '🕹️', '📱', '💻', '⌚', '📟', '📞'
  ],
  'Animals': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
    '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔',
    '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺'
  ],
  'Toys & Games': [
    '🧸', '🪀', '🎈', '🎁', '🎀', '🎊', '🎉', '⚽', '🏀', '🎯',
    '🎲', '🃏', '🧩', '🪁', '🛴', '🛷', '🎠', '🎡', '🎢', '🎪',
    '🚂', '🚗', '✈️', '🚁', '🚀', '🛸', '⛵', '🚤', '🏰', '🏠'
  ],
  'Emotions': [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'
  ],
  'Nature': [
    '🌱', '🌿', '🍀', '🌳', '🌲', '🌴', '🌵', '🌾', '🌻', '🌺',
    '🌸', '🌼', '🌷', '🥀', '🌹', '💐', '🍄', '🌰', '🍂', '🍁',
    '☀️', '🌙', '⭐', '💫', '✨', '☁️', '⛅', '🌤️', '🌦️', '🌈'
  ],
  'Transportation': [
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
    '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼',
    '✈️', '🛩️', '🛫', '🛬', '🚁', '🚟', '🚠', '🚡', '⛵', '🚤'
  ],
  'Home & Family': [
    '🏠', '🏡', '🏘️', '🏰', '🏛️', '🛏️', '🛋️', '🪑', '🚪', '🪟',
    '👨‍👩‍👧‍👦', '👪', '👶', '👧', '👦', '👩', '👨', '👵', '👴', '💕',
    '❤️', '💖', '💝', '🎂', '🍰', '🎈', '🎉', '🎊', '🎁', '💐'
  ],
  'Time & Weather': [
    '⏰', '⏱️', '⏲️', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖',
    '🌅', '🌄', '🌇', '🌆', '🌃', '🌌', '☀️', '🌤️', '⛅', '🌥️',
    '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌊'
  ],
  'Rewards & Achievements': [
    '🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '⭐', '🌟', '✨', '💎',
    '👑', '🎗️', '🎀', '🎁', '💰', '💵', '💴', '💶', '💷', '🪙',
    '🎊', '🎉', '🎈', '🎂', '🍰', '🍭', '🍬', '🧁', '🎪', '🎭'
  ],
  'Custom Uploads': []
};

export function IconSelector({ selectedIcon, onIconSelect }: IconSelectorProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadedIcons, setUploadedIcons] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2MB');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('task-icons')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('task-icons')
        .getPublicUrl(fileName);

      onIconSelect(publicUrl);
      setUploadedIcons(prev => [...prev, publicUrl]);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filter icons based on search term
  const filteredCategories = Object.entries(ICON_CATEGORIES).reduce((acc, [category, icons]) => {
    if (category === 'Custom Uploads') {
      acc[category] = uploadedIcons;
    } else if (searchTerm) {
      const filtered = icons.filter(icon => 
        category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
    } else {
      acc[category] = icons;
    }
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      <Tabs defaultValue={Object.keys(filteredCategories)[0]} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex w-max">
            {Object.keys(filteredCategories).map((category) => (
              <TabsTrigger key={category} value={category} className="text-sm">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {Object.entries(filteredCategories).map(([category, icons]) => (
          <TabsContent key={category} value={category}>
            <ScrollArea className="h-64 w-full">
              <div className="grid grid-cols-8 gap-2 p-2">
                {icons.map((icon, index) => (
                  <Button
                    key={`${category}-${index}`}
                    type="button"
                    variant={selectedIcon === icon ? 'default' : 'outline'}
                    className="aspect-square p-2 h-12 w-12 text-lg"
                    onClick={() => onIconSelect(icon)}
                  >
                    {icon.startsWith('http') ? (
                      <img 
                        src={icon} 
                        alt="Custom icon" 
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      icon
                    )}
                  </Button>
                ))}
                {icons.length === 0 && category === 'Custom Uploads' && (
                  <div className="col-span-8 text-center py-8 text-muted-foreground">
                    No custom icons uploaded yet. Use the Upload button to add your own images!
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}