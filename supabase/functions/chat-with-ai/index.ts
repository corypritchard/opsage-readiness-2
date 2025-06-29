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
      documentContext,
      sapIntegration = false,
    } = body;

    if (!query) {
      return new Response("Missing query in request body", { status: 400 });
    }

    const getSystemPrompt = () => {
      const tableSchema = columns
        ? `The table has columns: ${columns.join(", ")}.`
        : "The table schema is unknown.";

      const commonInstructions = `You are Opsage, an engineering assistant for FMECA analysis. ${tableSchema}`;

      if (chatMode === "ask") {
        return `${commonInstructions}
Answer questions about FMECA data in plain text. DO NOT output JSON.`;
      }

      // Optimized edit mode prompt for faster processing
      return `${commonInstructions}
Edit mode: Return JSON with "response" and "updatedData" properties.
- "response": Brief action summary (max 20 words)
- "updatedData": Complete modified dataset array with ALL columns: ${columns?.join(
        ", "
      )}
For additions: Add new rows with appropriate values for all columns. Always return the complete dataset with all original columns filled.`;
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
        // For deletions, send smaller context as we just need to identify rows
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

    // Smart context selection for large datasets
    let compressedData = getSmartContext(query, fmecaData, chatMode);

    const dataContext = JSON.stringify(compressedData);

    // Log OpenAI payload
    const openAiPayload: any = {
      model: isSimpleAddition(query) ? "gpt-3.5-turbo" : "gpt-4o-mini", // Use faster model for simple operations
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `FMECA data (${compressedData.length} rows):\n${dataContext}\n\nRequest: "${query}"`,
        },
      ],
      temperature: 0, // Faster processing with deterministic output
      max_tokens: isSimpleAddition(query) ? 4000 : 6000, // Reduced from 6000/8000
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

        // Additional validation to ensure we have complete data
        if (
          !parsedResponse.updatedData ||
          !Array.isArray(parsedResponse.updatedData)
        ) {
          throw new Error("Response missing or invalid updatedData array");
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
