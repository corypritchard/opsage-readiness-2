import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MaintenanceTasksContent } from "./MaintenanceTasksContent";
import React from "react";
import { sampleFMECAData } from "@/utils/sampleFMECAData";
import { vi } from "vitest";

// Mock the useAIChat hook with hoisted function
const mockSendMessage = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useAIChat", () => ({
  useAIChat: () => ({
    sendMessage: mockSendMessage,
    isLoading: false,
    error: null,
  }),
}));

// Mock the toast function with hoisted function
const mockToast = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/sonner", () => ({
  toast: mockToast,
}));

// Mock the TanStackFMECATable component
vi.mock("./TanStackFMECATable", () => ({
  TanStackFMECATable: ({ data, columns, onDataChange }: any) => (
    <div data-testid="fmeca-table">
      <div data-testid="table-data-length">{data.length}</div>
      <div data-testid="table-columns">
        {columns.map((col: any) => col.header || col.id || col).join(",")}
      </div>
      {data.map((row: any, index: number) => (
        <div key={index} data-testid={`table-row-${index}`}>
          {Object.entries(row).map(([key, value]) => (
            <span key={key} data-testid={`cell-${key}-${index}`}>
              {String(value)}
            </span>
          ))}
        </div>
      ))}
    </div>
  ),
}));

// Mock the database functions
vi.mock("@/integrations/supabase/maintenance-tasks", () => ({
  createFMECAProject: vi.fn(),
  getFMECAProjects: vi.fn().mockResolvedValue([]),
  saveFMECAData: vi.fn(),
  getFMECAData: vi.fn(),
  saveMaintenanceTasks: vi.fn(),
  getMaintenanceTasks: vi.fn().mockResolvedValue({ tasks: [], columns: [] }),
}));

// Test helper function
const renderComponent = (
  props: { fmecaData?: any[]; selectedFile?: File | null } = {}
) => {
  return render(
    <MaintenanceTasksContent
      fmecaData={props.fmecaData || []}
      selectedFile={props.selectedFile || null}
    />
  );
};

describe("MaintenanceTasksContent - Generate Tasks Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("No FMECA Data State", () => {
    it("should display no FMECA data message when fmecaData is empty", () => {
      render(<MaintenanceTasksContent fmecaData={[]} />);

      expect(screen.getByText("No FMECA Data Available")).toBeInTheDocument();
      expect(
        screen.getByText(
          "To generate maintenance tasks, you need to first upload and analyze your FMECA data in the FMECA tab."
        )
      ).toBeInTheDocument();
      expect(screen.getByText("No FMECA data")).toBeInTheDocument();
    });

    it("should not show generate tasks button when no FMECA data is available", () => {
      render(<MaintenanceTasksContent fmecaData={[]} />);

      expect(
        screen.queryByText("Generate Tasks with AI")
      ).not.toBeInTheDocument();
    });
  });

  describe("FMECA Data Available - Ready to Generate State", () => {
    const mockFMECAData = sampleFMECAData.slice(0, 3);

    it("should display ready for task generation message when FMECA data is available", () => {
      render(<MaintenanceTasksContent fmecaData={mockFMECAData} />);

      expect(
        screen.getByText("AI-Powered Task Generation")
      ).toBeInTheDocument();
      expect(screen.getByText("Ready for Task Generation")).toBeInTheDocument();
      expect(
        screen.getByText(/Your FMECA analysis contains 3 entries/)
      ).toBeInTheDocument();
      expect(screen.getByText("3 FMECA entries")).toBeInTheDocument();
    });

    it("should show the generate tasks button when FMECA data is available", () => {
      render(<MaintenanceTasksContent fmecaData={mockFMECAData} />);

      const generateButton = screen.getByRole("button", {
        name: /Generate Tasks with AI/i,
      });
      expect(generateButton).toBeInTheDocument();
      expect(generateButton).not.toBeDisabled();
    });

    it("should display correct FMECA data count in badge", () => {
      const largerDataSet = sampleFMECAData; // Use all sample data (6 entries)
      render(<MaintenanceTasksContent fmecaData={largerDataSet} />);

      expect(screen.getByText("6 FMECA entries")).toBeInTheDocument();
    });
  });

  describe("Generate Tasks Functionality", () => {
    const mockFMECAData = sampleFMECAData.slice(0, 3);
    const mockGeneratedTasks = [
      {
        Asset: "Conveyor",
        Component: "Idlers",
        "Failure Mode": "Bearing Failure",
        "Task Description": "Conveyor idlers - Routine Inspection",
        Frequency: "2 Weeks",
        "Maintenance Type": "Inspection",
      },
      {
        Asset: "Conveyor",
        Component: "Belt",
        "Failure Mode": "Belt worn",
        "Task Description": "Belt condition inspection",
        Frequency: "1 Week",
        "Maintenance Type": "Inspection",
      },
    ];

    it("should call sendMessage with correct parameters when generate button is clicked", async () => {
      mockSendMessage.mockResolvedValue({
        response: "Tasks generated successfully",
        updatedData: mockGeneratedTasks,
      });

      render(<MaintenanceTasksContent fmecaData={mockFMECAData} />);

      const generateButton = screen.getByRole("button", {
        name: /Generate Tasks with AI/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledTimes(1);
      });

      expect(mockSendMessage).toHaveBeenCalledWith(
        [
          {
            id: "1",
            type: "user",
            content:
              "Create a table of maintenance tasks based on the FMECA including columns for asset, component, failure mode, task description, frequency, maintenance type",
            timestamp: expect.any(Date),
          },
        ],
        mockFMECAData,
        Object.keys(mockFMECAData[0] || {})
      );
    });

    it("should show loading state when generating tasks", async () => {
      // Mock a delayed response to test loading state
      mockSendMessage.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  response: "Tasks generated",
                  updatedData: mockGeneratedTasks,
                }),
              100
            )
          )
      );

      render(<MaintenanceTasksContent fmecaData={mockFMECAData} />);

      const generateButton = screen.getByRole("button", {
        name: /Generate Tasks with AI/i,
      });
      fireEvent.click(generateButton);

      // Check that button shows loading state
      expect(screen.getByText("Generating Tasks...")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Generating Tasks/i })
      ).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.queryByText("Generating Tasks...")
        ).not.toBeInTheDocument();
      });
    });

    it("should display generated tasks when AI returns successful response", async () => {
      mockSendMessage.mockResolvedValue({
        response: "Generated maintenance tasks successfully",
        updatedData: mockGeneratedTasks,
      });

      render(<MaintenanceTasksContent fmecaData={mockFMECAData} />);

      const generateButton = screen.getByRole("button", {
        name: /Generate Tasks with AI/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(
          screen.getByText("Generated Maintenance Tasks")
        ).toBeInTheDocument();
      });

      expect(screen.getByText("2 tasks")).toBeInTheDocument();
      expect(screen.getByTestId("fmeca-table")).toBeInTheDocument();
      expect(screen.getByTestId("table-data-length")).toHaveTextContent("2");
    });

    it("should show success toast when tasks are generated successfully", async () => {
      mockSendMessage.mockResolvedValue({
        response: "Success",
        updatedData: mockGeneratedTasks,
      });

      render(<MaintenanceTasksContent fmecaData={mockFMECAData} />);

      const generateButton = screen.getByRole("button", {
        name: /Generate Tasks with AI/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          "Maintenance tasks generated successfully!",
          {
            description:
              "Generated 2 maintenance tasks based on your FMECA analysis",
          }
        );
      });
    });

    it("should extract and set columns correctly from generated data", async () => {
      mockSendMessage.mockResolvedValue({
        response: "Success",
        updatedData: mockGeneratedTasks,
      });

      render(<MaintenanceTasksContent fmecaData={mockFMECAData} />);

      const generateButton = screen.getByRole("button", {
        name: /Generate Tasks with AI/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        // Now we expect the columns to be passed as proper column definition objects
        // The mock still receives the header names
        expect(screen.getByTestId("table-columns")).toHaveTextContent(
          "Asset,Component,Failure Mode,Task Description,Frequency,Maintenance Type"
        );
      });
    });
  });

  describe("Error Handling", () => {
    const mockFMECAData = sampleFMECAData.slice(0, 2);

    it("should show error toast when AI returns no structured data", async () => {
      mockSendMessage.mockResolvedValue({
        response: "I cannot generate tasks",
        updatedData: null,
      });

      render(<MaintenanceTasksContent fmecaData={mockFMECAData} />);

      const generateButton = screen.getByRole("button", {
        name: /Generate Tasks with AI/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          "Failed to generate structured tasks",
          {
            description:
              "The AI didn't return properly formatted maintenance tasks. Please try again.",
          }
        );
      });
    });

    it("should show error toast when AI returns empty data array", async () => {
      mockSendMessage.mockResolvedValue({
        response: "Success",
        updatedData: [],
      });

      render(<MaintenanceTasksContent fmecaData={mockFMECAData} />);

      const generateButton = screen.getByRole("button", {
        name: /Generate Tasks with AI/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          "Failed to generate structured tasks",
          {
            description:
              "The AI didn't return properly formatted maintenance tasks. Please try again.",
          }
        );
      });
    });

    it("should show error toast when sendMessage throws an error", async () => {
      mockSendMessage.mockRejectedValue(new Error("Network error"));

      render(<MaintenanceTasksContent fmecaData={mockFMECAData} />);

      const generateButton = screen.getByRole("button", {
        name: /Generate Tasks with AI/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith("Failed to generate tasks", {
          description:
            "There was an error generating maintenance tasks. Please try again.",
        });
      });
    });

    it("should reset loading state after error", async () => {
      mockSendMessage.mockRejectedValue(new Error("Network error"));

      render(<MaintenanceTasksContent fmecaData={mockFMECAData} />);

      const generateButton = screen.getByRole("button", {
        name: /Generate Tasks with AI/i,
      });
      fireEvent.click(generateButton);

      // Should show loading state initially
      expect(screen.getByText("Generating Tasks...")).toBeInTheDocument();

      await waitFor(() => {
        expect(
          screen.queryByText("Generating Tasks...")
        ).not.toBeInTheDocument();
      });

      // Button should be enabled again
      expect(
        screen.getByRole("button", { name: /Generate Tasks with AI/i })
      ).not.toBeDisabled();
    });
  });

  describe("Generated Tasks Display", () => {
    const mockFMECAData = sampleFMECAData.slice(0, 2);
    const mockGeneratedTasks = [
      {
        Asset: "Conveyor",
        Component: "Motor",
        "Failure Mode": "Bearing failure",
        "Task Description": "Motor bearing inspection",
        Frequency: "Monthly",
        "Maintenance Type": "Inspection",
      },
      {
        Asset: "Pump",
        Component: "Impeller",
        "Failure Mode": "Wear",
        "Task Description": "Impeller wear check",
        Frequency: "Quarterly",
        "Maintenance Type": "Condition Monitoring",
      },
      {
        Asset: "Belt",
        Component: "Drive",
        "Failure Mode": "Tension loss",
        "Task Description": "Belt tension adjustment",
        Frequency: "Weekly",
        "Maintenance Type": "Adjustment",
      },
    ];

    it("should display correct task count after generation", async () => {
      mockSendMessage.mockResolvedValue({
        response: "Success",
        updatedData: mockGeneratedTasks,
      });

      render(<MaintenanceTasksContent fmecaData={mockFMECAData} />);

      const generateButton = screen.getByRole("button", {
        name: /Generate Tasks with AI/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText("3 tasks generated")).toBeInTheDocument();
        expect(screen.getByText("3 tasks")).toBeInTheDocument();
      });
    });

    it("should render all generated task data in the table", async () => {
      mockSendMessage.mockResolvedValue({
        response: "Success",
        updatedData: mockGeneratedTasks,
      });

      render(<MaintenanceTasksContent fmecaData={mockFMECAData} />);

      const generateButton = screen.getByRole("button", {
        name: /Generate Tasks with AI/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId("table-data-length")).toHaveTextContent("3");
      });

      // Check that specific task data is rendered
      expect(screen.getByTestId("cell-Asset-0")).toHaveTextContent("Conveyor");
      expect(screen.getByTestId("cell-Component-1")).toHaveTextContent(
        "Impeller"
      );
      expect(screen.getByTestId("cell-Maintenance Type-2")).toHaveTextContent(
        "Adjustment"
      );
    });

    it("should show both FMECA entries count and generated tasks count", async () => {
      mockSendMessage.mockResolvedValue({
        response: "Success",
        updatedData: mockGeneratedTasks,
      });

      render(<MaintenanceTasksContent fmecaData={mockFMECAData} />);

      const generateButton = screen.getByRole("button", {
        name: /Generate Tasks with AI/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText("2 FMECA entries")).toBeInTheDocument();
        expect(screen.getByText("3 tasks generated")).toBeInTheDocument();
      });
    });
  });

  describe("Integration with TanStackFMECATable", () => {
    const mockFMECAData = sampleFMECAData.slice(0, 1);
    const mockGeneratedTasks = [
      {
        Asset: "Test Asset",
        Component: "Test Component",
        "Task Description": "Test task",
      },
    ];

    it("should pass correct props to TanStackFMECATable", async () => {
      mockSendMessage.mockResolvedValue({
        response: "Success",
        updatedData: mockGeneratedTasks,
      });

      render(<MaintenanceTasksContent fmecaData={mockFMECAData} />);

      const generateButton = screen.getByRole("button", {
        name: /Generate Tasks with AI/i,
      });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId("fmeca-table")).toBeInTheDocument();
      });

      expect(screen.getByTestId("table-data-length")).toHaveTextContent("1");
      expect(screen.getByTestId("table-columns")).toHaveTextContent(
        "Asset,Component,Task Description"
      );
    });
  });
});
