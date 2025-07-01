-- Create documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for documents bucket
-- Files are stored as: {user_id}/{timestamp}_{filename}
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'documents' AND starts_with(name, auth.uid()::text || '/'));

CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND starts_with(name, auth.uid()::text || '/'));

CREATE POLICY "Users can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND starts_with(name, auth.uid()::text || '/'));

CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND starts_with(name, auth.uid()::text || '/')); 