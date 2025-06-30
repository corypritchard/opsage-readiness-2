-- Create vector similarity search function
CREATE OR REPLACE FUNCTION vector_search(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  project_filter uuid
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  metadata jsonb,
  document_name text,
  document_path text,
  similarity float,
  tokens int
) 
LANGUAGE plpgsql
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    dc.metadata,
    d.name as document_name,
    d.file_path as document_path,
    (dc.embedding <=> query_embedding) as similarity,
    dc.tokens
  from
    document_chunks dc
  join
    documents d on d.id = dc.document_id
  where
    d.project_id = project_filter
    and (dc.embedding <=> query_embedding) < (1 - match_threshold)
  order by
    dc.embedding <=> query_embedding
  limit match_count;
end;
$$; 