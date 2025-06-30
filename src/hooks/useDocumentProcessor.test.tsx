import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDocumentProcessor } from "./useDocumentProcessor";

// Mock dependencies
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "test-user-id" },
  })),
}));

vi.mock("@/contexts/ProjectContext", () => ({
  useProject: vi.fn(() => ({
    currentProject: { id: "test-project-id" },
  })),
}));

vi.mock("@/services/documentProcessingService", () => ({
  uploadDocument: vi.fn().mockResolvedValue({
    id: "test-doc-id",
    name: "test-document.pdf",
  }),
  chunkDocument: vi.fn().mockResolvedValue({
    documentId: "test-doc-id",
    chunkCount: 5,
  }),
  generateEmbeddings: vi.fn().mockResolvedValue({
    documentId: "test-doc-id",
    embeddingCount: 5,
  }),
}));

vi.mock("@/services/documentUtils", () => ({
  extractTextFromFile: vi
    .fn()
    .mockResolvedValue("Test content extracted from file"),
  normalizeTextContent: vi.fn((text) => text + " (normalized)"),
  generateFileMetadata: vi.fn(() => ({ size: 1024, type: "application/pdf" })),
}));

describe("useDocumentProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useDocumentProcessor());

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.status).toBe("idle");
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.processingResults).toEqual([]);
  });

  it("should process a file through the entire pipeline", async () => {
    const { result } = renderHook(() => useDocumentProcessor());

    const mockFile = new File(["test content"], "test.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      await result.current.processFile(
        mockFile,
        "test-asset-id",
        "Test description"
      );
    });

    await waitFor(() => {
      expect(result.current.status).toBe("completed");
      expect(result.current.progress).toBe(100);
      expect(result.current.isProcessing).toBe(false);

      // Check that the processing results were updated
      expect(result.current.processingResults.length).toBe(1);
      expect(result.current.processingResults[0].status).toBe("completed");
      expect(result.current.processingResults[0].chunkCount).toBe(5);
    });
  });

  it("should handle missing auth or project data", async () => {
    // Mock missing auth data for this specific test
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
    } as any);

    const { result } = renderHook(() => useDocumentProcessor());

    const mockFile = new File(["test content"], "test.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      const processResult = await result.current.processFile(mockFile);
      expect(processResult).toBeNull();
    });

    expect(result.current.error).toBe("Authentication or project data missing");
  });

  it("should handle processing multiple files sequentially", async () => {
    const { result } = renderHook(() => useDocumentProcessor());

    const mockFiles = [
      new File(["test content 1"], "test1.pdf", { type: "application/pdf" }),
      new File(["test content 2"], "test2.pdf", { type: "application/pdf" }),
    ];

    await act(async () => {
      await result.current.processMultipleFiles(mockFiles, "test-asset-id");
    });

    expect(result.current.processingResults.length).toBe(2);
  });

  it("should handle errors during processing", async () => {
    // Mock an error in one of the processing steps
    const mockError = new Error("Processing failed");
    vi.mocked(extractTextFromFile).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useDocumentProcessor());

    const mockFile = new File(["test content"], "test.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      await result.current.processFile(mockFile);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Processing failed");
    expect(result.current.processingResults[0].status).toBe("error");
    expect(result.current.processingResults[0].error).toBe("Processing failed");
  });

  it("should clear processing results", () => {
    const { result } = renderHook(() => useDocumentProcessor());

    // Set some mock results first
    act(() => {
      result.current.processingResults = [
        {
          documentId: "test-id",
          fileName: "test.pdf",
          status: "completed",
          progress: 100,
        },
      ] as any;
      result.current.status = "completed";
      result.current.progress = 100;
      result.current.error = "Previous error";
    });

    act(() => {
      result.current.clearResults();
    });

    expect(result.current.processingResults).toEqual([]);
    expect(result.current.status).toBe("idle");
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });
});
