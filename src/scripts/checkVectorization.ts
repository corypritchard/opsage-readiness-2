import { supabase } from "@/integrations/supabase/client";

/**
 * Check vectorization status for a document by filename
 */
async function checkVectorizationStatus(fileName: string) {
  console.log(`Checking vectorization status for "${fileName}"...`);

  try {
    // Check if document exists in the documents table
    const { data: documents, error: docError } = await supabase
      .from("documents")
      .select("*")
      .ilike("name", `%${fileName}%`);

    if (docError) {
      throw new Error(`Error querying documents: ${docError.message}`);
    }

    if (!documents || documents.length === 0) {
      console.log(`No document found with name containing "${fileName}"`);
      return;
    }

    console.log(`Found ${documents.length} matching documents:`);

    // For each matching document, check its processing status and chunks
    for (const doc of documents) {
      console.log(`\n--- Document: ${doc.name} (ID: ${doc.id}) ---`);
      console.log(`Status: ${doc.status}`);
      console.log(`Created: ${new Date(doc.created_at).toLocaleString()}`);

      // Check processing job status
      const { data: jobs, error: jobError } = await supabase
        .from("document_processing_jobs")
        .select("*")
        .eq("document_id", doc.id);

      if (jobError) {
        console.log(`Error fetching processing job: ${jobError.message}`);
      } else if (jobs && jobs.length > 0) {
        console.log(`Processing Job Status: ${jobs[0].status}`);
        if (jobs[0].error) {
          console.log(`Processing Error: ${jobs[0].error}`);
        }
      } else {
        console.log(`No processing job found for this document`);
      }

      // Check chunks and embeddings
      const { data: chunks, error: chunkError } = await supabase
        .from("document_chunks")
        .select("*")
        .eq("document_id", doc.id);

      if (chunkError) {
        console.log(`Error fetching chunks: ${chunkError.message}`);
      } else {
        const totalChunks = chunks ? chunks.length : 0;
        const chunksWithEmbeddings = chunks
          ? chunks.filter((c) => c.embedding !== null).length
          : 0;

        console.log(
          `Chunks: ${totalChunks} total, ${chunksWithEmbeddings} with embeddings`
        );

        if (totalChunks > 0 && totalChunks === chunksWithEmbeddings) {
          console.log("✅ Document is fully vectorized");
        } else if (chunksWithEmbeddings > 0) {
          console.log("⚠️ Document is partially vectorized");
        } else {
          console.log("❌ Document is not vectorized");
        }

        // Sample the first chunk content and metadata
        if (chunks && chunks.length > 0) {
          console.log("\nSample chunk:");
          console.log(
            `  Content (first 100 chars): ${chunks[0].content.substring(
              0,
              100
            )}...`
          );
          console.log(`  Tokens: ${chunks[0].tokens}`);
          console.log(`  Metadata: ${JSON.stringify(chunks[0].metadata)}`);
          console.log(`  Embedding exists: ${chunks[0].embedding !== null}`);

          if (chunks[0].embedding) {
            const vectorSummary =
              typeof chunks[0].embedding === "string"
                ? "Stored as string"
                : `Array of ${chunks[0].embedding.length} dimensions`;
            console.log(`  Embedding: ${vectorSummary}`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error checking vectorization status:", error);
  }
}

// Check for our sample document
const fileName = "warman-pump-maintenance-manual.pdf";
checkVectorizationStatus(fileName).catch(console.error);

export async function checkVectorizationData() {
  console.log("\n=== CHECKING DOCUMENT VECTORIZATION DATA ===\n");

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error(
        "❌ Authentication error:",
        authError?.message || "No user"
      );
      return;
    }

    console.log("✅ Authenticated as:", user.email);
    console.log("👤 User ID:", user.id);
    console.log("");

    // Check documents table
    console.log("📄 DOCUMENTS TABLE:");
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (docsError) {
      console.error("❌ Error fetching documents:", docsError.message);
    } else {
      console.log(`📊 Found ${documents?.length || 0} documents`);
      documents?.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.filename}`);
        console.log(`     ID: ${doc.id}`);
        console.log(`     Project: ${doc.project_id || "No project"}`);
        console.log(`     Size: ${doc.file_size} bytes`);
        console.log(`     Type: ${doc.mime_type}`);
        console.log(
          `     Created: ${new Date(doc.created_at).toLocaleString()}`
        );
        console.log("");
      });
    }

    // Check document chunks table
    console.log("🧩 DOCUMENT CHUNKS TABLE:");
    const { data: chunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("document_id, chunk_index, content, embedding")
      .eq("user_id", user.id)
      .order("document_id")
      .order("chunk_index");

    if (chunksError) {
      console.error("❌ Error fetching chunks:", chunksError.message);
    } else {
      console.log(`📊 Found ${chunks?.length || 0} document chunks`);

      // Group by document
      const chunksByDoc =
        chunks?.reduce((acc, chunk) => {
          if (!acc[chunk.document_id]) {
            acc[chunk.document_id] = [];
          }
          acc[chunk.document_id].push(chunk);
          return acc;
        }, {} as Record<string, any[]>) || {};

      Object.entries(chunksByDoc).forEach(([docId, docChunks]) => {
        console.log(`  📄 Document ${docId}:`);
        console.log(`     Chunks: ${docChunks.length}`);
        console.log(
          `     Has embeddings: ${
            docChunks.every((c) => c.embedding) ? "✅" : "❌"
          }`
        );

        // Show first chunk preview
        if (docChunks.length > 0) {
          const firstChunk = docChunks[0];
          const preview = firstChunk.content.substring(0, 100);
          console.log(
            `     Preview: "${preview}${
              firstChunk.content.length > 100 ? "..." : ""
            }"`
          );
          console.log(
            `     Embedding dimensions: ${
              firstChunk.embedding
                ? firstChunk.embedding.length
                : "No embedding"
            }`
          );
        }
        console.log("");
      });
    }

    // Check document processing jobs table
    console.log("⚙️ DOCUMENT PROCESSING JOBS TABLE:");
    const { data: jobs, error: jobsError } = await supabase
      .from("document_processing_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (jobsError) {
      console.error("❌ Error fetching processing jobs:", jobsError.message);
    } else {
      console.log(`📊 Found ${jobs?.length || 0} processing jobs`);
      jobs?.forEach((job, index) => {
        console.log(`  ${index + 1}. Job ${job.id}`);
        console.log(`     Document: ${job.document_id}`);
        console.log(`     Status: ${job.status}`);
        console.log(`     Progress: ${job.progress || 0}%`);
        if (job.error_message) {
          console.log(`     Error: ${job.error_message}`);
        }
        console.log(
          `     Created: ${new Date(job.created_at).toLocaleString()}`
        );
        if (job.completed_at) {
          console.log(
            `     Completed: ${new Date(job.completed_at).toLocaleString()}`
          );
        }
        console.log("");
      });
    }

    // Test vector search if we have data
    if (chunks && chunks.length > 0) {
      console.log("🔍 TESTING VECTOR SEARCH:");
      try {
        const { data: searchResults, error: searchError } = await supabase.rpc(
          "search_document_chunks",
          {
            query_text: "maintenance",
            match_threshold: 0.1,
            match_count: 3,
          }
        );

        if (searchError) {
          console.error("❌ Vector search error:", searchError.message);
        } else {
          console.log(
            `✅ Vector search works! Found ${
              searchResults?.length || 0
            } results`
          );
          searchResults?.forEach((result, index) => {
            console.log(
              `  ${index + 1}. Similarity: ${result.similarity?.toFixed(3)}`
            );
            console.log(
              `     Content: "${result.content.substring(0, 80)}..."`
            );
          });
        }
      } catch (error) {
        console.error("❌ Vector search test failed:", error);
      }
    }

    console.log("\n=== VECTORIZATION CHECK COMPLETE ===\n");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

// Auto-run if called directly
if (typeof window !== "undefined") {
  // Running in browser - add to global for manual execution
  (window as any).checkVectorization = checkVectorizationData;
}
