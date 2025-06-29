-- Apply FMECA columns migration manually
-- Run this in your Supabase Dashboard > SQL Editor

-- First, let's check if the table already exists and drop it if needed
DROP TABLE IF EXISTS public.fmeca_columns;

-- Create FMECA columns metadata table
CREATE TABLE public.fmeca_columns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.fmeca_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  column_name TEXT NOT NULL,
  column_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add unique constraints
ALTER TABLE public.fmeca_columns ADD CONSTRAINT unique_project_column_name UNIQUE(project_id, column_name);
ALTER TABLE public.fmeca_columns ADD CONSTRAINT unique_project_column_order UNIQUE(project_id, column_order);

-- Enable Row Level Security
ALTER TABLE public.fmeca_columns ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY fmeca_columns_select_policy ON public.fmeca_columns 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY fmeca_columns_insert_policy ON public.fmeca_columns 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY fmeca_columns_update_policy ON public.fmeca_columns 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY fmeca_columns_delete_policy ON public.fmeca_columns 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_fmeca_columns_project_id ON public.fmeca_columns(project_id);
CREATE INDEX idx_fmeca_columns_user_id ON public.fmeca_columns(user_id); 