import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StagedChanges } from "@/pages/Dashboard";
import { performVectorSearch } from "@/services/documentProcessingService";
import { useAuth } from "@/contexts/AuthContext";

// Define a type for the chat messages for clarity
interface ChatMessage {
  type: "user" | "ai" | "system";
  content: string;
  timestamp: Date;
}

// Define loading steps for better user experience
export type LoadingStep =
  | "searching"
  | "analyzing"
  | "processing"
  | "calculating"
  | "finalizing";

export const useAIChat = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");

  const sendMessage = useCallback(
    async (
      messages: ChatMessage[],
      fmecaData?: any[],
      columns?: string[],
      chatMode: "edit" | "ask" = "edit",
      wantsPreview?: boolean
    ) => {
      setIsLoading(true);
      setLoadingStep("searching");
      setError(null);

      try {
        const systemSummaryMessage = summary
          ? [
              {
                id: "summary",
                type: "system" as const,
                content: `Conversation summary so far:\n${summary}`,
                timestamp: new Date(),
              },
            ]
          : [];

        const messagesWithSummary = [...systemSummaryMessage, ...messages];

        const lastUserMessage = messages[messages.length - 1].content;

        // Perform vector search for document context in both ask and edit modes
        let documentContext: any[] = [];
        if (user?.id) {
          try {
            console.log("Performing vector search for query:", lastUserMessage);
            console.log("User ID:", user.id);
            console.log("Chat mode:", chatMode);
            documentContext = await performVectorSearch(
              lastUserMessage,
              user.id,
              5
            );
            console.log("Vector search results:", documentContext);
            console.log(
              "Document context length:",
              documentContext?.length || 0
            );
            if (documentContext && documentContext.length > 0) {
              console.log("First result:", documentContext[0]);
            }
          } catch (vectorError) {
            console.error("Vector search failed:", vectorError);
            console.error(
              "Error details:",
              JSON.stringify(vectorError, null, 2)
            );
            // Continue without document context if vector search fails
          }
        } else {
          console.log("Skipping vector search - user ID:", user?.id);
        }

        setLoadingStep("analyzing");

        // Optimize FMECA data sample for faster processing
        const getFmecaDataSample = () => {
          if (!fmecaData || fmecaData.length === 0) {
            return undefined;
          }

          // In edit mode, send all data to ensure complete dataset is returned
          if (chatMode === "edit") {
            return fmecaData;
          }

          // In ask mode, send sample for faster processing
          // For small datasets, send only first few rows as context
          if (fmecaData.length <= 10) {
            return fmecaData.slice(0, 5);
          }

          // For larger datasets, send strategic sample
          return [...fmecaData.slice(0, 3), ...fmecaData.slice(-2)];
        };
        const fmecaDataSample = getFmecaDataSample();

        // Compress data by removing verbose fields that aren't essential for AI understanding
        const compressDataForAI = (data: any[]) => {
          if (!data) return data;

          return data.map((row) => {
            // For edit mode, preserve all fields to avoid data loss
            if (chatMode === "edit") {
              return row; // Send complete data in edit mode
            }

            // Only compress for ask mode - remove long descriptive fields
            const {
              "Causes of Damage Mechanisms": _causes,
              "Damage Mechanisms": _damage,
              "Final Failure Mode": _final,
              "Downtime Reason": _downtime,
              "Safety Reason": _safety,
              "Environmental Reason": _env,
              "Community Reason": _community,
              "Reputation Reason": _reputation,
              "Legal Reason": _legal,
              ...essentialFields
            } = row;

            return essentialFields;
          });
        };

        const compressedSample = compressDataForAI(fmecaDataSample);

        console.log("Sending to Supabase function:", {
          lastUserMessage,
          fmecaDataSample: compressedSample,
          columns,
          chatMode,
        });

        setLoadingStep("processing");

        const { data, error: invokeError } = await supabase.functions.invoke(
          "chat-with-ai",
          {
            body: {
              query: lastUserMessage,
              fmecaData: compressedSample,
              columns,
              chatMode,
              documentContext,
            },
          }
        );

        // Improved error handling: if invokeError but data.response exists, return the response
        if (invokeError) {
          // Try to extract a response message from multiple possible locations
          let aiResponse = null;
          if (data && data.response) {
            aiResponse = data.response;
          } else if (invokeError.response) {
            try {
              const parsed =
                typeof invokeError.response === "string"
                  ? JSON.parse(invokeError.response)
                  : invokeError.response;
              if (parsed && parsed.response) aiResponse = parsed.response;
            } catch {}
          } else if (invokeError.body) {
            try {
              const parsed =
                typeof invokeError.body === "string"
                  ? JSON.parse(invokeError.body)
                  : invokeError.body;
              if (parsed && parsed.response) aiResponse = parsed.response;
            } catch {}
          } else if (invokeError.message) {
            try {
              const parsed =
                typeof invokeError.message === "string"
                  ? JSON.parse(invokeError.message)
                  : null;
              if (parsed && parsed.response) aiResponse = parsed.response;
            } catch {}
          }
          if (aiResponse) {
            // Log for debugging
            console.warn(
              "Supabase Edge Function returned error status but provided response:",
              aiResponse
            );
            setSummary((prev) =>
              summariseConversation(prev, lastUserMessage, aiResponse)
            );
            return {
              response: aiResponse,
              updatedData: data?.updatedData,
              diff: null,
              validation: data?.validation,
            };
          }
          throw new Error(invokeError.message);
        }

        console.log("Received from Supabase:", data);

        if (!data.response) {
          throw new Error("Received an empty response from the AI.");
        }

        // Only show calculating/finalizing steps for edit mode
        if (chatMode === "edit") {
          setLoadingStep("calculating");
        }

        const textResponse = data.response;
        let updatedData = data.updatedData;
        let newRows = data.newRows;
        let diff: StagedChanges | null = null;
        let validation = data.validation;

        console.log("Processing AI response:", {
          textResponse,
          hasUpdatedData: !!updatedData,
          hasNewRows: !!newRows,
          updatedDataType: typeof updatedData,
          updatedDataLength: updatedData?.length,
          newRowsLength: newRows?.length,
        });

        // Handle newRows format for add operations
        if (
          chatMode === "edit" &&
          newRows &&
          Array.isArray(newRows) &&
          newRows.length > 0
        ) {
          console.log("Processing newRows for add operation...");
          // For add operations, combine existing data with new rows
          updatedData = [...(fmecaData || []), ...newRows];
          console.log("Combined data length:", updatedData.length);
        }

        // Calculate diff only if in edit mode and data is returned
        if (chatMode === "edit" && updatedData) {
          console.log("Calculating diff...");
          console.log("Original data length:", fmecaData?.length || 0);
          console.log("Updated data length:", updatedData.length);

          const originalRows = fmecaData || [];

          // Create efficient lookup maps using row identifiers (avoid JSON.stringify)
          const createRowKey = (row: any) =>
            `${row["Asset Type"] || ""}-${row["Component"] || ""}-${
              row["FLOC"] || ""
            }`;

          const originalRowMap = new Map();
          originalRows.forEach((row, index) => {
            originalRowMap.set(createRowKey(row), { row, index });
          });

          const updatedRowMap = new Map();
          updatedData.forEach((row: any, index: number) => {
            updatedRowMap.set(createRowKey(row), { row, index });
          });

          // Find added rows (in updated but not in original)
          const added = updatedData.filter(
            (row: any) => !originalRowMap.has(createRowKey(row))
          );

          // Find deleted rows (in original but not in updated)
          const deleted = originalRows.filter(
            (row) => !updatedRowMap.has(createRowKey(row))
          );

          const modified: StagedChanges["modified"] = [];

          // Check for modifications in existing rows
          originalRows.forEach((originalRow) => {
            const rowKey = createRowKey(originalRow);
            const updatedRowData = updatedRowMap.get(rowKey);

            if (updatedRowData) {
              const updatedRow = updatedRowData.row;
              const updatedIndex = updatedRowData.index;

              // Compare each column for changes
              columns?.forEach((columnId) => {
                const oldValue = originalRow[columnId];
                const newValue = updatedRow[columnId];

                // Only consider it modified if values actually changed (handle undefined/null/empty)
                if (
                  oldValue !== newValue &&
                  !(
                    (!oldValue || oldValue === "") &&
                    (!newValue || newValue === "")
                  )
                ) {
                  modified.push({
                    rowIndex: updatedIndex,
                    columnId,
                    oldValue,
                    newValue,
                  });
                }
              });
            }
          });

          console.log("Diff calculated:", {
            added: added.length,
            deleted: deleted.length,
            modified: modified.length,
          });

          diff = { added, modified, deleted };
        } else {
          // In 'ask' mode, ensure we don't return data modifications
          updatedData = undefined;
        }

        // Final step only for edit mode
        if (chatMode === "edit") {
          setLoadingStep("finalizing");
        }

        // After getting data, update summary
        setSummary((prev) =>
          summariseConversation(prev, lastUserMessage, textResponse)
        );

        // Always return the response message, even if no data changes
        return {
          response: textResponse,
          updatedData,
          diff,
          validation,
        };
      } catch (e: any) {
        console.error("Error sending message to AI:", e);
        setError(
          e.message ||
            "An unknown error occurred while communicating with the AI."
        );
        // Return a structured error response
        return {
          response: "Sorry, I ran into an error. " + (e.message || ""),
          updatedData: undefined,
          diff: null,
          validation: undefined,
        };
      } finally {
        setIsLoading(false);
        setLoadingStep(null);
      }
    },
    []
  );

  return { sendMessage, isLoading, loadingStep, error };
};

// Simple summariser: keep first 1000 chars, add latest message snippets
const summariseConversation = (
  currentSummary: string,
  userMsg: string,
  assistantMsg: string
): string => {
  const newPart = `User: ${userMsg}\nAssistant: ${assistantMsg}`;
  const combined = currentSummary ? currentSummary + "\n" + newPart : newPart;
  return combined.length > 1000 ? combined.slice(-1000) : combined;
};
