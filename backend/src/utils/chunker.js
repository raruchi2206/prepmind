const { cleanText } = require("./textCleaner");

const DEFAULT_CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || "1000", 10);
const DEFAULT_CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || "150", 10);

/**
 * Splits text into words while keeping track of approximate word counts.
 */
function getWords(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

/**
 * Recursively chunks a single text block with sliding window overlap.
 * Prefers natural boundaries (paragraphs -> sentences -> words).
 */
function chunkText(
  text,
  options = {},
) {
  const targetWords = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const overlapWords = options.chunkOverlap || DEFAULT_CHUNK_OVERLAP;

  const cleaned = cleanText(text);
  if (!cleaned) return [];

  const words = getWords(cleaned);
  if (words.length <= targetWords) {
    return [cleaned];
  }

  // Split into paragraphs first
  const paragraphs = cleaned.split(/\n\n+/).filter(Boolean);
  const chunks = [];
  let currentWords = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const pWords = getWords(paragraphs[i]);

    // If single paragraph exceeds target chunk size, split by sentences
    if (pWords.length > targetWords) {
      if (currentWords.length > 0) {
        chunks.push(currentWords.join(" "));
        // keep overlap
        currentWords = currentWords.slice(-overlapWords);
      }

      const sentences = paragraphs[i].match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [paragraphs[i]];
      for (const sentence of sentences) {
        const sWords = getWords(sentence);
        if (currentWords.length + sWords.length > targetWords && currentWords.length > 0) {
          chunks.push(currentWords.join(" "));
          currentWords = currentWords.slice(-overlapWords);
        }
        currentWords.push(...sWords);
      }
    } else {
      if (currentWords.length + pWords.length > targetWords && currentWords.length > 0) {
        chunks.push(currentWords.join(" "));
        currentWords = currentWords.slice(-overlapWords);
      }
      currentWords.push(...pWords);
    }
  }

  if (currentWords.length > 0) {
    chunks.push(currentWords.join(" "));
  }

  // Deduplicate consecutive or identical chunks and remove empty chunks
  const uniqueChunks = [];
  const seen = new Set();
  for (const c of chunks) {
    const trimmed = c.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      uniqueChunks.push(trimmed);
    }
  }

  return uniqueChunks;
}

/**
 * Creates structured KnowledgeChunk payload objects from extracted items (pages/slides/text).
 */
function createChunksFromExtractedItems(
  items,
  { userId, knowledgeSourceId, sourceType, originalFileName, chunkSize, chunkOverlap } = {},
) {
  const result = [];
  let chunkIndex = 0;

  for (const item of items) {
    const itemText = typeof item === "string" ? item : item.text;
    const page = typeof item === "object" ? item.page : null;
    const slide = typeof item === "object" ? item.slide : null;
    const section = typeof item === "object" ? item.section : null;

    const rawChunks = chunkText(itemText, { chunkSize, chunkOverlap });

    for (const text of rawChunks) {
      result.push({
        userId,
        knowledgeSourceId,
        chunkIndex: chunkIndex++,
        text,
        metadata: {
          page: page ?? null,
          slide: slide ?? null,
          section: section ?? null,
          sourceType,
          originalFileName: originalFileName ?? null,
        },
      });
    }
  }

  return result;
}

module.exports = {
  chunkText,
  createChunksFromExtractedItems,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
};
