/**
 * Document Parsing Utilities
 *
 * Helper functions for extracting text content from various document types.
 * Note: For production use, this would likely be handled server-side.
 */

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
      content =
        "PDF text extraction requires server-side processing or a client-side PDF library.";
      // For a production implementation, consider using pdf.js or server-side extraction
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
