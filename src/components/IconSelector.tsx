import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface IconSelectorProps {
  selectedIcon: string | string[];
  onIconSelect: (icon: string | string[]) => void;
  compact?: boolean;
  allowMultiple?: boolean;
  allowNoIcon?: boolean;
}

const ICON_CATEGORIES = {
  'Daily Tasks': [
    '🧥', '👕', '👖', '🧦', '👟', '👠', '🎒', '📚', '✏️', '📝',
    '🧽', '🚿', '🪥', '🧴', '🧼', '🛏️', '🧹', '🗑️', '🧺', '👔',
    '🩲', '👗', '🥿', '🩴', '🧢', '🎓', '💼', '📖', '📓', '🖊️',
    '👞', '🛍️'
  ],
  'Food & Drinks': [
    '🍎', '🥕', '🥛', '🍌', '🥪', '🍽️', '🥄', '🍴', '🥤', '🧃',
    '🍇', '🍊', '🥒', '🍞', '🧀', '🥯', '🥨', '🥐', '🍳', '🥣',
    '🍓', '🍑', '🥬', '🥦', '🍅', '🥖', '🧈', '🍯', '🥞', '🧇',
    '🍱'
  ],
  'Hygiene & Health': [
    '🦷', '🪥', '🧼', '🚿', '🛁', '🧴', '💊', '🩹', '🌡️', '💉',
    '🧽', '🪒', '💅', '👶', '🧻', '🪞', '🫧', '🧯', '🩴', '👐',
    '💇', '🪮'
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
    '❤️', '💖', '💝', '🎂', '🍰', '🎈', '🎉', '🎊', '🎁', '💐',
    '🗄️', '🗃️', '📦', '🪄'
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
  'Spiritual & Faith': [
    '🙏', '⛪', '✝️', '🕯️', '📿', '🛐', '☪️', '✡️', '🕊️', '👼',
    '🌅', '🌟', '✨', '💫', '🎵', '📖', '💒', '⛩️', '🧘', '🤲'
  ],
  'Custom Uploads': []
};

// Icon names mapping for display
const ICON_NAMES: Record<string, string> = {
  // Daily Tasks
  '🧥': 'Jacket', '👕': 'Shirt', '👖': 'Pants', '🧦': 'Socks', '👟': 'Shoes', 
  '👠': 'Dress Shoes', '🎒': 'Backpack', '📚': 'Books', '✏️': 'Pencil', '📝': 'Write',
  '🧽': 'Sponge', '🚿': 'Shower', '🪥': 'Brush Teeth', '🧴': 'Shampoo', '🧼': 'Soap', 
  '🛏️': 'Make Bed', '🧹': 'Sweep', '🗑️': 'Trash', '🧺': 'Laundry', '👔': 'Dress Shirt',
  '👞': 'Store Shoes', '🛍️': 'Shopping',

  // Food & Drinks
  '🍎': 'Apple', '🥕': 'Carrot', '🥛': 'Milk', '🍌': 'Banana', '🥪': 'Sandwich',
  '🍽️': 'Dinner', '🥄': 'Spoon', '🍴': 'Fork', '🥤': 'Drink', '🧃': 'Juice',
  '🍇': 'Grapes', '🍊': 'Orange', '🥒': 'Cucumber', '🍞': 'Bread', '🧀': 'Cheese',
  '🍱': 'Lunchbox',

  // Hygiene & Health
  '🦷': 'Tooth', '🛁': 'Bath', '💊': 'Medicine', '🩹': 'Bandage', '🌡️': 'Temperature',
  '💉': 'Shot', '🪒': 'Shave', '💅': 'Nails', '👶': 'Baby Care', '🧻': 'Tissue',
  '👐': 'Wash Face', '🫧': 'Soap', '💇': 'Comb Hair', '🪮': 'Hair Brush',

  // Home & Family (storage)
  '🗄️': 'Storage Cabinet', '🗃️': 'File Cabinet', '📦': 'Storage Box', '🪄': 'Drawer',

  // School & Learning
  '📖': 'Read', '📓': 'Notebook', '📔': 'Journal', '📒': 'Ledger', '📕': 'Book',
  '📗': 'Green Book', '📘': 'Blue Book', '📙': 'Yellow Book', '📐': 'Ruler', '📏': 'Measure',
  '✂️': 'Scissors', '📎': 'Clip', '📌': 'Pin', '🖇️': 'Clips', '📋': 'Clipboard',

  // Sports & Activities
  '⚽': 'Soccer', '🏀': 'Basketball', '🏈': 'Football', '⚾': 'Baseball', '🎾': 'Tennis',
  '🏐': 'Volleyball', '🏓': 'Ping Pong', '🏸': 'Badminton', '🥅': 'Goal', '🏹': 'Archery',
  '🎯': 'Target', '🏊': 'Swimming', '🚴': 'Biking', '🏃': 'Running', '⛹️': 'Basketball',

  // Entertainment
  '🎮': 'Gaming', '📱': 'Phone', '💻': 'Computer', '📺': 'TV', '🎵': 'Music',
  '🎶': 'Song', '🎤': 'Microphone', '🎧': 'Headphones', '📻': 'Radio', '🎬': 'Movie',

  // Animals
  '🐶': 'Dog', '🐱': 'Cat', '🐭': 'Mouse', '🐹': 'Hamster', '🐰': 'Rabbit',
  '🦊': 'Fox', '🐻': 'Bear', '🐼': 'Panda', '🐨': 'Koala', '🐯': 'Tiger',

  // Emotions
  '😀': 'Happy', '😃': 'Smile', '😄': 'Laugh', '😁': 'Grin', '😆': 'Joy',
  '😅': 'Sweat', '😂': 'Tears', '🤣': 'Rolling', '😊': 'Blush', '😇': 'Angel',

  // Rewards & Achievements  
  '🏆': 'Trophy', '🥇': 'Gold Medal', '🥈': 'Silver Medal', '🥉': 'Bronze Medal', '🎖️': 'Medal',
  '🏅': 'Sports Medal', '⭐': 'Star', '🌟': 'Glowing Star', '✨': 'Sparkles', '💎': 'Diamond',
  '👑': 'Crown', '🎗️': 'Ribbon', '🎀': 'Bow', '🎁': 'Gift', '💰': 'Money',

  // Spiritual & Faith
  '🙏': 'Prayer', '⛪': 'Church', '✝️': 'Cross', '🕯️': 'Candle', '📿': 'Prayer Beads',
  '🛐': 'Worship', '☪️': 'Star and Crescent', '✡️': 'Star of David', '🕊️': 'Dove', '👼': 'Angel',
  '💒': 'Wedding Chapel', '⛩️': 'Shrine', '🧘': 'Meditation', '🤲': 'Palms Together'
};

// Helper function to get icon name
const getIconName = (icon: string): string => {
  if (icon.startsWith('http')) return 'Custom';
  return ICON_NAMES[icon] || 'Icon';
};

const ALL_ICONS_CATEGORY = 'All Icons';

export function IconSelector({ selectedIcon, onIconSelect, compact = false, allowMultiple = false, allowNoIcon = false }: IconSelectorProps) {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(ALL_ICONS_CATEGORY);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadedIcons, setUploadedIcons] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch uploaded icons when component mounts
  useEffect(() => {
    if (user) {
      fetchUploadedIcons();
    }
  }, [user]);

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

  const handleDeleteIcon = async (iconUrl: string) => {
    if (!user) return;

    try {
      // Extract the file path from the URL
      const urlParts = iconUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${user.id}/${fileName}`;

      const { error } = await supabase.storage
        .from('task-icons')
        .remove([filePath]);

      if (error) throw error;

      // Refresh the uploaded icons list
      await fetchUploadedIcons();
      
      // If the deleted icon was currently selected, reset to default
      if (selectedIcon === iconUrl) {
        onIconSelect('🦷');
      }
      
      toast.success('Icon deleted successfully!');
    } catch (error) {
      console.error('Error deleting icon:', error);
      toast.error('Failed to delete icon');
    }
  };

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
      
      // Refresh uploaded icons to include the new one
      await fetchUploadedIcons();
      
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

  // Create keyword mapping for better search
  const getIconsByKeyword = (keyword: string) => {
    const keywordMap: Record<string, string[]> = {
      'teeth': ['🦷', '🪥', '🧼', '🚿'],
      'tooth': ['🦷', '🪥'],
      'brush': ['🪥', '🧹', '🖌️', '🪮'],
      'wash': ['🚿', '🧼', '🧽', '🛁', '👐', '🫧'],
      'face': ['👐', '🧴', '🧼', '🫧'],
      'food': ['🍎', '🥕', '🥛', '🍌', '🥪', '🍽️'],
      'eat': ['🍎', '🥕', '🥛', '🍌', '🥪', '🍽️', '🍴'],
      'drink': ['🥛', '🥤', '🧃', '🫖'],
      'school': ['📚', '📝', '✏️', '📖', '🎒'],
      'homework': ['📚', '📝', '✏️', '📖'],
      'clean': ['🧹', '🗑️', '🧽', '🚮', '🧼'],
      'clothes': ['👕', '👖', '🧦', '👟', '🧥'],
      'jacket': ['🧥', '👔'],
      'shoes': ['👟', '👠', '🥿', '👞'],
      'socks': ['🧦'],
      'backpack': ['🎒'],
      'bag': ['🎒', '👜', '🛍️'],
      'sleep': ['🛏️', '😴', '🌙'],
      'bed': ['🛏️'],
      'play': ['🧸', '🎮', '⚽', '🏀'],
      'game': ['🎮', '🎲', '🧩'],
      'toy': ['🧸', '🪀', '🎲', '🧩'],
      'sport': ['⚽', '🏀', '🎾', '🏈', '🏃'],
      'music': ['🎵', '🎸', '🎹', '🎤'],
      'art': ['🎨', '🖼️', '🖌️', '🖍️'],
      'pet': ['🐕', '🐱', '🐹', '🐰', '🐠'],
      'dog': ['🐕', '🦮'],
      'cat': ['🐱'],
      'car': ['🚗', '🚙', '🏎️'],
      'bike': ['🚲', '🏍️'],
      'house': ['🏠', '🏡'],
      'home': ['🏠', '🏡', '🏘️'],
      'time': ['⏰', '⏱️', '🕐'],
      'clock': ['⏰', '⏱️', '🕐'],
      'book': ['📚', '📖', '📓', '📔'],
      'write': ['📝', '✏️', '🖊️'],
      'read': ['📚', '📖', '👀'],
      'soap': ['🧼', '🫧', '🧴'],
      'hair': ['💇', '🪮'],
      'comb': ['💇', '🪮'],
      'toothbrush': ['🪥'],
      'medicine': ['💊', '🩹', '🌡️'],
      'lunch': ['🍱', '🥪', '🍽️'],
      'lunchbox': ['🍱'],
      'store': ['🛍️', '👞', '🎒'],
      'shopping': ['🛍️', '🎒'],
      'storage': ['🗄️', '🗃️', '📦', '🪄'],
      'cabinet': ['🗄️', '🗃️'],
      'drawer': ['🪄', '🗃️'],
      'box': ['📦', '🗃️'],
      'prayer': ['🙏', '📿', '🛐', '🧘', '🤲'],
      'pray': ['🙏', '📿', '🛐', '🧘', '🤲'],
      'church': ['⛪', '💒', '✝️', '🕯️'],
      'faith': ['🙏', '⛪', '✝️', '🕯️', '📿', '🛐', '🕊️'],
      'worship': ['🛐', '🙏', '⛪', '🧘'],
      'meditation': ['🧘', '🙏', '🕯️'],
      'candle': ['🕯️', '✨'],
      'cross': ['✝️', '⛪'],
      'angel': ['👼', '🕊️', '✨']
    };

    const lowerKeyword = keyword.toLowerCase();
    
    // Direct keyword match
    if (keywordMap[lowerKeyword]) {
      return keywordMap[lowerKeyword];
    }

    // Partial keyword match
    const matchingIcons: string[] = [];
    Object.keys(keywordMap).forEach(key => {
      if (key.includes(lowerKeyword) || lowerKeyword.includes(key)) {
        matchingIcons.push(...keywordMap[key]);
      }
    });

    return [...new Set(matchingIcons)]; // Remove duplicates
  };

  // Get current category icons or search results
  const getCurrentCategoryIcons = () => {
    if (searchTerm) {
      // When searching, look across all categories
      const keywordResults = getIconsByKeyword(searchTerm);
      if (keywordResults.length > 0) {
        return keywordResults;
      }

      // Fallback: search in category names and their icons
      const searchResults: string[] = [];
      Object.entries(ICON_CATEGORIES).forEach(([category, icons]) => {
        if (category !== 'Custom Uploads' && category.toLowerCase().includes(searchTerm.toLowerCase())) {
          searchResults.push(...icons);
        }
      });

      // Also include uploaded icons if searching
      if (uploadedIcons.length > 0) {
        searchResults.push(...uploadedIcons);
      }

      return [...new Set(searchResults)]; // Remove duplicates
    }

    if (selectedCategory === ALL_ICONS_CATEGORY) {
      // Show all icons from all categories except Custom Uploads
      const allIcons: string[] = [];
      Object.entries(ICON_CATEGORIES).forEach(([category, icons]) => {
        if (category !== 'Custom Uploads') {
          allIcons.push(...icons);
        }
      });
      // Remove duplicates and add uploaded icons at the end
      const uniqueIcons = [...new Set(allIcons)];
      return [...uniqueIcons, ...uploadedIcons];
    }

    if (selectedCategory === 'Custom Uploads') {
      return uploadedIcons;
    }
    return ICON_CATEGORIES[selectedCategory as keyof typeof ICON_CATEGORIES] || [];
  };

  const currentIcons = getCurrentCategoryIcons();
  const filteredIcons = currentIcons;

  const handleIconClick = (icon: string) => {
    if (allowMultiple && Array.isArray(selectedIcon)) {
      const isSelected = selectedIcon.includes(icon);
      if (isSelected) {
        onIconSelect(selectedIcon.filter(i => i !== icon));
      } else {
        onIconSelect([...selectedIcon, icon]);
      }
    } else {
      onIconSelect(icon);
    }
  };

  return (
    <div className="space-y-4">
      {/* No Icon Option */}
      {allowNoIcon && (
        <div className="p-2 border rounded-lg">
          <button
            type="button"
            onClick={() => onIconSelect('')}
            className={`w-full p-3 border-2 border-dashed rounded-lg text-sm transition-colors ${
              selectedIcon === '' 
                ? 'border-primary bg-primary/5 text-primary' 
                : 'border-muted-foreground/30 hover:border-muted-foreground/50'
            }`}
          >
            📝 Text Only (No Icon)
          </button>
        </div>
      )}

      {/* Search and Upload Row */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            placeholder="🔍 Search icons (e.g., teeth, food, school...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 shrink-0"
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

      {/* Category Selection - Horizontal Buttons */}
      {!searchTerm && (
        <div className="space-y-2">
          <Label className="text-responsive-sm">Category</Label>
          <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
            <button
              type="button"
              onClick={() => setSelectedCategory(ALL_ICONS_CATEGORY)}
              className={`px-3 py-1.5 rounded-full text-responsive-xs font-medium transition-colors ${
                selectedCategory === ALL_ICONS_CATEGORY
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-accent text-foreground'
              }`}
            >
              {ALL_ICONS_CATEGORY}
            </button>
            {Object.keys(ICON_CATEGORIES).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-full text-responsive-xs font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent text-foreground'
                }`}
              >
                {category}
                {category === 'Custom Uploads' && uploadedIcons.length > 0 && (
                  <span className="ml-1 text-xs opacity-70">({uploadedIcons.length})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results Header */}
      {searchTerm && (
        <div className="text-sm text-muted-foreground">
          {filteredIcons.length > 0 
            ? `Found ${filteredIcons.length} icon${filteredIcons.length !== 1 ? 's' : ''} for "${searchTerm}"`
            : `No icons found for "${searchTerm}"`
          }
        </div>
      )}

      {/* Icons Grid */}
      <div className="border rounded-lg p-2">
        <ScrollArea className={compact ? "h-48 w-full" : "h-60 tablet:h-72 desktop:h-80 w-full"}>
          <div className={`grid ${compact ? 'grid-cols-2 tablet:grid-cols-3 gap-2' : 'grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-3 gap-3'}`}>
            {filteredIcons.map((icon, index) => (
              <div key={`${selectedCategory}-${index}`} className="relative group">
                <div className="flex flex-col items-center">
                   <Button
                     type="button"
                     variant={(Array.isArray(selectedIcon) ? selectedIcon.includes(icon) : selectedIcon === icon) ? 'default' : 'outline'}
                     className={`w-full aspect-square p-2 relative hover:scale-105 transition-transform touch-target ${
                       compact 
                         ? 'h-16 text-3xl mb-1' 
                         : 'h-20 tablet:h-24 desktop:h-28 text-4xl tablet:text-5xl desktop:text-6xl mb-2'
                     }`}
                     onClick={() => handleIconClick(icon)}
                  >
                    {icon.startsWith('http') ? (
                      <img 
                        src={icon} 
                        alt="Custom icon" 
                        className={compact ? "w-12 h-12 object-cover rounded" : "w-16 h-16 tablet:w-20 tablet:h-20 desktop:w-24 desktop:h-24 object-cover rounded"}
                      />
                    ) : (
                      icon
                    )}
                     {(Array.isArray(selectedIcon) ? selectedIcon.includes(icon) : selectedIcon === icon) && (
                       <div className="absolute inset-0 bg-primary/20 rounded flex items-center justify-center">
                         <div className={compact ? "w-3 h-3 bg-primary rounded-full" : "w-4 h-4 tablet:w-5 tablet:h-5 bg-primary rounded-full"}></div>
                       </div>
                     )}
                  </Button>
                  
                  {/* Icon Name */}
                  <span className={`font-medium text-center text-muted-foreground leading-tight max-w-full ${
                    compact ? 'text-xs' : 'text-sm tablet:text-base'
                  }`}>
                    {getIconName(icon)}
                  </span>
                </div>
                
                {/* Delete button for custom uploaded icons */}
                {icon.startsWith('http') && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className={`absolute -top-1 -right-1 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity touch-target ${
                      compact ? 'h-6 w-6' : 'h-7 w-7 tablet:h-8 tablet:w-8'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteIcon(icon);
                    }}
                  >
                    <X className={compact ? "h-3 w-3" : "h-4 w-4 tablet:h-4.5 tablet:w-4.5"} />
                  </Button>
                )}
              </div>
            ))}
            {filteredIcons.length === 0 && (
              <div className="col-span-6 text-center py-8 text-muted-foreground text-sm">
                {searchTerm 
                  ? `No icons found for "${searchTerm}". Try keywords like: teeth, food, school, clothes, play, etc.`
                  : selectedCategory === 'Custom Uploads' 
                    ? "No custom icons uploaded yet. Use the Upload button to add your own images!"
                    : "No icons found in this category."
                }
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}