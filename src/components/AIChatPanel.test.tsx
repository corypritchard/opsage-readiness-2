import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AIChatPanel } from "./AIChatPanel";
import React from "react";

// Mock the useAIChat hook
jest.mock("../hooks/useAIChat", () => ({
  useAIChat: () => ({
    sendMessage: jest.fn(async (_messages, _fmecaData, _columns, chatMode) => {
      if (chatMode === "ask") {
        return {
          response: "This is an AI answer.",
          updatedData: undefined,
          diff: null,
          validation: undefined,
        };
      } else {
        return {
          response: "Edit complete.",
          updatedData: [{ id: 1, value: "edited" }],
          diff: { added: [], modified: [], deleted: [] },
          validation: undefined,
        };
      }
    }),
    isLoading: false,
    error: null,
  }),
}));

describe("AIChatPanel", () => {
  const defaultProps = {
    fmecaData: [],
    columns: [],
    onDataUpdate: jest.fn(),
    onStageChanges: jest.fn(),
    onAcceptChanges: jest.fn(),
    onRevertChanges: jest.fn(),
    hasStagedChanges: false,
  };

  it("can send a message in ask mode and display AI response", async () => {
    render(<AIChatPanel {...defaultProps} />);
    // Switch to Ask mode
    fireEvent.click(screen.getByText(/Ask/i));
    // Type a message
    fireEvent.change(screen.getByPlaceholderText(/Ask a question/i), {
      target: { value: "What is FMECA?" },
    });
    // Send the message
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    // Wait for AI response
    await waitFor(() => {
      expect(screen.getByText("This is an AI answer.")).toBeInTheDocument();
    });
  });

  it("can send a message in edit mode and display AI response", async () => {
    render(<AIChatPanel {...defaultProps} />);
    // Ensure in Edit mode
    fireEvent.click(screen.getByText(/Edit/i));
    // Type a message
    fireEvent.change(screen.getByPlaceholderText(/Describe the changes/i), {
      target: { value: "Edit row 1" },
    });
    // Send the message
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    // Wait for AI response
    await waitFor(() => {
      expect(screen.getByText("Edit complete.")).toBeInTheDocument();
    });
  });
});
