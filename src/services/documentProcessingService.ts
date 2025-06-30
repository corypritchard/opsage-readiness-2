import { supabase } from "@/integrations/supabase/client";
import { OpenAI } from "openai";
import { chunk as chunkText } from "./chunking";

/**
 * Document Processing Service
 * Handles document uploads, chunking, and embedding generation
 */

// Create a new OpenAI instance
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Note: In production, API calls should go through Supabase Edge Functions
});

// Constants
const MAX_CHUNK_SIZE = 500; // Characters per chunk
const CHUNK_OVERLAP = 100; // Character overlap between chunks
const MAX_TOKENS_PER_CHUNK = 250; // Maximum tokens per chunk

// Interfaces
interface DocumentUploadParams {
  file: File;
  fileName: string;
  description?: string;
  projectId: string;
  assetId?: string;
  userId: string;
  metadata?: Record<string, any>;
}

interface ChunkingParams {
  documentId: string;
  content: string;
  chunkSize?: number;
  chunkOverlap?: number;
  metadata?: Record<string, any>;
}

interface GenerateEmbeddingsParams {
  documentId: string;
}

/**
 * Uploads a document to Supabase Storage and creates the document record
 */
export async function uploadDocument({
  file,
  fileName,
  description,
  projectId,
  assetId,
  userId,
  metadata,
}: DocumentUploadParams) {
  try {
    // Generate a unique file path
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const filePath = `uploads/${projectId}/${timestamp}_${file.name}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Error uploading file: ${uploadError.message}`);
    }

    // Insert document record
    const { data: documentData, error: documentError } = await supabase
      .from("documents")
      .insert({
        name: fileName || file.name,
        description,
        file_path: filePath,
        file_type: fileExtension || "unknown",
        file_size: file.size,
        metadata,
        project_id: projectId,
        asset_id: assetId,
        user_id: userId,
        content_type: file.type,
      })
      .select()
      .single();

    if (documentError) {
      throw new Error(
        `Error creating document record: ${documentError.message}`
      );
    }

    // Create a processing job
    const { error: jobError } = await supabase
      .from("document_processing_jobs")
      .insert({
        document_id: documentData.id,
        status: "pending",
      });

    if (jobError) {
      throw new Error(`Error creating processing job: ${jobError.message}`);
    }

    return documentData;
  } catch (error) {
    console.error("Error in uploadDocument:", error);
    throw error;
  }
}

/**
 * Process a text document into chunks and store them
 */
export async function chunkDocument({
  documentId,
  content,
  chunkSize = MAX_CHUNK_SIZE,
  chunkOverlap = CHUNK_OVERLAP,
  metadata = {},
}: ChunkingParams) {
  try {
    // Update document processing status
    await supabase
      .from("document_processing_jobs")
      .update({ status: "processing" })
      .eq("document_id", documentId);

    // Get document info
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (documentError) {
      throw new Error(`Error getting document: ${documentError.message}`);
    }

    // Chunk the content
    const chunks = chunkText(content, chunkSize, chunkOverlap);

    // Insert chunks into database
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Approximate token count (rough estimate: 4 chars ~= 1 token)
      const tokenCount = Math.ceil(chunk.length / 4);

      const { error } = await supabase.from("document_chunks").insert({
        document_id: documentId,
        chunk_index: i,
        content: chunk,
        tokens: tokenCount,
        metadata: {
          ...metadata,
          fileType: document.file_type,
          chunkNumber: i + 1,
          totalChunks: chunks.length,
        },
      });

      if (error) {
        throw new Error(`Error inserting chunk ${i}: ${error.message}`);
      }
    }

    // Update document status
    await supabase
      .from("documents")
      .update({ status: "chunked" })
      .eq("id", documentId);

    return { documentId, chunkCount: chunks.length };
  } catch (error) {
    // Update job status to error
    await supabase
      .from("document_processing_jobs")
      .update({
        status: "error",
        error: error.message,
      })
      .eq("document_id", documentId);

    console.error("Error in chunkDocument:", error);
    throw error;
  }
}

/**
 * Generate embeddings for document chunks using OpenAI
 */
export async function generateEmbeddings({
  documentId,
}: GenerateEmbeddingsParams) {
  try {
    // Get all chunks for the document without embeddings
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("*")
      .eq("document_id", documentId)
      .is("embedding", null);

    if (chunksError) {
      throw new Error(`Error getting chunks: ${chunksError.message}`);
    }

    if (!chunks || chunks.length === 0) {
      console.log("No chunks found or all chunks already have embeddings");
      return { documentId, embeddingCount: 0 };
    }

    console.log(`Generating embeddings for ${chunks.length} chunks`);

    // Process chunks in batches to avoid rate limits (optional)
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);

      // Process a batch of chunks
      await Promise.all(
        batchChunks.map(async (chunk) => {
          try {
            // Generate embedding with OpenAI API
            const embeddingResponse = await openai.embeddings.create({
              model: "text-embedding-3-small",
              input: chunk.content,
              encoding_format: "float",
            });

            const embedding = embeddingResponse.data[0].embedding;

            // Update chunk with embedding
            const { error: updateError } = await supabase
              .from("document_chunks")
              .update({ embedding })
              .eq("id", chunk.id);

            if (updateError) {
              throw new Error(
                `Error updating chunk ${chunk.id} with embedding: ${updateError.message}`
              );
            }
          } catch (error) {
            console.error(
              `Error generating embedding for chunk ${chunk.id}:`,
              error
            );
            throw error;
          }
        })
      );
    }

    // Update document and job status
    await Promise.all([
      supabase
        .from("documents")
        .update({ status: "processed" })
        .eq("id", documentId),
      supabase
        .from("document_processing_jobs")
        .update({ status: "completed" })
        .eq("document_id", documentId),
    ]);

    return { documentId, embeddingCount: chunks.length };
  } catch (error) {
    // Update job status to error
    await supabase
      .from("document_processing_jobs")
      .update({
        status: "error",
        error: error.message,
      })
      .eq("document_id", documentId);

    console.error("Error in generateEmbeddings:", error);
    throw error;
  }
}

/**
 * Search for similar content using vector similarity
 */
export async function performVectorSearch(
  query: string,
  projectId: string,
  limit = 5
) {
  try {
    // Generate embedding for search query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
      encoding_format: "float",
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Query for document chunks with similar embeddings
    const { data: results, error } = await supabase.rpc("vector_search", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: limit,
      project_filter: projectId,
    });

    if (error) {
      throw new Error(`Error performing vector search: ${error.message}`);
    }

    return results;
  } catch (error) {
    console.error("Error in performVectorSearch:", error);
    throw error;
  }
}

/**
 * Process a document end-to-end: upload, chunk, and generate embeddings
 */
export async function processDocument(
  params: DocumentUploadParams,
  textContent: string
) {
  try {
    // Step 1: Upload document to storage and create document record
    const document = await uploadDocument(params);

    // Step 2: Chunk the document content
    await chunkDocument({
      documentId: document.id,
      content: textContent,
      metadata: params.metadata,
    });

    // Step 3: Generate embeddings
    await generateEmbeddings({ documentId: document.id });

    return document;
  } catch (error) {
    console.error("Error in processDocument:", error);
    throw error;
  }
}

/**
 * Get document by ID with processing status
 */
export async function getDocument(documentId: string) {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select(
        `
        *,
        document_processing_jobs (
          status,
          error,
          created_at,
          updated_at
        )
      `
      )
      .eq("id", documentId)
      .single();

    if (error) {
      throw new Error(`Error getting document: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error in getDocument:", error);
    throw error;
  }
}

/**
 * Get all documents for a project
 */
export async function getProjectDocuments(projectId: string) {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select(
        `
        *,
        document_processing_jobs (
          status,
          error,
          created_at,
          updated_at
        )
      `
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Error getting project documents: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error in getProjectDocuments:", error);
    throw error;
  }
}
