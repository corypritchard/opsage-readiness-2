import { describe, it, expect, beforeEach, vi } from "vitest";
import { FMECAAgent } from "./fmecaAgent";
import { sampleFMECAData } from "@/utils/sampleFMECAData";

// Mock the Supabase client and functions
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock("@/integrations/supabase/maintenance-tasks", () => ({
  getFMECAData: vi.fn(),
  saveFMECAData: vi.fn(),
}));

describe("FMECAAgent Functions", () => {
  let agent: FMECAAgent;
  const mockProjectId = "test-project-123";
  const testColumns = Object.keys(sampleFMECAData[0]);

  beforeEach(() => {
    agent = new FMECAAgent(mockProjectId);
    vi.clearAllMocks();
  });

  describe("1. view_fmeca_data Function", () => {
    it("should view all data without filters", async () => {
      const testMessage = "Show me all FMECA data";

      const mockResponse = {
        data: {
          response:
            "Here are all 6 rows of FMECA data showing asset types, components, and failure modes.",
          updatedData: sampleFMECAData,
        },
      };

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toBeTruthy();
      expect(result.functionCalls).toHaveLength(0); // Direct call, no function calls
      expect(result.dataChanged).toBe(false);
      expect(result.thinking.length).toBeGreaterThan(0);
    });

    it("should view data with severity level filter", async () => {
      const testMessage = "Show me all items with severity level 4";

      const mockResponse = {
        data: {
          response:
            "Found 5 items with severity level 4, including conveyor idlers, conveyor belt, and feeder components.",
          updatedData: sampleFMECAData.filter(
            (item) => item["Overall Severity Level"] === "4"
          ),
        },
      };

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toBeTruthy();
      expect(result.dataChanged).toBe(false);
    });

    it("should view data with asset type filter", async () => {
      const testMessage = "Show me all Conveyor assets";

      const mockResponse = {
        data: {
          response:
            "Found 2 Conveyor assets: Idlers and Conveyor Belt components.",
          updatedData: sampleFMECAData.filter(
            (item) => item["Asset Type"] === "Conveyor"
          ),
        },
      };

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toBeTruthy();
      expect(result.dataChanged).toBe(false);
    });
  });

  describe("2. edit_fmeca_cell Function", () => {
    it("should edit a specific cell value", async () => {
      const testMessage =
        "Change the severity level of the Conveyor Idlers to 5";

      const updatedData = [...sampleFMECAData];
      updatedData[0]["Overall Severity Level"] = "5";

      const mockResponse = {
        data: {
          response: "Updated severity level for Conveyor Idlers from 4 to 5.",
          updatedData: updatedData,
        },
      };

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toBeTruthy();
      expect(result.dataChanged).toBe(true);
      expect(result.thinking.some((t) => t.includes("Data was modified"))).toBe(
        true
      );
    });

    it("should edit control frequency", async () => {
      const testMessage =
        "Update the control frequency for Elevator Buckets to 2 months";

      const updatedData = [...sampleFMECAData];
      updatedData[2]["Recommended Control Frequency Interval"] = "2";

      const mockResponse = {
        data: {
          response:
            "Updated control frequency for Elevator Buckets to 2 months.",
          updatedData: updatedData,
        },
      };

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toBeTruthy();
      expect(result.dataChanged).toBe(true);
    });
  });

  describe("3. add_fmeca_row Function", () => {
    it("should add a new pump failure analysis", async () => {
      const testMessage =
        "Add a new pump failure analysis for centrifugal pump bearing failure";

      const newRow = {
        "Asset Type": "Pump",
        Classification: "Centrifugal",
        FLOC: "FLOC P",
        Component: "Bearing",
        "Main Function": "Provides rotational support for impeller",
        "Causes of Damage Mechanisms":
          "1) Insufficient Lubrication\n2) Contamination\n3) Misalignment",
        "Damage Mechanisms": "1) Worn\n2) Seized\n3) Overheated",
        "Failure Modes": "Bearing Failure",
        "Final Failure Mode": "Pump seizure",
        "Effect of Final Failure": "Complete pump failure and production loss",
        "Downtime Hrs": "8",
        "Downtime Reason": "Pump replacement",
        "Financial Impact": "50000",
        "Financial Severity Level": "4",
        "Overall Severity Level": "4",
        "Safety Severity Level": "2",
        "Safety Reason": "Potential for minor injury during maintenance",
        "Environmental Seveity Level": "1",
        "Environmental Reason": "Minor, temporary impact to the environment",
        "Community Severity Level": "1",
        "Community Reason": "Minor, temporary community impact",
        "Reputation Severity Level": "2",
        "Reputation Reason": "Moderate impact on company reputation",
        "Legal Severity Level": "1",
        "Legal Reason": "Minor impact on legal compliance",
        "Control Required":
          "Pump bearing - Lubrication and vibration monitoring",
        "Recommended Control Frequency Interval": "1",
        "Recommended Control Frequency Units": "Months",
      };

      const updatedData = [...sampleFMECAData, newRow];

      const mockResponse = {
        data: {
          response:
            "Added new pump failure analysis for centrifugal pump bearing failure.",
          updatedData: updatedData,
        },
      };

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toBeTruthy();
      expect(result.dataChanged).toBe(true);
      expect(result.thinking.some((t) => t.includes("Data was modified"))).toBe(
        true
      );
    });

    it("should add a new motor failure analysis", async () => {
      const testMessage =
        "Add a motor failure analysis for electric motor winding failure";

      const newRow = {
        "Asset Type": "Motor",
        Classification: "Electric Motor",
        FLOC: "FLOC M",
        Component: "Windings",
        "Main Function": "Converts electrical energy to mechanical energy",
        "Causes of Damage Mechanisms":
          "1) Overheating\n2) Moisture\n3) Electrical overload",
        "Damage Mechanisms": "1) Insulation breakdown\n2) Short circuit",
        "Failure Modes": "Winding failure",
        "Final Failure Mode": "Motor failure",
        "Effect of Final Failure": "Equipment shutdown and production loss",
        "Downtime Hrs": "12",
        "Downtime Reason": "Motor replacement",
        "Financial Impact": "75000",
        "Financial Severity Level": "5",
        "Overall Severity Level": "5",
        "Safety Severity Level": "3",
        "Safety Reason": "Potential for electrical shock or fire",
        "Environmental Seveity Level": "2",
        "Environmental Reason":
          "Moderate environmental impact from electrical failure",
        "Community Severity Level": "1",
        "Community Reason": "Minor community impact",
        "Reputation Severity Level": "2",
        "Reputation Reason": "Moderate reputation impact",
        "Legal Severity Level": "2",
        "Legal Reason": "Moderate legal compliance impact",
        "Control Required": "Motor - Electrical testing and thermal monitoring",
        "Recommended Control Frequency Interval": "3",
        "Recommended Control Frequency Units": "Months",
      };

      const updatedData = [...sampleFMECAData, newRow];

      const mockResponse = {
        data: {
          response:
            "Added new motor failure analysis for electric motor winding failure.",
          updatedData: updatedData,
        },
      };

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toBeTruthy();
      expect(result.dataChanged).toBe(true);
    });
  });

  describe("4. remove_fmeca_row Function", () => {
    it("should remove a specific row by asset type and component", async () => {
      const testMessage = "Remove the Elevator Access Ways entry";

      const updatedData = sampleFMECAData.filter(
        (item) =>
          !(
            item["Asset Type"] === "Elevator" &&
            item["Component"] === "Access Ways"
          )
      );

      const mockResponse = {
        data: {
          response: "Removed Elevator Access Ways entry from FMECA data.",
          updatedData: updatedData,
        },
      };

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toBeTruthy();
      expect(result.dataChanged).toBe(true);
      expect(result.thinking.some((t) => t.includes("Data was modified"))).toBe(
        true
      );
    });

    it("should remove a row by FLOC", async () => {
      const testMessage = "Remove all entries with FLOC T";

      const updatedData = sampleFMECAData.filter(
        (item) => item["FLOC"] !== "FLOC T"
      );

      const mockResponse = {
        data: {
          response: "Removed all entries with FLOC T (2 entries removed).",
          updatedData: updatedData,
        },
      };

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toBeTruthy();
      expect(result.dataChanged).toBe(true);
    });
  });

  describe("5. bulk_edit_fmeca Function", () => {
    it("should perform bulk update on severity levels", async () => {
      const testMessage =
        "Update all Conveyor items to have safety severity level 2";

      const updatedData = sampleFMECAData.map((item) => {
        if (item["Asset Type"] === "Conveyor") {
          return { ...item, "Safety Severity Level": "2" };
        }
        return item;
      });

      const mockResponse = {
        data: {
          response:
            "Updated safety severity level to 2 for all Conveyor items (2 items updated).",
          updatedData: updatedData,
        },
      };

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toBeTruthy();
      expect(result.dataChanged).toBe(true);
      expect(result.thinking.some((t) => t.includes("Data was modified"))).toBe(
        true
      );
    });

    it("should perform find and replace operation", async () => {
      const testMessage =
        "Replace all occurrences of 'Belt Conveyor' with 'Conveyor Belt System'";

      const updatedData = sampleFMECAData.map((item) => {
        const newItem = { ...item };
        Object.keys(newItem).forEach((key) => {
          if (typeof newItem[key] === "string") {
            newItem[key] = newItem[key].replace(
              /Belt Conveyor/g,
              "Conveyor Belt System"
            );
          }
        });
        return newItem;
      });

      const mockResponse = {
        data: {
          response:
            "Replaced all occurrences of 'Belt Conveyor' with 'Conveyor Belt System' (4 replacements made).",
          updatedData: updatedData,
        },
      };

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toBeTruthy();
      expect(result.dataChanged).toBe(true);
    });
  });

  describe("6. analyze_fmeca_data Function", () => {
    it("should perform risk assessment analysis", async () => {
      const testMessage = "Analyze the data for risk assessment";

      const mockResponse = {
        data: {
          response: `Risk Assessment Analysis:
- High Risk Items (Severity 4+): 5 out of 6 items (83%)
- Critical Safety Risks: 1 item with safety severity 4 (Elevator Access Ways)
- Financial Impact: 5 items with financial severity 4
- Most Common Failure Modes: Bearing Failure (3 occurrences), Belt failure (2 occurrences)
- Recommended Actions: Prioritize Elevator Access Ways safety inspection, implement preventive maintenance for bearing failures`,
          updatedData: sampleFMECAData,
        },
      };

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toBeTruthy();
      expect(result.dataChanged).toBe(false);
      expect(result.response).toContain("Risk Assessment");
    });

    it("should perform completeness check", async () => {
      const testMessage = "Check the data for completeness issues";

      const mockResponse = {
        data: {
          response: `Completeness Check Results:
- Missing Data: 12 empty fields found across 6 records
- Empty Fields: Downtime Hrs (6), Financial Impact (6)
- Completion Rate: 92% (220/240 fields filled)
- Recommendations: Fill in downtime hours and financial impact values for better analysis`,
          updatedData: sampleFMECAData,
        },
      };

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toBeTruthy();
      expect(result.dataChanged).toBe(false);
      expect(result.response).toContain("Completeness Check");
    });

    it("should perform consistency check", async () => {
      const testMessage = "Check the data for consistency issues";

      const mockResponse = {
        data: {
          response: `Consistency Check Results:
- Inconsistent Frequency Units: Found 'Month' and 'Months' (should be standardized)
- Severity Level Alignment: Overall severity matches individual severity levels
- FLOC Naming: Consistent pattern (FLOC S, FLOC T)
- Recommendations: Standardize frequency units to plural form`,
          updatedData: sampleFMECAData,
        },
      };

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toBeTruthy();
      expect(result.dataChanged).toBe(false);
      expect(result.response).toContain("Consistency Check");
    });
  });

  describe("Error Handling", () => {
    it("should handle Supabase function errors gracefully", async () => {
      const testMessage = "Show me all data";

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockRejectedValue(
        new Error("Network error")
      );

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toContain("error");
      expect(result.dataChanged).toBe(false);
      expect(result.thinking.some((t) => t.includes("❌ Error occurred"))).toBe(
        true
      );
    });

    it("should handle invalid JSON responses", async () => {
      const testMessage = "Add a new item";

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: "Invalid JSON response",
      });

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toContain("error");
      expect(result.dataChanged).toBe(false);
    });
  });

  describe("Integration Tests", () => {
    it("should handle complex multi-step operations", async () => {
      const testMessage =
        "Show me high-risk items and update their control frequency to weekly";

      const updatedData = sampleFMECAData.map((item) => {
        if (parseInt(item["Overall Severity Level"]) >= 4) {
          return {
            ...item,
            "Recommended Control Frequency Interval": "1",
            "Recommended Control Frequency Units": "Weeks",
          };
        }
        return item;
      });

      const mockResponse = {
        data: {
          response:
            "Found 5 high-risk items (severity 4+) and updated their control frequency to weekly.",
          updatedData: updatedData,
        },
      };

      const { supabase } = await import("@/integrations/supabase/client");
      vi.mocked(supabase.functions.invoke).mockResolvedValue(mockResponse);

      const result = await agent.processRequest(
        testMessage,
        sampleFMECAData,
        testColumns
      );

      expect(result.response).toBeTruthy();
      expect(result.dataChanged).toBe(true);
      expect(result.thinking.length).toBeGreaterThan(0);
    });
  });
});
