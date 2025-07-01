/**
 * Document Parsing Utilities
 *
 * Helper functions for extracting text content from various document types.
 * Uses PDF.js for client-side PDF text extraction.
 */

import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker using exact version match
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs";

/**
 * Extract text content from a file based on its type
 *
 * @param file - File object to extract content from
 * @returns Promise resolving to extracted text content
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type.toLowerCase();
  let content = "";

  try {
    // Handle text-based files directly
    if (
      fileType === "text/plain" ||
      fileType === "text/markdown" ||
      fileType === "text/csv" ||
      fileType.includes("javascript") ||
      fileType.includes("json")
    ) {
      content = await readTextFile(file);
    }
    // Handle PDF files
    else if (fileType === "application/pdf") {
      content = await extractTextFromPDF(file);
    }
    // Handle Word documents
    else if (
      fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileType === "application/msword"
    ) {
      content = "Word document extraction requires server-side processing.";
      // In production, use a library like mammoth.js or server-side extraction
    }
    // Handle Excel files
    else if (
      fileType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileType === "application/vnd.ms-excel"
    ) {
      content = "Excel file extraction requires server-side processing.";
      // In production, use a library like SheetJS or server-side extraction
    }
    // Default case - unsupported file type
    else {
      content = `File type ${fileType} is not directly supported for text extraction in the browser.`;
    }
  } catch (error) {
    console.error("Error extracting text from file:", error);
    throw new Error(`Failed to extract text from file: ${error.message}`);
  }

  return content;
}

/**
 * Read a text file and return its contents
 */
async function readTextFile(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error("Error reading file: No data"));
      }
    };

    reader.onerror = (error) => {
      reject(new Error(`Error reading file: ${error}`));
    };

    reader.readAsText(file);
  });
}

/**
 * Extract text content from a PDF file using PDF.js
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log(`🔍 Starting PDF text extraction for: ${file.name}`);

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log(`📄 PDF loaded with ${pdf.numPages} pages`);

    let fullText = "";

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items from the page
      const pageText = textContent.items.map((item: any) => item.str).join(" ");

      fullText += pageText + "\n\n";

      console.log(
        `📃 Extracted text from page ${pageNum}: ${pageText.length} characters`
      );
    }

    console.log(
      `✅ PDF extraction complete: ${fullText.length} total characters`
    );

    if (!fullText.trim()) {
      return "PDF appears to be empty or contains only images/scanned content that cannot be extracted as text.";
    }

    return fullText.trim();
  } catch (error) {
    console.error("❌ PDF extraction failed:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Generate basic metadata about a file
 */
export function generateFileMetadata(file: File): Record<string, any> {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified).toISOString(),
  };
}

/**
 * Normalize a document's text content
 * - Removes excessive whitespace
 * - Converts all line endings to \n
 * - Removes control characters
 */
export function normalizeTextContent(text: string): string {
  if (!text) return "";

  return (
    text
      // Normalize line endings
      .replace(/\r\n/g, "\n")
      // Replace multiple newlines with at most two
      .replace(/\n{3,}/g, "\n\n")
      // Replace multiple spaces with single space
      .replace(/ {2,}/g, " ")
      // Remove control characters
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Trim leading/trailing whitespace
      .trim()
  );
}
