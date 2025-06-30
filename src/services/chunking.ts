/**
 * Text Chunking Utilities
 *
 * These utilities help split documents into smaller chunks for processing and embedding.
 */

/**
 * Split text into chunks with overlap
 *
 * @param text - The text to split into chunks
 * @param chunkSize - Maximum chunk size (in characters)
 * @param overlap - Number of characters to overlap between chunks
 * @returns Array of chunked text
 */
export function chunk(text: string, chunkSize = 500, overlap = 100): string[] {
  if (!text) return [];
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    // Calculate the end index for this chunk
    let endIndex = startIndex + chunkSize;

    // If we're not at the end of the text, find a better splitting point
    if (endIndex < text.length) {
      // Look for paragraph breaks first (most natural break)
      const paragraphBreakIndex = findLastOccurrence(
        text,
        ["\n\n", "\r\n\r\n"],
        startIndex,
        endIndex
      );
      if (paragraphBreakIndex > startIndex + chunkSize / 2) {
        endIndex = paragraphBreakIndex;
      } else {
        // Try to split at a sentence ending (.!?)
        const sentenceEndIndex = findLastOccurrence(
          text,
          [". ", "! ", "? ", ".\n", "!\n", "?\n"],
          startIndex,
          endIndex
        );
        if (sentenceEndIndex > startIndex + chunkSize / 2) {
          endIndex = sentenceEndIndex;
        } else {
          // Last resort: split at word boundary
          const spaceIndex = text.lastIndexOf(" ", endIndex);
          if (spaceIndex > startIndex + chunkSize / 2) {
            endIndex = spaceIndex;
          }
        }
      }
    }

    // Extract the chunk and add it to results
    const chunk = text.substring(startIndex, endIndex).trim();
    if (chunk) chunks.push(chunk);

    // Move to next chunk with overlap
    startIndex = endIndex - overlap;

    // Make sure we're making forward progress
    if (startIndex <= 0 || startIndex >= text.length - 1) break;
  }

  return chunks;
}

/**
 * Find the last occurrence of any delimiter before the end index
 */
function findLastOccurrence(
  text: string,
  delimiters: string[],
  startIndex: number,
  endIndex: number
): number {
  let lastIndex = -1;

  for (const delimiter of delimiters) {
    let index = text.lastIndexOf(delimiter, endIndex);
    if (index > startIndex && index > lastIndex) {
      lastIndex = index + delimiter.length;
    }
  }

  return lastIndex;
}

/**
 * Estimate the token count for a text string
 * This is a rough estimate - GPT tokenizers are more complex
 *
 * @param text - The text to estimate tokens for
 * @returns Approximate token count
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;

  // Roughly 4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Chunk text based on token count instead of character count
 *
 * @param text - The text to split into chunks
 * @param maxTokens - Maximum tokens per chunk
 * @param overlapTokens - Tokens to overlap between chunks
 * @returns Array of chunked text
 */
export function chunkByTokens(
  text: string,
  maxTokens = 250,
  overlapTokens = 50
): string[] {
  // Convert token counts to approximate character counts
  const chunkSize = maxTokens * 4;
  const overlap = overlapTokens * 4;

  return chunk(text, chunkSize, overlap);
}
