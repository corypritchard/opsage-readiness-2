import {
  getFMECAData,
  saveFMECAData,
} from "@/integrations/supabase/maintenance-tasks";
import { supabase } from "@/integrations/supabase/client";

// Types for agent communication
export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  functionCalls?: FunctionCall[];
  thinking?: string[];
}

export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
  reasoning: string;
  result?: any;
}

export interface AgentResponse {
  response: string;
  functionCalls: FunctionCall[];
  dataChanged: boolean;
  thinking: string[];
  updatedData?: any[];
}

// Add after the existing interfaces
export interface ContextStrategy {
  type: "full" | "sample" | "metadata" | "filtered" | "none";
  maxRows?: number;
  filterCriteria?: Record<string, any>;
  includeSchema?: boolean;
}

export interface SmartContextResult {
  data: any[];
  metadata: {
    totalRows: number;
    columns: string[];
    sampleSize: number;
    strategy: string;
  };
}

// FMECA-specific function definitions for OpenAI
const fmecaFunctions = [
  {
    name: "view_fmeca_data",
    description:
      "View and analyze FMECA table data with filtering and search capabilities",
    parameters: {
      type: "object",
      properties: {
        filters: {
          type: "object",
          properties: {
            asset_type: {
              type: "string",
              description:
                "Filter by asset type (e.g., 'Conveyor', 'Elevator')",
            },
            component: {
              type: "string",
              description: "Filter by component name",
            },
            failure_mode: {
              type: "string",
              description: "Filter by failure mode",
            },
            severity_level: {
              type: "string",
              description: "Filter by severity level",
            },
          },
        },
        columns: {
          type: "array",
          items: { type: "string" },
          description: "Specific columns to view (leave empty for all columns)",
        },
        limit: {
          type: "number",
          default: 50,
          description: "Maximum number of rows to return",
        },
        search: {
          type: "string",
          description: "Search term to find across all columns",
        },
      },
    },
  },
  {
    name: "edit_fmeca_cell",
    description: "Edit a specific cell in the FMECA table",
    parameters: {
      type: "object",
      properties: {
        row_identifier: {
          type: "object",
          properties: {
            asset_type: { type: "string" },
            component: { type: "string" },
            floc: { type: "string" },
            row_index: { type: "number" },
          },
          description:
            "Identifier to find the specific row (use asset_type + component or FLOC or row_index)",
        },
        column_name: {
          type: "string",
          description: "Name of the column to edit",
        },
        new_value: {
          type: "string",
          description: "New value for the cell",
        },
        reasoning: {
          type: "string",
          description: "Explanation of why this change is being made",
        },
      },
      required: ["row_identifier", "column_name", "new_value", "reasoning"],
    },
  },
  {
    name: "add_fmeca_row",
    description: "Add a new row to the FMECA table",
    parameters: {
      type: "object",
      properties: {
        row_data: {
          type: "object",
          description: "Complete row data with all required columns",
        },
        reasoning: {
          type: "string",
          description: "Explanation of why this row is being added",
        },
      },
      required: ["row_data", "reasoning"],
    },
  },
  {
    name: "remove_fmeca_row",
    description: "Remove a row from the FMECA table",
    parameters: {
      type: "object",
      properties: {
        row_identifier: {
          type: "object",
          properties: {
            asset_type: { type: "string" },
            component: { type: "string" },
            floc: { type: "string" },
            row_index: { type: "number" },
          },
          description:
            "Identifier to find the specific row to remove (use asset_type + component or FLOC or row_index)",
        },
        reasoning: {
          type: "string",
          description: "Explanation of why this row is being removed",
        },
      },
      required: ["row_identifier", "reasoning"],
    },
  },
  {
    name: "bulk_edit_fmeca",
    description: "Perform bulk edits on multiple rows or columns",
    parameters: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["update_column", "update_rows", "find_and_replace"],
          description: "Type of bulk operation to perform",
        },
        filters: {
          type: "object",
          description: "Filters to select which rows to modify",
        },
        changes: {
          type: "object",
          description: "Changes to apply (column_name: new_value pairs)",
        },
        reasoning: {
          type: "string",
          description: "Explanation of why these bulk changes are being made",
        },
      },
      required: ["operation", "changes", "reasoning"],
    },
  },
  {
    name: "analyze_fmeca_data",
    description: "Analyze FMECA data for patterns, issues, or insights",
    parameters: {
      type: "object",
      properties: {
        analysis_type: {
          type: "string",
          enum: [
            "risk_assessment",
            "completeness_check",
            "consistency_check",
            "trend_analysis",
            "recommendations",
          ],
          description: "Type of analysis to perform",
        },
        focus_areas: {
          type: "array",
          items: { type: "string" },
          description: "Specific areas to focus the analysis on",
        },
      },
      required: ["analysis_type"],
    },
  },
];

// Add this class before the FMECAAgent class
export class ContextOptimizer {
  private static readonly MAX_ROWS_FOR_FULL_CONTEXT = 20;
  private static readonly SAMPLE_SIZE_LARGE_DATASET = 5;

  static analyzeRequest(userMessage: string): ContextStrategy {
    const message = userMessage.toLowerCase();

    // Requests that need no data context
    if (this.isGeneralQuestion(message)) {
      return { type: "none", includeSchema: true };
    }

    // Requests that need specific data filtering
    if (this.needsFilteredData(message)) {
      const filterCriteria = this.extractFilterCriteria(message);
      return {
        type: "filtered",
        filterCriteria,
        maxRows: 10,
        includeSchema: true,
      };
    }

    // Requests that only need examples/samples
    if (this.needsSampleData(message)) {
      return {
        type: "sample",
        maxRows: this.SAMPLE_SIZE_LARGE_DATASET,
        includeSchema: true,
      };
    }

    // Requests that need metadata only
    if (this.needsMetadataOnly(message)) {
      return { type: "metadata", includeSchema: true };
    }

    // Default: use smart sizing
    return { type: "full", maxRows: this.MAX_ROWS_FOR_FULL_CONTEXT };
  }

  static prepareContext(
    data: any[],
    columns: string[],
    strategy: ContextStrategy
  ): SmartContextResult {
    switch (strategy.type) {
      case "none":
        return {
          data: [],
          metadata: {
            totalRows: data.length,
            columns: strategy.includeSchema ? columns : [],
            sampleSize: 0,
            strategy: "none - no data needed",
          },
        };

      case "metadata":
        return {
          data: [],
          metadata: {
            totalRows: data.length,
            columns: columns,
            sampleSize: 0,
            strategy: "metadata only",
          },
        };

      case "sample":
        const sampleData = this.getSampleRows(data, strategy.maxRows || 5);
        return {
          data: sampleData,
          metadata: {
            totalRows: data.length,
            columns: columns,
            sampleSize: sampleData.length,
            strategy: `sample of ${sampleData.length} rows`,
          },
        };

      case "filtered":
        const filteredData = this.filterData(
          data,
          strategy.filterCriteria || {}
        );
        const limitedData = filteredData.slice(0, strategy.maxRows || 10);
        return {
          data: limitedData,
          metadata: {
            totalRows: data.length,
            columns: columns,
            sampleSize: limitedData.length,
            strategy: `filtered to ${limitedData.length} relevant rows`,
          },
        };

      case "full":
      default:
        const maxRows = strategy.maxRows || this.MAX_ROWS_FOR_FULL_CONTEXT;
        const contextData =
          data.length > maxRows ? this.getSampleRows(data, maxRows) : data;
        return {
          data: contextData,
          metadata: {
            totalRows: data.length,
            columns: columns,
            sampleSize: contextData.length,
            strategy:
              data.length > maxRows
                ? `sample due to size (${contextData.length}/${data.length})`
                : "full dataset",
          },
        };
    }
  }

  private static isGeneralQuestion(message: string): boolean {
    const generalPatterns = [
      "what is",
      "how to",
      "explain",
      "help",
      "guide",
      "tutorial",
      "what does",
      "how does",
      "why",
      "difference between",
    ];
    return generalPatterns.some((pattern) => message.includes(pattern));
  }

  private static needsFilteredData(message: string): boolean {
    const filterPatterns = [
      "show me",
      "find",
      "filter",
      "where",
      "with severity",
      "asset type",
      "component",
      "floc",
      "high risk",
      "low risk",
    ];
    return filterPatterns.some((pattern) => message.includes(pattern));
  }

  private static needsSampleData(message: string): boolean {
    const samplePatterns = [
      "add",
      "create",
      "new",
      "insert",
      "example",
      "template",
      "similar to",
    ];
    return samplePatterns.some((pattern) => message.includes(pattern));
  }

  private static needsMetadataOnly(message: string): boolean {
    const metadataPatterns = [
      "how many",
      "count",
      "total",
      "columns",
      "fields",
      "structure",
      "schema",
      "overview",
      "summary",
    ];
    return metadataPatterns.some((pattern) => message.includes(pattern));
  }

  private static extractFilterCriteria(message: string): Record<string, any> {
    const criteria: Record<string, any> = {};

    // Extract asset type
    const assetMatch = message.match(
      /(?:asset type|asset)\s+(?:is\s+)?([a-zA-Z]+)/i
    );
    if (assetMatch) {
      criteria["Asset Type"] = assetMatch[1];
    }

    // Extract severity level
    const severityMatch = message.match(/severity\s+(?:level\s+)?(\d+)/i);
    if (severityMatch) {
      criteria["Overall Severity Level"] = severityMatch[1];
    }

    // Extract component
    const componentMatch = message.match(
      /component\s+(?:is\s+)?([a-zA-Z\s]+)/i
    );
    if (componentMatch) {
      criteria["Component"] = componentMatch[1].trim();
    }

    return criteria;
  }

  private static getSampleRows(data: any[], maxRows: number): any[] {
    if (data.length <= maxRows) return data;

    // Get a diverse sample by taking rows from different parts of the dataset
    const step = Math.floor(data.length / maxRows);
    const sample: any[] = [];

    for (let i = 0; i < maxRows && i * step < data.length; i++) {
      sample.push(data[i * step]);
    }

    return sample;
  }

  private static filterData(data: any[], criteria: Record<string, any>): any[] {
    return data.filter((row) => {
      return Object.entries(criteria).every(([key, value]) => {
        const rowValue = row[key];
        if (!rowValue) return false;
        return String(rowValue)
          .toLowerCase()
          .includes(String(value).toLowerCase());
      });
    });
  }
}

export class FMECAAgent {
  private projectId: string;
  private thinking: string[] = [];

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  private addThinking(thought: string) {
    this.thinking.push(thought);
    console.log(`🤔 ${thought}`);
  }

  private async callSupabaseFunction(
    userMessage: string,
    currentData: any[],
    columns: string[],
    metadata?: any
  ): Promise<{
    response: string;
    updatedData?: any[];
    newRows?: any[];
    rowsToRemove?: any[];
  }> {
    this.addThinking("Calling Supabase OpenAI function...");

    const { data, error } = await supabase.functions.invoke("chat-with-ai", {
      body: {
        query: userMessage,
        fmecaData: currentData,
        columns: columns,
        chatMode: "edit", // Use edit mode for data modifications
        projectContext: this.projectId,
        metadata: metadata,
      },
    });

    if (error) {
      throw new Error(`Supabase function error: ${error.message}`);
    }

    if (!data || !data.response) {
      throw new Error("Invalid response from AI service");
    }

    return {
      response: data.response,
      updatedData: data.updatedData,
      newRows: data.newRows, // Include newRows for add operations
      rowsToRemove: data.rowsToRemove, // Include rowsToRemove for remove operations
    };
  }

  private async executeFunctionCall(
    functionCall: FunctionCall,
    currentData: any[]
  ): Promise<{ result: any; dataChanged: boolean; newData?: any[] }> {
    this.addThinking(
      `Executing function: ${functionCall.name} - ${functionCall.reasoning}`
    );

    try {
      switch (functionCall.name) {
        case "view_fmeca_data":
          return await this.handleViewData(functionCall.arguments, currentData);

        case "edit_fmeca_cell":
          return await this.handleEditCell(functionCall.arguments, currentData);

        case "add_fmeca_row":
          return await this.handleAddRow(functionCall.arguments, currentData);

        case "remove_fmeca_row":
          return await this.handleRemoveRow(
            functionCall.arguments,
            currentData
          );

        case "bulk_edit_fmeca":
          return await this.handleBulkEdit(functionCall.arguments, currentData);

        case "analyze_fmeca_data":
          return await this.handleAnalyzeData(
            functionCall.arguments,
            currentData
          );

        default:
          throw new Error(`Unknown function: ${functionCall.name}`);
      }
    } catch (error) {
      this.addThinking(
        `❌ Function execution failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return {
        result: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        dataChanged: false,
      };
    }
  }

  private async handleViewData(
    args: any,
    currentData: any[]
  ): Promise<{ result: any; dataChanged: boolean }> {
    let filteredData = [...currentData];

    // Apply filters
    if (args.filters) {
      Object.entries(args.filters).forEach(([key, value]) => {
        if (value) {
          filteredData = filteredData.filter((row) =>
            String(row[key] || "")
              .toLowerCase()
              .includes(String(value).toLowerCase())
          );
        }
      });
    }

    // Apply search
    if (args.search) {
      const searchTerm = String(args.search).toLowerCase();
      filteredData = filteredData.filter((row) =>
        Object.values(row).some((cell) =>
          String(cell || "")
            .toLowerCase()
            .includes(searchTerm)
        )
      );
    }

    // Apply limit
    if (args.limit) {
      filteredData = filteredData.slice(0, args.limit);
    }

    // Select specific columns
    if (args.columns && args.columns.length > 0) {
      filteredData = filteredData.map((row) => {
        const filteredRow: any = {};
        args.columns.forEach((col: string) => {
          filteredRow[col] = row[col];
        });
        return filteredRow;
      });
    }

    return {
      result: {
        rows: filteredData,
        count: filteredData.length,
        total_available: currentData.length,
      },
      dataChanged: false,
    };
  }

  private async handleEditCell(
    args: any,
    currentData: any[]
  ): Promise<{ result: any; dataChanged: boolean; newData: any[] }> {
    const { row_identifier, column_name, new_value } = args;
    const newData = [...currentData];

    // Find the row to edit
    let rowIndex = -1;
    if (row_identifier.row_index !== undefined) {
      rowIndex = row_identifier.row_index;
    } else {
      rowIndex = newData.findIndex((row) => {
        if (row_identifier.floc && row["FLOC"]) {
          return row["FLOC"] === row_identifier.floc;
        }
        if (row_identifier.asset_type && row_identifier.component) {
          return (
            row["Asset Type"] === row_identifier.asset_type &&
            row["Component"] === row_identifier.component
          );
        }
        return false;
      });
    }

    if (rowIndex === -1 || rowIndex >= newData.length) {
      throw new Error("Row not found with the given identifier");
    }

    // Update the cell
    const oldValue = newData[rowIndex][column_name];
    newData[rowIndex][column_name] = new_value;

    // Save to database
    await saveFMECAData(this.projectId, newData);

    return {
      result: {
        row_index: rowIndex,
        column: column_name,
        old_value: oldValue,
        new_value: new_value,
        success: true,
      },
      dataChanged: true,
      newData,
    };
  }

  private async handleAddRow(
    args: any,
    currentData: any[]
  ): Promise<{ result: any; dataChanged: boolean; newData: any[] }> {
    const { row_data } = args;
    const newData = [...currentData, row_data];

    // Save to database
    await saveFMECAData(this.projectId, newData);

    return {
      result: {
        row_index: newData.length - 1,
        added_row: row_data,
        success: true,
      },
      dataChanged: true,
      newData,
    };
  }

  private async handleRemoveRow(
    args: any,
    currentData: any[]
  ): Promise<{ result: any; dataChanged: boolean; newData: any[] }> {
    const { row_identifier } = args;
    let rowIndex = -1;

    if (row_identifier.row_index !== undefined) {
      rowIndex = row_identifier.row_index;
    } else {
      rowIndex = currentData.findIndex((row) => {
        if (row_identifier.floc && row["FLOC"]) {
          return row["FLOC"] === row_identifier.floc;
        }
        if (row_identifier.asset_type && row_identifier.component) {
          return (
            row["Asset Type"] === row_identifier.asset_type &&
            row["Component"] === row_identifier.component
          );
        }
        return false;
      });
    }

    if (rowIndex === -1 || rowIndex >= currentData.length) {
      throw new Error("Row not found with the given identifier");
    }

    const removedRow = currentData[rowIndex];
    const newData = currentData.filter((_, index) => index !== rowIndex);

    // Save to database
    await saveFMECAData(this.projectId, newData);

    return {
      result: {
        row_index: rowIndex,
        removed_row: removedRow,
        success: true,
      },
      dataChanged: true,
      newData,
    };
  }

  private async handleBulkEdit(
    args: any,
    currentData: any[]
  ): Promise<{ result: any; dataChanged: boolean; newData: any[] }> {
    const { operation, filters, changes } = args;
    const newData = [...currentData];
    let modifiedCount = 0;

    // Apply filters to find rows to modify
    const rowsToModify = newData.filter((row, index) => {
      if (!filters) return true;

      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return String(row[key] || "")
          .toLowerCase()
          .includes(String(value).toLowerCase());
      });
    });

    // Apply changes
    rowsToModify.forEach((row) => {
      Object.entries(changes).forEach(([column, newValue]) => {
        row[column] = newValue;
        modifiedCount++;
      });
    });

    if (modifiedCount > 0) {
      // Save to database
      await saveFMECAData(this.projectId, newData);
    }

    return {
      result: {
        operation,
        rows_modified: rowsToModify.length,
        cells_modified: modifiedCount,
        success: true,
      },
      dataChanged: modifiedCount > 0,
      newData: modifiedCount > 0 ? newData : undefined,
    };
  }

  private async handleAnalyzeData(
    args: any,
    currentData: any[]
  ): Promise<{ result: any; dataChanged: boolean }> {
    const { analysis_type, focus_areas } = args;

    // This is a simplified analysis - in a real implementation,
    // you might want to call the AI service for more sophisticated analysis
    let analysisResult: any = {};

    switch (analysis_type) {
      case "completeness_check":
        analysisResult = this.checkDataCompleteness(currentData);
        break;
      case "consistency_check":
        analysisResult = this.checkDataConsistency(currentData);
        break;
      case "risk_assessment":
        analysisResult = this.performRiskAssessment(currentData);
        break;
      default:
        analysisResult = { message: "Analysis type not implemented yet" };
    }

    return {
      result: {
        analysis_type,
        focus_areas,
        results: analysisResult,
        total_rows_analyzed: currentData.length,
      },
      dataChanged: false,
    };
  }

  private checkDataCompleteness(data: any[]): any {
    const requiredFields = ["Asset Type", "Component", "Failure Modes"];
    const incompleteRows: any[] = [];

    data.forEach((row, index) => {
      const missingFields = requiredFields.filter(
        (field) => !row[field] || String(row[field]).trim() === ""
      );
      if (missingFields.length > 0) {
        incompleteRows.push({
          row_index: index,
          missing_fields: missingFields,
          row_identifier:
            row["FLOC"] || `${row["Asset Type"]}-${row["Component"]}`,
        });
      }
    });

    return {
      complete_rows: data.length - incompleteRows.length,
      incomplete_rows: incompleteRows.length,
      completion_percentage:
        ((data.length - incompleteRows.length) / data.length) * 100,
      issues: incompleteRows,
    };
  }

  private checkDataConsistency(data: any[]): any {
    const assetTypes = new Set(
      data.map((row) => row["Asset Type"]).filter(Boolean)
    );
    const duplicateFLOCs = this.findDuplicates(data, "FLOC");

    return {
      unique_asset_types: Array.from(assetTypes),
      duplicate_flocs: duplicateFLOCs,
      consistency_score: duplicateFLOCs.length === 0 ? 100 : 80,
    };
  }

  private performRiskAssessment(data: any[]): any {
    const highRiskItems = data.filter((row) => {
      const severity = parseInt(row["Severity"] || "0");
      const probability = parseInt(row["Probability"] || "0");
      return severity >= 4 || probability >= 4;
    });

    return {
      total_items: data.length,
      high_risk_items: highRiskItems.length,
      risk_percentage: (highRiskItems.length / data.length) * 100,
      high_risk_details: highRiskItems.map((row, index) => ({
        asset: row["Asset Type"],
        component: row["Component"],
        severity: row["Severity"],
        probability: row["Probability"],
      })),
    };
  }

  private findDuplicates(data: any[], field: string): any[] {
    const seen = new Set();
    const duplicates: any[] = [];

    data.forEach((row, index) => {
      const value = row[field];
      if (value && seen.has(value)) {
        duplicates.push({ row_index: index, field, value });
      } else if (value) {
        seen.add(value);
      }
    });

    return duplicates;
  }

  async processRequest(
    userMessage: string,
    currentData: any[],
    columns: string[]
  ): Promise<AgentResponse> {
    this.thinking = [];
    this.addThinking(`Received user request: "${userMessage}"`);
    this.addThinking(`Current FMECA data contains ${currentData.length} rows`);

    // Validate project ID
    if (!this.projectId || this.projectId.trim() === "") {
      this.addThinking("❌ No valid project ID - cannot save modifications");
      return {
        response:
          "I cannot modify data because no project is currently selected. Please select a project first.",
        functionCalls: [],
        dataChanged: false,
        thinking: this.thinking,
      };
    }

    try {
      // Optimize context based on request type
      const strategy = ContextOptimizer.analyzeRequest(userMessage);
      const contextResult = ContextOptimizer.prepareContext(
        currentData,
        columns,
        strategy
      );

      this.addThinking(
        `🎯 Context optimization: ${contextResult.metadata.strategy}`
      );
      this.addThinking(
        `📊 Sending ${contextResult.data.length}/${currentData.length} rows to AI`
      );

      // Call the Supabase function with optimized context
      const aiResponse = await this.callSupabaseFunction(
        userMessage,
        contextResult.data,
        contextResult.metadata.columns,
        contextResult.metadata
      );

      this.addThinking(`AI responded: ${aiResponse.response}`);

      // For now, we'll handle the response directly since the Supabase function
      // returns the updated data directly. In the future, we could enhance this
      // to parse function calls from the AI response.

      let dataChanged = false;
      let finalData = currentData;

      // Handle different response types from the AI
      if (
        (aiResponse as any).newRows &&
        Array.isArray((aiResponse as any).newRows)
      ) {
        // Add operation: AI returned only new rows to add
        this.addThinking("✅ AI returned new rows to add");
        finalData = [...currentData, ...(aiResponse as any).newRows];
        dataChanged = true;
        this.addThinking(
          `📊 Dataset size: ${currentData.length} → ${finalData.length} rows`
        );
      } else if (
        (aiResponse as any).rowsToRemove &&
        Array.isArray((aiResponse as any).rowsToRemove)
      ) {
        // Remove operation: AI returned complete rows to remove
        this.addThinking("✅ AI returned complete rows to remove");
        const rowsToRemove = (aiResponse as any).rowsToRemove;

        // Remove rows by exact match (using JSON.stringify for precise comparison)
        finalData = currentData.filter((row) => {
          return !rowsToRemove.some((rowToRemove: any) => {
            return JSON.stringify(row) === JSON.stringify(rowToRemove);
          });
        });

        dataChanged = finalData.length !== currentData.length;
        if (dataChanged) {
          this.addThinking(
            `📊 Dataset size: ${currentData.length} → ${
              finalData.length
            } rows (removed ${currentData.length - finalData.length})`
          );
        } else {
          this.addThinking("⚠️ No matching rows found to remove");
        }
      } else if (
        aiResponse.updatedData &&
        Array.isArray(aiResponse.updatedData)
      ) {
        // Update/Edit operation: AI returned complete updated dataset
        const dataDidChange =
          JSON.stringify(currentData) !==
          JSON.stringify(aiResponse.updatedData);

        if (dataDidChange) {
          this.addThinking("✅ Data was modified by AI");
          this.addThinking("📋 Changes will be staged for user review");
          finalData = aiResponse.updatedData;
          dataChanged = true;
        } else {
          this.addThinking("ℹ️ No data changes detected");
        }
      } else {
        // View/Query operation: No data changes
        this.addThinking("ℹ️ View/query operation - no data changes");
        dataChanged = false;
      }

      return {
        response: aiResponse.response,
        functionCalls: [], // The Supabase function handles this internally
        dataChanged,
        thinking: this.thinking,
        updatedData: dataChanged ? finalData : undefined,
      };
    } catch (error) {
      this.addThinking(
        `❌ Error occurred: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );

      return {
        response: `I encountered an error while processing your request: ${
          error instanceof Error ? error.message : "Unknown error"
        }. Please try again.`,
        functionCalls: [],
        dataChanged: false,
        thinking: this.thinking,
      };
    }
  }
}
