-- Fix vector dimensions for text-embedding-3-small model
-- text-embedding-3-small actually uses 1536 dimensions by default

-- Update the document_chunks table to ensure proper vector dimensions
ALTER TABLE public.document_chunks ALTER COLUMN embedding TYPE VECTOR(1536);

-- Drop the existing function first to avoid conflicts
DROP FUNCTION IF EXISTS search_document_chunks(VECTOR, FLOAT, INT, UUID);

-- Create the search function to handle the correct dimensions
CREATE OR REPLACE FUNCTION search_document_chunks (
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT,
  document_id UUID,
  document_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- If user_id is provided, filter by user
  IF user_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      document_chunks.id,
      document_chunks.content,
      document_chunks.metadata,
      1 - (document_chunks.embedding <=> query_embedding) AS similarity,
      documents.id AS document_id,
      documents.name AS document_name
    FROM
      document_chunks
    JOIN
      documents ON document_chunks.document_id = documents.id
    WHERE
      documents.user_id = search_document_chunks.user_id
      AND document_chunks.embedding IS NOT NULL
      AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY
      document_chunks.embedding <=> query_embedding
    LIMIT match_count;
  ELSE
    -- If no user_id provided, search all (for admin/testing)
    RETURN QUERY
    SELECT
      document_chunks.id,
      document_chunks.content,
      document_chunks.metadata,
      1 - (document_chunks.embedding <=> query_embedding) AS similarity,
      documents.id AS document_id,
      documents.name AS document_name
    FROM
      document_chunks
    JOIN
      documents ON document_chunks.document_id = documents.id
    WHERE
      document_chunks.embedding IS NOT NULL
      AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY
      document_chunks.embedding <=> query_embedding
    LIMIT match_count;
  END IF;
END;
$$; 