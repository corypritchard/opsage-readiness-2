import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import * as documentProcessingService from "@/services/documentProcessingService";
import {
  extractTextFromFile,
  normalizeTextContent,
  generateFileMetadata,
} from "@/services/documentUtils";

/**
 * Document processing status
 */
export type ProcessingStatus =
  | "idle"
  | "extracting"
  | "uploading"
  | "chunking"
  | "embedding"
  | "completed"
  | "error";

/**
 * Document processing result
 */
export interface ProcessingResult {
  documentId: string;
  fileName: string;
  status: ProcessingStatus;
  error?: string;
  chunkCount?: number;
  progress?: number;
}

/**
 * Custom hook for document processing workflow
 */
export const useDocumentProcessor = () => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [processingResults, setProcessingResults] = useState<
    ProcessingResult[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Process a file through the entire pipeline
   */
  const processFile = async (
    file: File,
    assetId?: string,
    description?: string
  ) => {
    if (!user?.id || !currentProject?.id) {
      setError("Authentication or project data missing");
      return null;
    }

    try {
      setIsProcessing(true);
      setStatus("extracting");
      setProgress(10);
      setError(null);

      // Add a placeholder result
      const tempId = `temp-${Date.now()}`;
      const newResult: ProcessingResult = {
        documentId: tempId,
        fileName: file.name,
        status: "extracting",
        progress: 10,
      };

      setProcessingResults((prev) => [...prev, newResult]);

      // Extract text content from the file
      const rawContent = await extractTextFromFile(file);
      setProgress(30);

      // Normalize the text content
      const normalizedContent = normalizeTextContent(rawContent);

      // Generate basic metadata
      const fileMetadata = generateFileMetadata(file);

      // Update status
      setStatus("uploading");
      setProgress(40);
      updateResultStatus(tempId, "uploading", 40);

      // Upload document to storage and create DB record
      const document = await documentProcessingService.uploadDocument({
        file,
        fileName: file.name,
        description,
        projectId: currentProject.id,
        assetId,
        userId: user.id,
        metadata: fileMetadata,
      });

      // Update result with real document ID
      updateResultById(tempId, {
        documentId: document.id,
        status: "chunking",
        progress: 50,
      });

      // Update status
      setStatus("chunking");
      setProgress(60);

      // Process document into chunks
      const chunkResult = await documentProcessingService.chunkDocument({
        documentId: document.id,
        content: normalizedContent,
        metadata: fileMetadata,
      });

      // Update status
      setStatus("embedding");
      setProgress(80);
      updateResultStatus(document.id, "embedding", 80);

      // Generate embeddings for chunks
      await documentProcessingService.generateEmbeddings({
        documentId: document.id,
      });

      // Mark as completed
      setStatus("completed");
      setProgress(100);
      updateResultStatus(document.id, "completed", 100, chunkResult.chunkCount);

      return document;
    } catch (err) {
      console.error("Error processing document:", err);
      setError(err.message);
      setStatus("error");

      // Update result status
      if (processingResults.length > 0) {
        const lastResult = processingResults[processingResults.length - 1];
        updateResultStatus(lastResult.documentId, "error", 0, 0, err.message);
      }

      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Process multiple files in sequence
   */
  const processMultipleFiles = async (
    files: File[],
    assetId?: string,
    description?: string
  ) => {
    const results = [];

    for (const file of files) {
      const result = await processFile(file, assetId, description);
      if (result) results.push(result);
    }

    return results;
  };

  /**
   * Helper to update a specific result by its ID
   */
  const updateResultById = (id: string, update: Partial<ProcessingResult>) => {
    setProcessingResults((prev) =>
      prev.map((result) =>
        result.documentId === id ? { ...result, ...update } : result
      )
    );
  };

  /**
   * Helper to update a result's status
   */
  const updateResultStatus = (
    id: string,
    status: ProcessingStatus,
    progress = 0,
    chunkCount?: number,
    error?: string
  ) => {
    updateResultById(id, {
      status,
      progress,
      chunkCount,
      error,
    });
  };

  /**
   * Clear all processing results
   */
  const clearResults = () => {
    setProcessingResults([]);
    setStatus("idle");
    setProgress(0);
    setError(null);
  };

  return {
    processFile,
    processMultipleFiles,
    isProcessing,
    status,
    progress,
    error,
    processingResults,
    clearResults,
  };
};
