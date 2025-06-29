import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StagedChanges } from "@/pages/Dashboard";

// Define a type for the chat messages for clarity
interface ChatMessage {
  type: "user" | "ai";
  content: string;
}

export const useAIChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (
      messages: ChatMessage[],
      fmecaData?: any[],
      columns?: string[],
      chatMode: "edit" | "ask" = "edit",
      wantsPreview?: boolean
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const lastUserMessage = messages[messages.length - 1].content;

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

        const { data, error: invokeError } = await supabase.functions.invoke(
          "chat-with-ai",
          {
            body: {
              query: lastUserMessage,
              fmecaData: compressedSample,
              columns,
              chatMode,
            },
          }
        );

        if (invokeError) {
          throw new Error(invokeError.message);
        }

        console.log("Received from Supabase:", data);

        if (!data.response) {
          throw new Error("Received an empty response from the AI.");
        }

        const textResponse = data.response;
        let updatedData = data.updatedData;
        let diff: StagedChanges | null = null;
        let validation = data.validation;

        console.log("Processing AI response:", {
          textResponse,
          hasUpdatedData: !!updatedData,
          updatedDataType: typeof updatedData,
          updatedDataLength: updatedData?.length,
        });

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
      }
    },
    []
  );

  return { sendMessage, isLoading, error };
};
