import { supabase } from "@/integrations/supabase/client";
import { chunk as chunkText } from "./chunking";
import { getAsset } from "@/integrations/supabase/assets";

/**
 * Document Processing Service
 * Handles document uploads, chunking, and embedding generation
 * Uses Supabase Edge Functions for secure OpenAI API access
 */

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
 * Create asset context string to prepend to document chunks
 * This enables search by asset name, FLOC, tags, etc.
 */
function createAssetContext(asset: any): string {
  if (!asset) return "";

  const contextParts = [];

  // Add asset name
  if (asset.name) {
    contextParts.push(`Asset: ${asset.name}`);
  }

  // Add asset type
  if (asset.type) {
    contextParts.push(`Type: ${asset.type}`);
  }

  // Add FLOC from location field
  if (asset.location) {
    contextParts.push(`FLOC: ${asset.location}`);
  }

  // Extract description and tags from specifications JSON
  if (asset.specifications) {
    if (asset.specifications.description) {
      contextParts.push(`Description: ${asset.specifications.description}`);
    }
    if (asset.specifications.tags) {
      contextParts.push(`Tags: ${asset.specifications.tags}`);
    }
  }

  // Add manufacturer and model if they exist
  if (asset.manufacturer) {
    contextParts.push(`Manufacturer: ${asset.manufacturer}`);
  }
  if (asset.model) {
    contextParts.push(`Model: ${asset.model}`);
  }

  // Add serial number if it exists
  if (asset.serial_number) {
    contextParts.push(`Serial Number: ${asset.serial_number}`);
  }

  // Create the context string
  const contextString = contextParts.join(" | ");
  return contextString ? `[${contextString}]\n\n` : "";
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
    // Generate a unique file path with user ID for security
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const filePath = `${userId}/${timestamp}_${file.name}`;

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
        file_name: file.name,
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
        user_id: userId,
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

    // Get asset information if the document is linked to an asset
    let assetContext = "";
    if (document.asset_id) {
      try {
        console.log(
          `🔗 Fetching asset context for asset ID: ${document.asset_id}`
        );
        const { data: asset } = await getAsset(document.asset_id);
        if (asset) {
          assetContext = createAssetContext(asset);
          console.log(
            `📋 Asset context created: ${assetContext.substring(0, 100)}...`
          );
        }
      } catch (assetError) {
        console.warn(
          `⚠️ Could not fetch asset ${document.asset_id}:`,
          assetError
        );
        // Continue without asset context if asset fetch fails
      }
    }

    // Chunk the content
    const chunks = chunkText(content, chunkSize, chunkOverlap);

    // Insert chunks into database
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Prepend asset context to each chunk for enhanced searchability
      const enhancedContent = assetContext + chunk;

      // Approximate token count (rough estimate: 4 chars ~= 1 token)
      const tokenCount = Math.ceil(enhancedContent.length / 4);

      // Add asset metadata if available
      let assetName = null;
      let assetType = null;
      if (document.asset_id && assetContext) {
        // Try to extract asset name/type from assetContext or fetch asset again if needed
        // But we already fetched asset above if asset_id exists
        const { data: asset } = await getAsset(document.asset_id);
        if (asset) {
          assetName = asset.name || null;
          assetType = asset.type || null;
        }
      }

      const chunkData = {
        document_id: documentId,
        chunk_index: i,
        content: enhancedContent,
        user_id: document.user_id,
        metadata: {
          ...metadata,
          fileType: document.file_type,
          chunkNumber: i + 1,
          totalChunks: chunks.length,
          tokenCount: tokenCount,
          hasAssetContext: !!assetContext, // Flag to indicate asset context inclusion
          assetId: document.asset_id || null, // Store asset ID for reference
          assetName: assetName, // Store asset name for reference
          assetType: assetType, // Store asset type for reference
        },
      };

      const { error } = await supabase
        .from("document_chunks")
        .insert(chunkData);

      if (error) {
        throw new Error(`Error inserting chunk ${i}: ${error.message}`);
      }
    }

    // Update document status
    await supabase
      .from("documents")
      .update({ status: "completed" })
      .eq("id", documentId);

    console.log(
      `✅ Document chunking complete: ${chunks.length} chunks created ${
        assetContext ? "with asset context" : "without asset context"
      }`
    );

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
 * Generate embeddings for document chunks using Supabase Edge Function
 */
export async function generateEmbeddings({
  documentId,
}: GenerateEmbeddingsParams) {
  try {
    console.log(`Starting embedding generation for document ${documentId}`);

    // Call the Supabase Edge Function to generate embeddings
    const { data, error } = await supabase.functions.invoke(
      "process-document",
      {
        body: {
          action: "generate_embeddings",
          documentId: documentId,
        },
      }
    );

    if (error) {
      throw new Error(
        `Error calling process-document function: ${error.message}`
      );
    }

    if (!data?.success) {
      throw new Error(
        `Function returned error: ${data?.error || "Unknown error"}`
      );
    }

    console.log(
      `Successfully generated ${data.embeddingCount} embeddings for document ${documentId}`
    );

    // Update job status to completed
    await supabase
      .from("document_processing_jobs")
      .update({ status: "completed" })
      .eq("document_id", documentId);

    return { documentId, embeddingCount: data.embeddingCount };
  } catch (error) {
    // Update job status to error
    await supabase
      .from("document_processing_jobs")
      .update({
        status: "error",
        error_message: error.message,
      })
      .eq("document_id", documentId);

    console.error("Error in generateEmbeddings:", error);
    throw error;
  }
}

/**
 * Search for similar content using vector similarity via Supabase Edge Function
 */
export async function performVectorSearch(
  query: string,
  userId: string,
  limit = 5
) {
  try {
    // Call the Supabase Edge Function to perform vector search
    const { data, error } = await supabase.functions.invoke(
      "process-document",
      {
        body: {
          action: "search_similar",
          query: query,
          userId: userId,
          limit: limit,
        },
      }
    );

    if (error) {
      throw new Error(
        `Error calling process-document function: ${error.message}`
      );
    }

    if (!data?.success) {
      throw new Error(
        `Function returned error: ${data?.error || "Unknown error"}`
      );
    }

    return data.results || [];
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
