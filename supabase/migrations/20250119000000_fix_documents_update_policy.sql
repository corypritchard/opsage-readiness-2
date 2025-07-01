-- Fix missing UPDATE policy for documents table
-- The previous migration removed the UPDATE policy but didn't replace it

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update documents in their projects" ON public.documents;

-- Create UPDATE policy that matches the project-based access pattern
CREATE POLICY "Users can update documents in their projects"
  ON public.documents
  FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.fmeca_projects 
      WHERE fmeca_projects.id = documents.project_id 
      AND fmeca_projects.user_id = auth.uid()
    ))
  );

-- Also create INSERT policy for completeness
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
CREATE POLICY "Users can insert documents in their projects"
  ON public.documents
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR 
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.fmeca_projects 
      WHERE fmeca_projects.id = documents.project_id 
      AND fmeca_projects.user_id = auth.uid()
    ))
  );

-- Create DELETE policy for completeness
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;  
CREATE POLICY "Users can delete documents in their projects"
  ON public.documents
  FOR DELETE
  USING (
    auth.uid() = user_id OR 
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.fmeca_projects 
      WHERE fmeca_projects.id = documents.project_id 
      AND fmeca_projects.user_id = auth.uid()
    ))
  ); 