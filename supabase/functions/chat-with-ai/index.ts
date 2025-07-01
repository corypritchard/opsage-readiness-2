/// <reference types="https://deno.land/x/super_deno/mod.ts" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.24.1/mod.ts";

// Define CORS headers directly inside the function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const openAI = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

// FMECA validation rules
const FMECA_VALIDATION_RULES = {
  severityLevels: ["1", "2", "3", "4", "5"],
  frequencyUnits: ["Hours", "Days", "Weeks", "Months", "Years"],
  requiredFields: [
    "Asset Type",
    "Component",
    "Failure Modes",
    "Effect of Final Failure",
  ],
  assetTypes: [
    "Conveyor",
    "Pump",
    "Motor",
    "Feeder",
    "Crusher",
    "Screen",
    "Compressor",
    "Valve",
    "Tank",
    "Heat Exchanger",
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Function invoked");
    const body = await req.json();
    console.log("Request body:", body);
    const {
      query,
      fmecaData,
      columns,
      chatMode = "edit",
      projectContext,
      documentContext = [],
      sapIntegration = false,
      metadata,
    } = body;

    // Debug logging for document context
    console.log("Chat mode:", chatMode);
    console.log("Document context received:", documentContext);
    console.log("Document context length:", documentContext?.length || 0);
    if (documentContext && documentContext.length > 0) {
      console.log("First document chunk:", documentContext[0]);

      // Log document names to debug grouping
      const docNames = [
        ...new Set(documentContext.map((chunk: any) => chunk.document_name)),
      ];
      console.log("Unique document names:", docNames);
    }

    if (!query) {
      return new Response("Missing query in request body", { status: 400 });
    }

    const getSystemPrompt = () => {
      const tableSchema = columns
        ? `The table has columns: ${columns.join(", ")}.`
        : "The table schema is unknown.";

      const commonInstructions = `You are Opsage, an engineering assistant for FMECA analysis. ${tableSchema}`;

      if (chatMode === "ask") {
        let documentSection = "";
        if (documentContext && documentContext.length > 0) {
          // Group chunks by document name and clean asset context to avoid confusion
          const documentGroups = documentContext.reduce(
            (groups: any, chunk: any) => {
              const docName = chunk.document_name || "Unknown Document";
              if (!groups[docName]) {
                groups[docName] = [];
              }

              // Remove asset context from chunk content to avoid AI confusion
              // Asset context looks like: [Asset: Name | Type: xxx | FLOC: xxx]\n\n
              const cleanContent = chunk.content.replace(
                /^\[Asset:.*?\]\n\n/s,
                ""
              );
              groups[docName].push(cleanContent);
              return groups;
            },
            {}
          );

          // Format grouped content clearly
          const documentContent = Object.entries(documentGroups)
            .map(([docName, chunks]: [string, any]) => {
              // Find the first chunk in the group to get asset metadata
              const firstChunk = documentContext.find(
                (c: any) => c.document_name === docName
              );
              const assetName =
                firstChunk?.metadata?.assetName || "Unknown Asset";
              const assetType =
                firstChunk?.metadata?.assetType || "Unknown Type";
              return `Document: ${docName} (Asset: ${assetName} | Type: ${assetType})\n${(
                chunks as string[]
              ).join("\n\n")}`;
            })
            .join("\n\n--- Next Document ---\n\n");

          documentSection = `\n\nRELEVANT DOCUMENTATION:\n${documentContent}\n\nNote: The above content comes from uploaded documents. When referencing information, mention it comes from the relevant document.`;
        }

        return `${commonInstructions}
Answer questions about FMECA data and equipment based on the provided context. Use information from uploaded documents when available.${documentSection}

Provide clear, specific answers in plain text. DO NOT output JSON.`;
      }

      // Optimized edit mode prompt for faster processing
      const isAddOperation =
        query.toLowerCase().includes("add") &&
        (query.toLowerCase().includes("new") ||
          query.toLowerCase().includes("row") ||
          query.toLowerCase().includes("pump") ||
          query.toLowerCase().includes("motor") ||
          query.toLowerCase().includes("failure"));

      const isRemoveOperation =
        (query.toLowerCase().includes("remove") ||
          query.toLowerCase().includes("delete")) &&
        (query.toLowerCase().includes("row") ||
          query.toLowerCase().includes("pump") ||
          query.toLowerCase().includes("motor") ||
          query.toLowerCase().includes("conveyor") ||
          query.toLowerCase().includes("feeder") ||
          query.toLowerCase().includes("elevator"));

      if (isAddOperation) {
        return `${commonInstructions}
Edit mode for ADD operation: Return JSON with "response" and "newRows" properties.
- "response": Brief confirmation of what was added (max 20 words)
- "newRows": Array containing ONLY the new row(s) to be added, with ALL columns: ${columns?.join(
          ", "
        )}
Do NOT return the complete dataset. Only return the new rows that should be added.`;
      } else if (isRemoveOperation) {
        return `${commonInstructions}
Edit mode for REMOVE operation: Return JSON with "response" and "rowsToRemove" properties.
- "response": Brief confirmation of what was removed (max 20 words)
- "rowsToRemove": Array containing the COMPLETE row objects that should be removed, with ALL columns: ${columns?.join(
          ", "
        )}
Do NOT return the complete dataset. Only return the exact rows that should be deleted.`;
      } else {
        return `${commonInstructions}
Edit mode: Return JSON with "response" and "updatedData" properties.
- "response": Brief action summary (max 20 words)
- "updatedData": Complete modified dataset array with ALL columns: ${columns?.join(
          ", "
        )}
For modifications/deletions: Return the complete updated dataset.`;
      }
    };

    const systemPrompt = getSystemPrompt();
    const useJsonMode = chatMode === "edit";

    // Helper function to detect simple addition requests for performance optimization
    function isSimpleAddition(query: string): boolean {
      const lowerQuery = query.toLowerCase();
      return (
        lowerQuery.includes("add") &&
        (lowerQuery.includes("row") ||
          lowerQuery.includes("pump") ||
          lowerQuery.includes("motor"))
      );
    }

    // Smart context selection for large datasets
    function getSmartContext(
      query: string,
      fmecaData: any[],
      chatMode: string
    ): any[] {
      if (!fmecaData || fmecaData.length === 0) return [];

      const lowerQuery = query.toLowerCase();

      // For ask mode, just send a sample
      if (chatMode === "ask") {
        return fmecaData.slice(0, 20);
      }

      // For small datasets, send everything
      if (fmecaData.length <= 10) {
        return fmecaData;
      }

      // Smart context selection based on operation type
      if (lowerQuery.includes("add")) {
        // For additions, send examples of similar equipment + a few random samples
        const equipmentType = extractEquipmentType(query);
        const similarRows = fmecaData
          .filter(
            (row) =>
              row["Asset Type"]?.toLowerCase().includes(equipmentType) ||
              row["Component"]?.toLowerCase().includes(equipmentType)
          )
          .slice(0, 3); // Max 3 similar examples

        const randomSamples = fmecaData.slice(0, 2); // 2 general examples
        return [...new Set([...similarRows, ...randomSamples])]; // Remove duplicates
      }

      if (lowerQuery.includes("update") || lowerQuery.includes("modify")) {
        // For updates, try to find specific rows mentioned
        const targetEquipment = extractEquipmentType(query);
        const relevantRows = fmecaData.filter(
          (row) =>
            row["Asset Type"]?.toLowerCase().includes(targetEquipment) ||
            row["Component"]?.toLowerCase().includes(targetEquipment) ||
            row["FLOC"]?.toLowerCase().includes(targetEquipment)
        );

        return relevantRows.length > 0
          ? relevantRows.slice(0, 10)
          : fmecaData.slice(0, 5);
      }

      if (lowerQuery.includes("remove") || lowerQuery.includes("delete")) {
        // For deletions, send relevant rows that might match the deletion criteria
        const targetEquipment = extractEquipmentType(query);
        if (targetEquipment) {
          const relevantRows = fmecaData.filter(
            (row) =>
              row["Asset Type"]?.toLowerCase().includes(targetEquipment) ||
              row["Component"]?.toLowerCase().includes(targetEquipment) ||
              row["FLOC"]?.toLowerCase().includes(targetEquipment)
          );
          // Send relevant rows + a few examples for context
          return relevantRows.length > 0
            ? [...relevantRows.slice(0, 15), ...fmecaData.slice(0, 3)]
            : fmecaData.slice(0, 10);
        }
        // For general deletions, send smaller context as we just need to identify rows
        return fmecaData.slice(0, 10);
      }

      // Default: send first 10 rows for context
      return fmecaData.slice(0, 10);
    }

    // Extract equipment type from query
    function extractEquipmentType(query: string): string {
      const lowerQuery = query.toLowerCase();
      const equipmentTypes = [
        "pump",
        "motor",
        "conveyor",
        "feeder",
        "elevator",
        "compressor",
        "valve",
        "crusher",
        "screen",
      ];

      for (const type of equipmentTypes) {
        if (lowerQuery.includes(type)) return type;
      }
      return "";
    }

    // Use optimized context if provided, otherwise fall back to smart context
    let compressedData;
    let contextInfo = "";

    if (metadata && metadata.strategy) {
      // Use the pre-optimized context from the client
      compressedData = fmecaData;
      contextInfo = `Context: ${metadata.strategy}. Total dataset: ${metadata.totalRows} rows. `;
    } else {
      // Fallback to local smart context selection
      compressedData = getSmartContext(query, fmecaData, chatMode);
      contextInfo = `Using ${compressedData.length} of ${
        fmecaData?.length || 0
      } rows for context. `;
    }

    const dataContext = JSON.stringify(compressedData);

    // Log OpenAI payload
    const openAiPayload: any = {
      model: "gpt-4o-mini", // Using most cost-effective model with best performance
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `${contextInfo}FMECA data (${compressedData.length} rows):\n${dataContext}\n\nRequest: "${query}"`,
        },
      ],
      temperature: 0, // Faster processing with deterministic output
      max_tokens: 6000, // Optimal for gpt-4o-mini
      stream: false, // Disable streaming for now to focus on core optimizations
    };
    if (useJsonMode) {
      openAiPayload.response_format = { type: "json_object" };
    }

    console.log("Edge Function: Calling OpenAI");
    const completion = await openAI.chat.completions.create(openAiPayload);
    const responseContent = completion.choices[0].message.content;

    console.log("Edge Function: OpenAI response", responseContent);

    if (!responseContent) {
      console.log("Edge Function: Empty response from OpenAI");
      return new Response("Empty response from OpenAI", { status: 500 });
    }

    let finalResponse;
    if (chatMode === "ask") {
      finalResponse = JSON.stringify({ response: responseContent });
    } else {
      // Validate that the response is valid JSON before returning
      try {
        const parsedResponse = JSON.parse(responseContent);

        // Check if this is an add operation (returns newRows) or other operation (returns updatedData)
        const hasNewRows =
          parsedResponse.newRows && Array.isArray(parsedResponse.newRows);
        const hasUpdatedData =
          parsedResponse.updatedData &&
          Array.isArray(parsedResponse.updatedData);

        // Log the parsed response for debugging
        console.log(
          "Parsed AI response:",
          JSON.stringify(parsedResponse, null, 2)
        );

        // Check if this is a remove operation (returns rowsToRemove)
        const hasRowsToRemove =
          parsedResponse.rowsToRemove &&
          Array.isArray(parsedResponse.rowsToRemove);

        // For add operations, we expect newRows
        if (
          query.toLowerCase().includes("add") &&
          query.toLowerCase().includes("new")
        ) {
          if (!hasNewRows) {
            console.log(
              "Add operation detected but no newRows found. Response keys:",
              Object.keys(parsedResponse)
            );
            // If it's an add operation but no newRows, treat as an error for now
            throw new Error(
              "Add operation response missing or invalid newRows array. Response: " +
                JSON.stringify(parsedResponse)
            );
          }
        }
        // For remove operations, we expect rowsToRemove
        else if (
          (query.toLowerCase().includes("remove") ||
            query.toLowerCase().includes("delete")) &&
          (query.toLowerCase().includes("row") ||
            query.toLowerCase().includes("pump") ||
            query.toLowerCase().includes("motor") ||
            query.toLowerCase().includes("conveyor"))
        ) {
          if (!hasRowsToRemove) {
            console.log(
              "Remove operation detected but no rowsToRemove found. Response keys:",
              Object.keys(parsedResponse)
            );
            throw new Error(
              "Remove operation response missing or invalid rowsToRemove array. Response: " +
                JSON.stringify(parsedResponse)
            );
          }
        }
        // For other operations, we expect updatedData or just a response
        else if (!hasUpdatedData && !parsedResponse.response) {
          throw new Error("Response missing valid data or response");
        }

        finalResponse = responseContent;
      } catch (e) {
        console.error("OpenAI returned invalid JSON:", responseContent);
        console.error("JSON parse error:", e.message);

        // Check if response was likely truncated
        const isTruncated =
          responseContent && !responseContent.trim().endsWith("}");

        return new Response(
          JSON.stringify({
            error: isTruncated
              ? "AI response was truncated. Please try a simpler request or reduce the data size."
              : "AI returned invalid JSON. Please try again or rephrase your request.",
            details: e.message,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }
    }

    console.log("Edge Function: Returning response", finalResponse);
    return new Response(finalResponse, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Edge Function: Top-level error", error);
    if (error && error.stack) {
      console.error("Error stack:", error.stack);
    }
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
