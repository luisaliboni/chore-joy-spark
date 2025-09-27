-- Create storage bucket for task icons
INSERT INTO storage.buckets (id, name, public) VALUES ('task-icons', 'task-icons', true);

-- Create RLS policies for task icons
CREATE POLICY "Users can view task icons" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'task-icons');

CREATE POLICY "Users can upload their own task icons" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'task-icons' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own task icons" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'task-icons' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own task icons" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'task-icons' AND auth.uid()::text = (storage.foldername(name))[1]);