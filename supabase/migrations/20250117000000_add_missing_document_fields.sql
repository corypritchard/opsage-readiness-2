-- Add missing fields to the documents table for proper document processing
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.fmeca_projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS asset_id UUID,
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS content_type TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing column names to match expected schema
-- Rename 'type' to 'file_type' if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_type') THEN
        -- Copy type to file_type if file_type doesn't exist
        UPDATE public.documents SET file_type = type WHERE file_type IS NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_size') THEN
        -- Copy size to file_size if file_size doesn't exist
        UPDATE public.documents SET file_size = size WHERE file_size IS NULL;
    END IF;
END
$$;

-- Create index for project_id for better performance
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_asset_id ON public.documents(asset_id);

-- Update RLS policies to include project-based access
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view documents in their projects"
  ON public.documents
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.fmeca_projects 
      WHERE fmeca_projects.id = documents.project_id 
      AND fmeca_projects.user_id = auth.uid()
    ))
  ); 