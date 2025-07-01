/// <reference types="https://deno.land/x/super_deno/mod.ts" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.24.1/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, documentId, chunks, query, userId, limit } = body;

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case "generate_embeddings":
        return await handleGenerateEmbeddings(documentId, supabase);

      case "search_similar":
        return await handleSearchSimilar(query, userId, limit, supabase);

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Error in process-document function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleGenerateEmbeddings(documentId: string, supabase: any) {
  try {
    // Get all chunks for the document without embeddings
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("*")
      .eq("document_id", documentId)
      .is("embedding", null);

    if (chunksError) {
      throw new Error(`Error fetching chunks: ${chunksError.message}`);
    }

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No chunks to process",
          documentId,
          embeddingCount: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Generating embeddings for ${chunks.length} chunks`);

    // Process chunks in batches to avoid rate limits
    const batchSize = 10;
    let totalProcessed = 0;

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

            totalProcessed++;
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

    // TEMPORARY: Skip document status update to test vector search
    // TODO: Fix this once we resolve the schema issue
    console.log("⚠️ Skipping document status update (temporary workaround)");

    const { error: jobUpdateError } = await supabase
      .from("document_processing_jobs")
      .update({ status: "completed" })
      .eq("document_id", documentId);

    if (jobUpdateError) {
      console.error("Error updating job status:", jobUpdateError);
      // Don't throw here, document processing was successful
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        embeddingCount: totalProcessed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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

async function handleSearchSimilar(
  query: string,
  userId: string,
  limit: number = 5,
  supabase: any
) {
  try {
    if (!query || !userId) {
      throw new Error("Query and userId are required for search");
    }

    console.log(
      `Performing vector search for query: "${query}" with userId: ${userId}`
    );

    // Generate embedding for search query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
      encoding_format: "float",
    });

    const embedding = embeddingResponse.data[0].embedding;

    console.log("Embedding details:", {
      modelUsed: "text-embedding-3-small",
      embeddingLength: embedding.length,
      userId: userId,
    });

    // First, let's check if there are any chunks with embeddings for this user
    const { data: allChunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select(
        `
        id, 
        content, 
        user_id,
        document_id,
        embedding,
        documents!inner(id, name, user_id)
      `
      )
      .eq("documents.user_id", userId)
      .not("embedding", "is", null);

    console.log("Debug - Available chunks:", {
      totalChunks: allChunks?.length || 0,
      userId: userId,
      chunksError: chunksError,
    });

    if (allChunks && allChunks.length > 0) {
      console.log("First chunk details:", {
        id: allChunks[0].id,
        hasEmbedding: !!allChunks[0].embedding,
        embeddingLength: allChunks[0].embedding?.length,
        contentPreview: allChunks[0].content?.substring(0, 100),
        documentName: allChunks[0].documents?.name,
      });
    }

    // Query for document chunks with similar embeddings (lowered threshold for debugging)
    const { data: results, error } = await supabase.rpc(
      "search_document_chunks",
      {
        query_embedding: embedding,
        match_threshold: 0.3, // Lowered from 0.7 to 0.3 for debugging
        match_count: limit,
        user_id: userId,
      }
    );

    console.log(`Vector search returned ${results?.length || 0} results`);

    if (error) {
      console.error("Vector search error details:", {
        error: error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(
        `Error performing vector search: ${error.message} (Code: ${error.code})`
      );
    }

    if (results && results.length > 0) {
      console.log(
        "Search results preview:",
        results.map((r) => ({
          content: r.content?.substring(0, 100) + "...",
          similarity: r.similarity,
        }))
      );
    } else {
      console.log("No search results found");
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: results || [],
        debug: {
          query,
          userId,
          limit,
          resultsCount: results?.length || 0,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handleSearchSimilar:", error);
    throw error;
  }
}
