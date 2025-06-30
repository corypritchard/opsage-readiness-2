-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  metadata JSONB,
  project_id UUID NOT NULL,
  asset_id UUID, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processed, error
  content_type TEXT, -- text/plain, application/pdf, etc.
  
  -- Add foreign keys
  CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create document chunks table
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  metadata JSONB,
  embedding VECTOR(1536), -- For OpenAI embeddings
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Add foreign key
  CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Add uniqueness constraint for document chunks
  CONSTRAINT unique_document_chunk UNIQUE (document_id, chunk_index)
);

-- Create document processing jobs table
CREATE TABLE IF NOT EXISTS document_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, error
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Add foreign key
  CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Add indexing for faster queries
CREATE INDEX document_chunks_document_id_idx ON document_chunks(document_id);
CREATE INDEX document_processing_jobs_document_id_idx ON document_processing_jobs(document_id);
CREATE INDEX document_processing_jobs_status_idx ON document_processing_jobs(status);
CREATE INDEX documents_project_id_idx ON documents(project_id);
CREATE INDEX documents_asset_id_idx ON documents(asset_id);
CREATE INDEX documents_status_idx ON documents(status);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_documents_timestamp
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_document_chunks_timestamp
BEFORE UPDATE ON document_chunks
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_document_processing_jobs_timestamp
BEFORE UPDATE ON document_processing_jobs
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Create an index on the vector column
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops); 