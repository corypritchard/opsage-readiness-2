import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  uploadDocument,
  chunkDocument,
  generateEmbeddings,
  performVectorSearch,
  processDocument,
} from "./documentProcessingService";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi
            .fn()
            .mockResolvedValue({ data: { path: "test-path" }, error: null }),
        }),
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { id: "test-doc-id" }, error: null }),
          }),
        })),
        update: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: "test-doc-id", file_type: "pdf" },
              error: null,
            }),
            is: vi.fn().mockResolvedValue({
              data: [
                { id: "chunk-1", content: "test content 1" },
                { id: "chunk-2", content: "test content 2" },
              ],
              error: null,
            }),
          })),
        })),
      }),
      rpc: vi.fn().mockResolvedValue({
        data: [
          { id: "chunk-1", content: "test content 1", similarity: 0.8 },
          { id: "chunk-2", content: "test content 2", similarity: 0.7 },
        ],
        error: null,
      }),
    },
  };
});

vi.mock("openai", () => {
  return {
    OpenAI: vi.fn().mockImplementation(() => ({
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [{ embedding: [0.1, 0.2, 0.3] }],
        }),
      },
    })),
  };
});

vi.mock("./chunking", () => {
  return {
    chunk: vi.fn().mockImplementation(() => ["chunk 1", "chunk 2"]),
  };
});

describe("Document Processing Service", () => {
  // Reset mocks between tests
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadDocument", () => {
    it("should upload file to storage and create document record", async () => {
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const params = {
        file: mockFile,
        fileName: "Test Document",
        description: "Test description",
        projectId: "test-project",
        userId: "test-user",
        metadata: { test: "metadata" },
      };

      const result = await uploadDocument(params);

      expect(result).toBeDefined();
      expect(result.id).toBe("test-doc-id");
    });

    it("should handle upload errors", async () => {
      // Override mock for this specific test
      const mockSupabase = await import("@/integrations/supabase/client");
      mockSupabase.supabase.storage.from = vi.fn().mockReturnValue({
        upload: vi
          .fn()
          .mockResolvedValue({
            data: null,
            error: { message: "Upload error" },
          }),
      });

      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const params = {
        file: mockFile,
        fileName: "Test Document",
        projectId: "test-project",
        userId: "test-user",
      };

      await expect(uploadDocument(params)).rejects.toThrow(
        "Error uploading file"
      );
    });
  });

  describe("chunkDocument", () => {
    it("should process text into chunks and store them", async () => {
      const result = await chunkDocument({
        documentId: "test-doc-id",
        content: "This is test content for chunking",
      });

      expect(result).toEqual({
        documentId: "test-doc-id",
        chunkCount: 2,
      });
    });
  });

  describe("generateEmbeddings", () => {
    it("should generate embeddings for document chunks", async () => {
      const result = await generateEmbeddings({
        documentId: "test-doc-id",
      });

      expect(result).toEqual({
        documentId: "test-doc-id",
        embeddingCount: 2,
      });
    });
  });

  describe("performVectorSearch", () => {
    it("should return search results based on query embedding similarity", async () => {
      const results = await performVectorSearch("test query", "test-project");

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty("similarity");
      expect(results[0]).toHaveProperty("content");
    });
  });

  describe("processDocument", () => {
    it("should process a document through the entire pipeline", async () => {
      // Mock inner function implementations
      vi.mock(
        "./documentProcessingService",
        async (importOriginal) => {
          const mod = await importOriginal();
          return {
            ...mod,
            uploadDocument: vi.fn().mockResolvedValue({ id: "test-doc-id" }),
            chunkDocument: vi.fn().mockResolvedValue({ chunkCount: 2 }),
            generateEmbeddings: vi
              .fn()
              .mockResolvedValue({ embeddingCount: 2 }),
          };
        },
        { partial: true }
      );

      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const params = {
        file: mockFile,
        fileName: "Test Document",
        projectId: "test-project",
        userId: "test-user",
      };

      const result = await processDocument(params, "Test content");

      expect(result).toBeDefined();
      expect(result.id).toBe("test-doc-id");
    });
  });
});
