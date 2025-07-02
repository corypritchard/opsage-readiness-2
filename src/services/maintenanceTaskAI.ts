import { supabase } from "@/integrations/supabase/client";

/**
 * Generate maintenance tasks using AI based on FMECA data.
 * @param {any[]} fmecaData - The FMECA data rows.
 * @param {string[]} columns - The FMECA column names.
 * @param {string} [customPrompt] - Optional custom prompt for the AI.
 * @returns {Promise<any>} The AI result (updatedData, etc).
 */
export async function generateMaintenanceTasksWithAI(
  fmecaData: any[],
  columns: string[],
  customPrompt?: string
) {
  const prompt =
    customPrompt ||
    "Create a completely new table of maintenance tasks based on the FMECA data. Generate preventive maintenance tasks for each asset/component combination. Each row should be a specific maintenance task with these exact columns: Asset, Component, Task Description, Frequency, Maintenance Type, Failure Mode. Do not copy the original FMECA data - create new maintenance task records. For example, if FMECA shows 'Belt Conveyor - Idlers', create tasks like 'Inspect idler alignment', 'Lubricate idler bearings', etc. Make the frequency realistic (Daily, Weekly, Monthly, Quarterly, Annually) and maintenance type should be Preventive, Predictive, or Corrective.";

  try {
    const { data, error: invokeError } = await supabase.functions.invoke(
      "chat-with-ai",
      {
        body: {
          query: prompt,
          fmecaData,
          columns,
          chatMode: "edit",
          documentContext: [],
        },
      }
    );

    if (invokeError) {
      throw new Error(invokeError.message);
    }

    if (!data.response) {
      throw new Error("Received an empty response from the AI.");
    }

    return {
      response: data.response,
      updatedData: data.updatedData,
    };
  } catch (error) {
    console.error("Error generating maintenance tasks:", error);
    throw error;
  }
}
