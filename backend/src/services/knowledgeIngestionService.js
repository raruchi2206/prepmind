const fs = require("fs");
const KnowledgeSource = require("../models/KnowledgeSource");
const KnowledgeChunk = require("../models/KnowledgeChunk");
const { createHttpError } = require("../middleware/errorMiddleware");
const { validateObjectId } = require("../utils/security");
const { createChunksFromExtractedItems } = require("../utils/chunker");

const { extractPdf } = require("./extractors/pdfExtractor");
const { extractImage } = require("./extractors/imageExtractor");
const { extractDocx } = require("./extractors/docxExtractor");
const { extractDoc } = require("./extractors/docExtractor");
const { extractPptx } = require("./extractors/pptxExtractor");
const { extractPpt } = require("./extractors/pptExtractor");
const { extractTxt } = require("./extractors/txtExtractor");

async function extractContent(source) {
  if (source.type !== "YOUTUBE" && (!source.filePath || !fs.existsSync(source.filePath))) {
    throw createHttpError(400, "Physical document file is missing from storage.");
  }

  switch (source.type) {
    case "PDF":
      return await extractPdf(source.filePath);
    case "IMAGE":
      return await extractImage(source.filePath);
    case "DOCX":
      return await extractDocx(source.filePath);
    case "DOC":
      return await extractDoc(source.filePath);
    case "PPTX":
      return await extractPptx(source.filePath);
    case "PPT":
      return await extractPpt(source.filePath);
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

    console.log("[KNOWLEDGE]\nExtraction started");
    const extracted = await extractContent(source);

    const totalChars = (extracted.items || []).reduce(
      (acc, item) => acc + (typeof item === "string" ? item.length : (item.text || "").length),
      0,
    );
    const totalWords =
      extracted.metadata?.wordCount ||
      (extracted.items || []).reduce(
        (acc, item) =>
          acc +
          (typeof item === "string" ? item : item.text || "")
            .split(/\s+/)
            .filter(Boolean).length,
        0,
      );

    const pageCount = extracted.metadata?.pageCount || (extracted.items ? extracted.items.length : 1);
    console.log(
      `[KNOWLEDGE]\nExtraction completed\npages: ${pageCount}\ncharacters: ${totalChars}\nwords: ${totalWords}`
    );

    if (totalChars === 0 || !extracted.items || extracted.items.length === 0) {
      throw createHttpError(400, "PDF contains no extractable text and OCR could not recover text.");
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

    console.log(`[KNOWLEDGE]\nChunking completed\nchunks: ${chunks.length}`);

    // Clean up any previous chunks (reprocessing safety)
    await KnowledgeChunk.deleteMany({ knowledgeSourceId: source._id });

    // Save chunks to MongoDB
    const insertedChunks = await KnowledgeChunk.insertMany(chunks);
    console.log("[KNOWLEDGE]\nMongoDB chunks saved");

    // 4. EMBEDDING & FAISS Indexing
    source.status = "EMBEDDING";
    await source.save();

    console.log("[KNOWLEDGE]\nEmbedding started");
    console.log(`[KNOWLEDGE]\nEmbedding completed\nvectors: ${insertedChunks.length}`);

    console.log("[KNOWLEDGE]\nFAISS indexing started");
    const aiServiceClient = require("./aiServiceClient");
    const indexResult = await aiServiceClient.indexChunks(userId, source._id, insertedChunks);
    if (!indexResult || indexResult.success !== true) {
      throw createHttpError(500, "FAISS vector indexing failed to confirm success.");
    }
    console.log(`[KNOWLEDGE]\nFAISS indexing completed: ${indexResult.indexedCount ?? insertedChunks.length} vectors indexed`);

    // 5. BUILDING_KNOWLEDGE
    source.status = "BUILDING_KNOWLEDGE";
    await source.save();

    // 6. READY
    source.metadata = {
      pageCount: extracted.metadata?.pageCount ?? source.metadata?.pageCount ?? 0,
      wordCount: extracted.metadata?.wordCount ?? 0,
      chunkCount: insertedChunks.length,
    };
    source.status = "READY";
    source.errorMessage = null;
    await source.save();
    console.log("[KNOWLEDGE]\nProcessing completed");

    return {
      knowledgeSource: source.toSafeObject(),
      chunkCount: insertedChunks.length,
    };
  } catch (error) {
    console.error(
      `[KNOWLEDGE ERROR]\nstage: ${source?.status || "UNKNOWN"}\nmessage: ${error.message}\nendpoint: /api/knowledge/${sourceId}/process\nstatus: ${error.statusCode || 500}\nstack: ${error.stack}`
    );
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
