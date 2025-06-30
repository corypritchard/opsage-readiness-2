import OpenAI from "openai";
import {
  getFMECAData,
  saveFMECAData,
} from "@/integrations/supabase/maintenance-tasks";

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
  arguments: any;
  result: any;
  reasoning: string;
}

export interface AgentResponse {
  response: string;
  functionCalls: FunctionCall[];
  dataChanged: boolean;
  updatedData?: any[];
  thinking: string[];
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
        row_id: { type: "number", description: "Row index (0-based) to edit" },
        column_name: {
          type: "string",
          description: "Exact column name to edit",
        },
        new_value: { type: "string", description: "New value for the cell" },
        reason: {
          type: "string",
          description: "Clear reason for making this change",
        },
      },
      required: ["row_id", "column_name", "new_value", "reason"],
    },
  },

  {
    name: "add_fmeca_row",
    description:
      "Add a new row to the FMECA table with complete failure analysis data",
    parameters: {
      type: "object",
      properties: {
        row_data: {
          type: "object",
          description:
            "Complete row data with all FMECA fields populated appropriately",
        },
        position: {
          type: "number",
          description:
            "Position to insert the row (0-based index, optional - defaults to end)",
        },
        reason: {
          type: "string",
          description: "Reason for adding this new row",
        },
      },
      required: ["row_data", "reason"],
    },
  },

  {
    name: "remove_fmeca_row",
    description: "Remove one or more rows from the FMECA table",
    parameters: {
      type: "object",
      properties: {
        row_ids: {
          type: "array",
          items: { type: "number" },
          description: "Array of row indices to remove (0-based)",
        },
        reason: {
          type: "string",
          description: "Clear justification for removing these rows",
        },
      },
      required: ["row_ids", "reason"],
    },
  },

  {
    name: "bulk_edit_fmeca",
    description: "Perform bulk edits across multiple rows and columns",
    parameters: {
      type: "object",
      properties: {
        edits: {
          type: "array",
          items: {
            type: "object",
            properties: {
              row_id: { type: "number" },
              column_name: { type: "string" },
              new_value: { type: "string" },
            },
          },
          description: "Array of edit operations to perform",
        },
        reason: {
          type: "string",
          description: "Reason for these bulk changes",
        },
      },
      required: ["edits", "reason"],
    },
  },

  {
    name: "analyze_fmeca_patterns",
    description: "Analyze FMECA data for patterns, risks, and insights",
    parameters: {
      type: "object",
      properties: {
        analysis_type: {
          type: "string",
          enum: [
            "risk_assessment",
            "severity_patterns",
            "failure_frequency",
            "completeness_check",
            "component_analysis",
          ],
          description: "Type of analysis to perform",
        },
        focus_area: {
          type: "string",
          description:
            "Specific area to focus analysis on (asset type, component, etc.)",
        },
      },
      required: ["analysis_type"],
    },
  },
];

export class FMECAAgent {
  private openai: OpenAI;
  private projectId: string;
  private thinking: string[] = [];

  constructor(projectId: string, apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // For client-side usage
    });
    this.projectId = projectId;
  }

  private addThinking(thought: string) {
    this.thinking.push(`🤔 ${thought}`);
  }

  private getSystemPrompt(): string {
    return `You are an expert FMECA (Failure Mode, Effects, and Criticality Analysis) assistant. You help users manage and analyze their FMECA data through natural language interactions.

Key responsibilities:
- View, edit, add, and remove FMECA data based on user requests
- Provide detailed analysis and insights about failure modes and risks
- Ensure data integrity and FMECA best practices
- Be verbose about your thinking process - explain what you're doing and why
- Always validate changes before making them
- Provide clear reasoning for all modifications

FMECA Context:
- Asset Type: The type of equipment (Conveyor, Elevator, Pump, etc.)
- Component: Specific part of the asset (Belt, Motor, Bearing, etc.)
- Failure Mode: How the component can fail
- Effects: What happens when failure occurs
- Severity: Impact level of the failure (1-5 scale typically)
- Causes: What leads to the failure
- Controls: Preventive measures in place

Always think step by step and explain your reasoning to the user. Be conversational and helpful while maintaining technical accuracy.`;
  }

  async processRequest(
    userMessage: string,
    currentData: any[]
  ): Promise<AgentResponse> {
    this.thinking = [];
    this.addThinking(`Received user request: "${userMessage}"`);
    this.addThinking(`Current FMECA data contains ${currentData.length} rows`);

    try {
      // For now, return a simple response until we implement the full OpenAI integration
      return {
        response: `I understand you want to: "${userMessage}". The OpenAI agent is being implemented and will be available soon with full FMECA editing capabilities.`,
        functionCalls: [],
        dataChanged: false,
        thinking: this.thinking,
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

  private async executeFunction(
    functionName: string,
    args: any,
    currentData: any[]
  ): Promise<{
    data: any;
    reasoning: string;
    dataChanged: boolean;
    updatedData: any[];
  }> {
    switch (functionName) {
      case "view_fmeca_data":
        return this.viewFMECAData(args, currentData);

      case "edit_fmeca_cell":
        return this.editFMECACell(args, currentData);

      case "add_fmeca_row":
        return this.addFMECARow(args, currentData);

      case "remove_fmeca_row":
        return this.removeFMECARow(args, currentData);

      case "bulk_edit_fmeca":
        return this.bulkEditFMECA(args, currentData);

      case "analyze_fmeca_patterns":
        return this.analyzeFMECAPatterns(args, currentData);

      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  private async viewFMECAData(
    args: any,
    currentData: any[]
  ): Promise<{
    data: any;
    reasoning: string;
    dataChanged: boolean;
    updatedData: any[];
  }> {
    this.addThinking(
      "Filtering and analyzing FMECA data based on specified criteria..."
    );

    let filteredData = [...currentData];
    let filterCount = 0;

    // Apply filters
    if (args.filters) {
      if (args.filters.asset_type) {
        const beforeCount = filteredData.length;
        filteredData = filteredData.filter((row) =>
          row["Asset Type"]
            ?.toLowerCase()
            .includes(args.filters.asset_type.toLowerCase())
        );
        const filtered = beforeCount - filteredData.length;
        if (filtered > 0) {
          this.addThinking(
            `Filtered by asset type '${args.filters.asset_type}': removed ${filtered} rows`
          );
          filterCount++;
        }
      }

      if (args.filters.component) {
        const beforeCount = filteredData.length;
        filteredData = filteredData.filter((row) =>
          row["Component"]
            ?.toLowerCase()
            .includes(args.filters.component.toLowerCase())
        );
        const filtered = beforeCount - filteredData.length;
        if (filtered > 0) {
          this.addThinking(
            `Filtered by component '${args.filters.component}': removed ${filtered} rows`
          );
          filterCount++;
        }
      }

      if (args.filters.failure_mode) {
        const beforeCount = filteredData.length;
        filteredData = filteredData.filter((row) =>
          row["Failure Modes"]
            ?.toLowerCase()
            .includes(args.filters.failure_mode.toLowerCase())
        );
        const filtered = beforeCount - filteredData.length;
        if (filtered > 0) {
          this.addThinking(
            `Filtered by failure mode '${args.filters.failure_mode}': removed ${filtered} rows`
          );
          filterCount++;
        }
      }
    }

    // Apply search
    if (args.search) {
      const beforeCount = filteredData.length;
      const searchTerm = args.search.toLowerCase();
      filteredData = filteredData.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm)
        )
      );
      const filtered = beforeCount - filteredData.length;
      if (filtered > 0) {
        this.addThinking(
          `Applied search term '${args.search}': removed ${filtered} rows`
        );
      }
    }

    // Apply column selection
    if (args.columns && args.columns.length > 0) {
      filteredData = filteredData.map((row) =>
        Object.fromEntries(
          args.columns.map((col: string) => [col, row[col] || ""])
        )
      );
      this.addThinking(
        `Selected ${args.columns.length} specific columns: ${args.columns.join(
          ", "
        )}`
      );
    }

    // Apply limit
    const limit = args.limit || 50;
    if (filteredData.length > limit) {
      filteredData = filteredData.slice(0, limit);
      this.addThinking(
        `Limited results to ${limit} rows (${filteredData.length} total matches)`
      );
    }

    const reasoning = `Retrieved ${filteredData.length} rows from FMECA data${
      filterCount > 0 ? ` with ${filterCount} filter(s) applied` : ""
    }`;

    return {
      data: {
        rows: filteredData,
        total_found: filteredData.length,
        columns: args.columns || Object.keys(currentData[0] || {}),
        filters_applied: args.filters || {},
        search_term: args.search,
      },
      reasoning,
      dataChanged: false,
      updatedData: currentData,
    };
  }

  private async editFMECACell(
    args: any,
    currentData: any[]
  ): Promise<{
    data: any;
    reasoning: string;
    dataChanged: boolean;
    updatedData: any[];
  }> {
    const { row_id, column_name, new_value, reason } = args;

    this.addThinking(`Editing cell at row ${row_id}, column '${column_name}'`);

    if (row_id >= currentData.length || row_id < 0) {
      throw new Error(
        `Row ${row_id} does not exist. Valid range: 0-${currentData.length - 1}`
      );
    }

    if (!(column_name in currentData[row_id])) {
      throw new Error(
        `Column '${column_name}' does not exist in the FMECA data`
      );
    }

    const updatedData = [...currentData];
    const oldValue = updatedData[row_id][column_name];
    updatedData[row_id][column_name] = new_value;

    this.addThinking(
      `Changed '${oldValue}' to '${new_value}' in row ${row_id}`
    );

    // Save to database
    await saveFMECAData(this.projectId, updatedData);
    this.addThinking("Changes saved to database successfully");

    return {
      data: {
        success: true,
        change: {
          row: row_id,
          column: column_name,
          old_value: oldValue,
          new_value: new_value,
          reason: reason,
        },
      },
      reasoning: `Updated cell in row ${row_id}, column '${column_name}' from '${oldValue}' to '${new_value}'. Reason: ${reason}`,
      dataChanged: true,
      updatedData,
    };
  }

  private async addFMECARow(
    args: any,
    currentData: any[]
  ): Promise<{
    data: any;
    reasoning: string;
    dataChanged: boolean;
    updatedData: any[];
  }> {
    const { row_data, position, reason } = args;

    this.addThinking(
      `Adding new FMECA row with ${Object.keys(row_data).length} fields`
    );

    // Get column structure from existing data
    const existingColumns = Object.keys(currentData[0] || {});

    // Ensure new row has all required columns
    const completeRowData = { ...row_data };
    existingColumns.forEach((col) => {
      if (!(col in completeRowData)) {
        completeRowData[col] = "";
        this.addThinking(`Added empty value for missing column: ${col}`);
      }
    });

    const updatedData = [...currentData];
    const insertPosition =
      position !== undefined ? position : updatedData.length;

    if (insertPosition < 0 || insertPosition > updatedData.length) {
      throw new Error(
        `Invalid position ${insertPosition}. Valid range: 0-${updatedData.length}`
      );
    }

    updatedData.splice(insertPosition, 0, completeRowData);
    this.addThinking(`Inserted new row at position ${insertPosition}`);

    // Save to database with preserved column order
    const { columns } = await getFMECAData(this.projectId);
    await saveFMECAData(this.projectId, updatedData, columns);
    this.addThinking("New row saved to database successfully");

    return {
      data: {
        success: true,
        new_row_index: insertPosition,
        total_rows: updatedData.length,
        added_data: completeRowData,
      },
      reasoning: `Added new FMECA row at position ${insertPosition} for ${
        row_data["Asset Type"] || "Unknown Asset"
      } - ${row_data["Component"] || "Unknown Component"}. Reason: ${reason}`,
      dataChanged: true,
      updatedData,
    };
  }

  private async removeFMECARow(
    args: any,
    currentData: any[]
  ): Promise<{
    data: any;
    reasoning: string;
    dataChanged: boolean;
    updatedData: any[];
  }> {
    const { row_ids, reason } = args;

    this.addThinking(`Removing ${row_ids.length} row(s) from FMECA data`);

    // Validate all row IDs
    const invalidIds = row_ids.filter(
      (id: number) => id < 0 || id >= currentData.length
    );
    if (invalidIds.length > 0) {
      throw new Error(
        `Invalid row IDs: ${invalidIds.join(", ")}. Valid range: 0-${
          currentData.length - 1
        }`
      );
    }

    // Sort in descending order to remove from end first (prevents index shifting issues)
    const sortedIds = [...row_ids].sort((a, b) => b - a);

    const updatedData = [...currentData];
    const removedRows: any[] = [];

    sortedIds.forEach((rowId: number) => {
      const removedRow = updatedData.splice(rowId, 1)[0];
      removedRows.unshift(removedRow); // Add to beginning to maintain original order
      this.addThinking(
        `Removed row ${rowId}: ${removedRow["Asset Type"]} - ${removedRow["Component"]}`
      );
    });

    // Save to database
    const { columns } = await getFMECAData(this.projectId);
    await saveFMECAData(this.projectId, updatedData, columns);
    this.addThinking("Updated data saved to database successfully");

    return {
      data: {
        success: true,
        removed_rows: removedRows.length,
        total_rows: updatedData.length,
        removed_data: removedRows,
      },
      reasoning: `Removed ${row_ids.length} row(s) from FMECA data. Reason: ${reason}`,
      dataChanged: true,
      updatedData,
    };
  }

  private async bulkEditFMECA(
    args: any,
    currentData: any[]
  ): Promise<{
    data: any;
    reasoning: string;
    dataChanged: boolean;
    updatedData: any[];
  }> {
    const { edits, reason } = args;

    this.addThinking(`Performing ${edits.length} bulk edit operations`);

    const updatedData = [...currentData];
    const changes: any[] = [];

    for (const edit of edits) {
      const { row_id, column_name, new_value } = edit;

      if (row_id < 0 || row_id >= updatedData.length) {
        throw new Error(
          `Row ${row_id} does not exist. Valid range: 0-${
            updatedData.length - 1
          }`
        );
      }

      if (!(column_name in updatedData[row_id])) {
        throw new Error(
          `Column '${column_name}' does not exist in row ${row_id}`
        );
      }

      const oldValue = updatedData[row_id][column_name];
      updatedData[row_id][column_name] = new_value;

      changes.push({
        row: row_id,
        column: column_name,
        old_value: oldValue,
        new_value: new_value,
      });

      this.addThinking(
        `Row ${row_id}, ${column_name}: '${oldValue}' → '${new_value}'`
      );
    }

    // Save to database
    const { columns } = await getFMECAData(this.projectId);
    await saveFMECAData(this.projectId, updatedData, columns);
    this.addThinking("All bulk changes saved to database successfully");

    return {
      data: {
        success: true,
        changes_made: changes.length,
        changes: changes,
      },
      reasoning: `Performed ${edits.length} bulk edit operations across multiple rows and columns. Reason: ${reason}`,
      dataChanged: true,
      updatedData,
    };
  }

  private async analyzeFMECAPatterns(
    args: any,
    currentData: any[]
  ): Promise<{
    data: any;
    reasoning: string;
    dataChanged: boolean;
    updatedData: any[];
  }> {
    const { analysis_type, focus_area } = args;

    this.addThinking(
      `Performing ${analysis_type} analysis${
        focus_area ? ` focused on ${focus_area}` : ""
      }`
    );

    let analysisResult: any = {};

    switch (analysis_type) {
      case "risk_assessment":
        analysisResult = this.performRiskAssessment(currentData, focus_area);
        break;
      case "severity_patterns":
        analysisResult = this.analyzeSeverityPatterns(currentData, focus_area);
        break;
      case "failure_frequency":
        analysisResult = this.analyzeFailureFrequency(currentData, focus_area);
        break;
      case "completeness_check":
        analysisResult = this.checkDataCompleteness(currentData);
        break;
      case "component_analysis":
        analysisResult = this.analyzeComponents(currentData, focus_area);
        break;
    }

    this.addThinking(
      `Analysis complete. Found ${
        Object.keys(analysisResult).length
      } key insights`
    );

    return {
      data: analysisResult,
      reasoning: `Completed ${analysis_type} analysis of FMECA data${
        focus_area ? ` with focus on ${focus_area}` : ""
      }`,
      dataChanged: false,
      updatedData: currentData,
    };
  }

  private performRiskAssessment(data: any[], focusArea?: string): any {
    this.addThinking("Analyzing risk levels across all entries...");

    let filteredData = data;
    if (focusArea) {
      filteredData = data.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(focusArea.toLowerCase())
        )
      );
    }

    const riskLevels = {
      high: filteredData.filter(
        (row) =>
          parseInt(row["Overall Severity Level"]) >= 4 ||
          parseInt(row["Safety Severity Level"]) >= 4
      ),
      medium: filteredData.filter(
        (row) =>
          parseInt(row["Overall Severity Level"]) === 3 ||
          parseInt(row["Safety Severity Level"]) === 3
      ),
      low: filteredData.filter(
        (row) =>
          parseInt(row["Overall Severity Level"]) <= 2 &&
          parseInt(row["Safety Severity Level"]) <= 2
      ),
    };

    return {
      total_entries: filteredData.length,
      risk_distribution: {
        high_risk: riskLevels.high.length,
        medium_risk: riskLevels.medium.length,
        low_risk: riskLevels.low.length,
      },
      high_risk_items: riskLevels.high.map((row) => ({
        asset: row["Asset Type"],
        component: row["Component"],
        failure_mode: row["Failure Modes"],
        overall_severity: row["Overall Severity Level"],
        safety_severity: row["Safety Severity Level"],
      })),
      recommendations: this.generateRiskRecommendations(riskLevels),
    };
  }

  private analyzeSeverityPatterns(data: any[], focusArea?: string): any {
    this.addThinking("Analyzing severity level patterns...");

    const severityFields = [
      "Overall Severity Level",
      "Safety Severity Level",
      "Financial Severity Level",
      "Environmental Seveity Level",
      "Community Severity Level",
      "Reputation Severity Level",
      "Legal Severity Level",
    ];

    const patterns: any = {};

    severityFields.forEach((field) => {
      const values = data.map((row) => parseInt(row[field]) || 0);
      patterns[field] = {
        average: values.reduce((a, b) => a + b, 0) / values.length,
        max: Math.max(...values),
        min: Math.min(...values),
        distribution: this.getDistribution(values),
      };
    });

    return {
      severity_patterns: patterns,
      insights: this.generateSeverityInsights(patterns),
    };
  }

  private analyzeFailureFrequency(data: any[], focusArea?: string): any {
    this.addThinking("Analyzing failure mode frequency patterns...");

    const failureModes: { [key: string]: number } = {};
    const assetTypes: { [key: string]: number } = {};
    const components: { [key: string]: number } = {};

    data.forEach((row) => {
      const failureMode = row["Failure Modes"] || "Unknown";
      const assetType = row["Asset Type"] || "Unknown";
      const component = row["Component"] || "Unknown";

      failureModes[failureMode] = (failureModes[failureMode] || 0) + 1;
      assetTypes[assetType] = (assetTypes[assetType] || 0) + 1;
      components[component] = (components[component] || 0) + 1;
    });

    return {
      most_common_failures: Object.entries(failureModes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
      asset_failure_frequency: Object.entries(assetTypes).sort(
        ([, a], [, b]) => b - a
      ),
      component_failure_frequency: Object.entries(components)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
    };
  }

  private checkDataCompleteness(data: any[]): any {
    this.addThinking("Checking data completeness and quality...");

    const requiredFields = [
      "Asset Type",
      "Component",
      "Failure Modes",
      "Overall Severity Level",
      "Safety Severity Level",
    ];

    const completeness: any = {};
    const issues: string[] = [];

    requiredFields.forEach((field) => {
      const emptyCount = data.filter(
        (row) => !row[field] || row[field] === ""
      ).length;
      completeness[field] = {
        complete: data.length - emptyCount,
        missing: emptyCount,
        percentage: (((data.length - emptyCount) / data.length) * 100).toFixed(
          1
        ),
      };

      if (emptyCount > 0) {
        issues.push(`${emptyCount} rows missing ${field}`);
      }
    });

    return {
      total_rows: data.length,
      completeness_by_field: completeness,
      data_quality_issues: issues,
      overall_completeness:
        (
          Object.values(completeness).reduce(
            (sum: any, field: any) => sum + parseFloat(field.percentage),
            0
          ) / requiredFields.length
        ).toFixed(1) + "%",
    };
  }

  private analyzeComponents(data: any[], focusArea?: string): any {
    this.addThinking("Analyzing component-specific patterns...");

    const componentAnalysis: { [key: string]: any } = {};

    data.forEach((row) => {
      const component = row["Component"] || "Unknown";

      if (!componentAnalysis[component]) {
        componentAnalysis[component] = {
          count: 0,
          asset_types: new Set(),
          failure_modes: new Set(),
          avg_severity: 0,
          severity_values: [],
        };
      }

      componentAnalysis[component].count++;
      componentAnalysis[component].asset_types.add(row["Asset Type"]);
      componentAnalysis[component].failure_modes.add(row["Failure Modes"]);

      const severity = parseInt(row["Overall Severity Level"]) || 0;
      componentAnalysis[component].severity_values.push(severity);
    });

    // Convert sets to arrays and calculate averages
    Object.keys(componentAnalysis).forEach((component) => {
      const analysis = componentAnalysis[component];
      analysis.asset_types = Array.from(analysis.asset_types);
      analysis.failure_modes = Array.from(analysis.failure_modes);
      analysis.avg_severity =
        analysis.severity_values.reduce((a: number, b: number) => a + b, 0) /
        analysis.severity_values.length;
      delete analysis.severity_values;
    });

    return {
      component_summary: componentAnalysis,
      most_critical_components: Object.entries(componentAnalysis)
        .sort(
          ([, a], [, b]) => (b as any).avg_severity - (a as any).avg_severity
        )
        .slice(0, 5)
        .map(([name, data]) => ({ component: name, ...data })),
    };
  }

  private getDistribution(values: number[]): { [key: number]: number } {
    const dist: { [key: number]: number } = {};
    values.forEach((val) => {
      dist[val] = (dist[val] || 0) + 1;
    });
    return dist;
  }

  private generateRiskRecommendations(riskLevels: any): string[] {
    const recommendations = [];

    if (riskLevels.high.length > 0) {
      recommendations.push(
        `Immediate attention required for ${riskLevels.high.length} high-risk items`
      );
      recommendations.push(
        "Consider implementing additional controls for high-severity failures"
      );
    }

    if (riskLevels.medium.length > riskLevels.high.length) {
      recommendations.push(
        "Focus on preventive measures for medium-risk items to prevent escalation"
      );
    }

    return recommendations;
  }

  private generateSeverityInsights(patterns: any): string[] {
    const insights = [];

    const overallAvg = patterns["Overall Severity Level"]?.average || 0;
    const safetyAvg = patterns["Safety Severity Level"]?.average || 0;

    if (overallAvg > 3) {
      insights.push(
        "Overall severity levels are concerning - review risk mitigation strategies"
      );
    }

    if (safetyAvg > 2) {
      insights.push(
        "Safety severity levels indicate potential personnel risks - prioritize safety controls"
      );
    }

    return insights;
  }
}
