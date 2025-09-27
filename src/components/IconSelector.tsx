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
  const [selectedCategory, setSelectedCategory] = useState('Daily Tasks');
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
      'brush': ['🪥', '🧹', '🖌️'],
      'wash': ['🚿', '🧼', '🧽', '🛁'],
      'food': ['🍎', '🥕', '🥛', '🍌', '🥪', '🍽️'],
      'eat': ['🍎', '🥕', '🥛', '🍌', '🥪', '🍽️', '🍴'],
      'drink': ['🥛', '🥤', '🧃', '🫖'],
      'school': ['📚', '📝', '✏️', '📖', '🎒'],
      'homework': ['📚', '📝', '✏️', '📖'],
      'clean': ['🧹', '🗑️', '🧽', '🚮', '🧼'],
      'clothes': ['👕', '👖', '🧦', '👟', '🧥'],
      'jacket': ['🧥', '👔'],
      'shoes': ['👟', '👠', '🥿'],
      'socks': ['🧦'],
      'backpack': ['🎒'],
      'bag': ['🎒', '👜'],
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
        if (category.toLowerCase().includes(searchTerm.toLowerCase())) {
          searchResults.push(...icons);
        }
      });

      // Also include uploaded icons if searching
      if (uploadedIcons.length > 0) {
        searchResults.push(...uploadedIcons);
      }

      return [...new Set(searchResults)]; // Remove duplicates
    }

    if (selectedCategory === 'Custom Uploads') {
      return uploadedIcons;
    }
    return ICON_CATEGORIES[selectedCategory as keyof typeof ICON_CATEGORIES] || [];
  };

  const currentIcons = getCurrentCategoryIcons();
  const filteredIcons = currentIcons;

  return (
    <div className="space-y-4">
      {/* Search and Upload Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search icons (e.g., teeth, food, school...)"
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

      {/* Category Selection - Hide when searching */}
      {!searchTerm && (
        <div className="space-y-2">
          <Label htmlFor="category-select">Category</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger id="category-select">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(ICON_CATEGORIES).map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                  {category === 'Custom Uploads' && uploadedIcons.length > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">({uploadedIcons.length})</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      <div className="border rounded-lg p-responsive">
        <ScrollArea className="h-60 tablet:h-72 desktop:h-80 w-full">
          <div className="grid grid-cols-4 tablet:grid-cols-6 desktop:grid-cols-8 gap-2">
            {filteredIcons.map((icon, index) => (
              <div key={`${selectedCategory}-${index}`} className="relative group">
                <Button
                  type="button"
                  variant={selectedIcon === icon ? 'default' : 'outline'}
                  className="aspect-square p-1 h-12 w-12 tablet:h-16 tablet:w-16 desktop:h-20 desktop:w-20 text-lg tablet:text-xl desktop:text-2xl relative hover:scale-105 transition-transform w-full touch-target"
                  onClick={() => onIconSelect(icon)}
                >
                  {icon.startsWith('http') ? (
                    <img 
                      src={icon} 
                      alt="Custom icon" 
                      className="w-8 h-8 tablet:w-12 tablet:h-12 desktop:w-16 desktop:h-16 object-cover rounded"
                    />
                  ) : (
                    icon
                  )}
                  {selectedIcon === icon && (
                    <div className="absolute inset-0 bg-primary/20 rounded flex items-center justify-center">
                      <div className="w-2 h-2 tablet:w-3 tablet:h-3 bg-primary rounded-full"></div>
                    </div>
                  )}
                </Button>
                {/* Delete button for custom uploaded icons */}
                {icon.startsWith('http') && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-1 -right-1 h-5 w-5 tablet:h-6 tablet:w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity touch-target"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteIcon(icon);
                    }}
                  >
                    <X className="h-2 w-2 tablet:h-3 tablet:w-3" />
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