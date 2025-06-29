-- Migration: Add FMECA columns table for preserving column order
-- Description: Store FMECA column names and their order to maintain user's original column sequence

-- Create FMECA columns metadata table
CREATE TABLE public.fmeca_columns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.fmeca_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  column_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure unique column names per project
  UNIQUE(project_id, column_name),
  -- Ensure unique column order per project
  UNIQUE(project_id, column_order)
);

-- Enable Row Level Security
ALTER TABLE public.fmeca_columns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fmeca_columns
CREATE POLICY "Users can view their own FMECA columns" 
  ON public.fmeca_columns 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own FMECA columns" 
  ON public.fmeca_columns 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FMECA columns" 
  ON public.fmeca_columns 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FMECA columns" 
  ON public.fmeca_columns 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_fmeca_columns_project_id ON public.fmeca_columns(project_id);
CREATE INDEX idx_fmeca_columns_user_id ON public.fmeca_columns(user_id); 