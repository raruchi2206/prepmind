const fs = require("fs");
const KnowledgeSource = require("../models/KnowledgeSource");
const KnowledgeChunk = require("../models/KnowledgeChunk");
const { createHttpError } = require("../middleware/errorMiddleware");
const { validateObjectId } = require("../utils/security");
const { createChunksFromExtractedItems } = require("../utils/chunker");

const { extractPdf } = require("./extractors/pdfExtractor");
const { extractDocx } = require("./extractors/docxExtractor");
const { extractPptx } = require("./extractors/pptxExtractor");
const { extractTxt } = require("./extractors/txtExtractor");

async function extractContent(source) {
  if (source.type !== "YOUTUBE" && (!source.filePath || !fs.existsSync(source.filePath))) {
    throw createHttpError(400, "Physical document file is missing from storage.");
  }

  switch (source.type) {
    case "PDF":
      return await extractPdf(source.filePath);
    case "DOCX":
      return await extractDocx(source.filePath);
    case "PPTX":
      return await extractPptx(source.filePath);
    case "TXT":
      return await extractTxt(source.filePath);
    case "YOUTUBE":
      throw createHttpError(
        400,
        "YouTube video transcript processing is reserved for the YouTube ingestion module.",
      );
    default:
      throw createHttpError(400, `Unsupported source type: ${source.type}`);
  }
}

async function processKnowledgeSource(sourceId, userId) {
  validateObjectId(sourceId, "Knowledge source ID");

  const source = await KnowledgeSource.findOne({ _id: sourceId, userId });
  if (!source) {
    throw createHttpError(404, "Knowledge source not found");
  }

  try {
    // 1. EXTRACTING_CONTENT
    source.status = "EXTRACTING_CONTENT";
    source.errorMessage = null;
    await source.save();

    const extracted = await extractContent(source);

    if (!extracted.items || extracted.items.length === 0) {
      throw createHttpError(400, "No extractable text found in document.");
    }

    // 2. CLEANING_CONTENT
    source.status = "CLEANING_CONTENT";
    await source.save();

    // 3. CHUNKING
    source.status = "CHUNKING";
    await source.save();

    const chunks = createChunksFromExtractedItems(extracted.items, {
      userId,
      knowledgeSourceId: source._id,
      sourceType: source.type,
      originalFileName: source.originalFileName,
    });

    if (chunks.length === 0) {
      throw createHttpError(400, "Document produced no usable content chunks.");
    }

    // Clean up any previous chunks (reprocessing safety)
    await KnowledgeChunk.deleteMany({ knowledgeSourceId: source._id });

    // Save chunks to MongoDB
    await KnowledgeChunk.insertMany(chunks);

    // 4. BUILDING_KNOWLEDGE
    source.status = "BUILDING_KNOWLEDGE";
    await source.save();

    // 5. READY
    source.metadata = {
      pageCount: extracted.metadata?.pageCount ?? source.metadata?.pageCount ?? 0,
      wordCount: extracted.metadata?.wordCount ?? 0,
      chunkCount: chunks.length,
    };
    source.status = "READY";
    source.errorMessage = null;
    await source.save();

    return {
      knowledgeSource: source.toSafeObject(),
      chunkCount: chunks.length,
    };
  } catch (error) {
    source.status = "FAILED";
    source.errorMessage = error.message || "Failed to ingest knowledge document";
    await source.save().catch(() => {});

    // Clean up partial chunks on failure
    await KnowledgeChunk.deleteMany({ knowledgeSourceId: source._id }).catch(() => {});

    throw error;
  }
}

async function getKnowledgeChunks(sourceId, userId) {
  validateObjectId(sourceId, "Knowledge source ID");

  // Verify source ownership first
  const source = await KnowledgeSource.findOne({ _id: sourceId, userId });
  if (!source) {
    throw createHttpError(404, "Knowledge source not found");
  }

  const chunks = await KnowledgeChunk.find({
    knowledgeSourceId: sourceId,
    userId,
  }).sort({ chunkIndex: 1 });

  return chunks.map((c) => c.toSafeObject());
}

module.exports = {
  processKnowledgeSource,
  getKnowledgeChunks,
};
