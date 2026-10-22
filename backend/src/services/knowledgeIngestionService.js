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
const { extractYouTube } = require("./extractors/youtubeExtractor");
<<<<<<< HEAD

const PROCESSABLE_STATUSES = ["UPLOADING", "READY", "FAILED"];
// A run that has not updated its status for this long is treated as abandoned
const STALE_PROCESSING_MS = 20 * 60 * 1000;

function elapsedSeconds(startedAt) {
  return Number(((Date.now() - startedAt) / 1000).toFixed(2));
}

function describeIndexingError(error) {
  const text = `${error?.message || ""} ${error?.cause?.code || ""}`;
  if (/ECONNREFUSED|fetch failed|ENOTFOUND|EAI_AGAIN|timeout|connection attempts failed/i.test(text)) {
    return createHttpError(
      503,
      "Embedding service unavailable. Make sure the AI service and Ollama are running, then retry.",
      "EMBEDDING_SERVICE_UNAVAILABLE",
    );
  }
  if (/embedding|ollama/i.test(text)) {
    return createHttpError(
      503,
      `Embedding service unavailable: ${error.message}`,
      "EMBEDDING_SERVICE_UNAVAILABLE",
    );
  }
  return createHttpError(
    500,
    `Indexing failed: ${error?.message || "unknown error"}`,
    "INDEXING_FAILED",
  );
}
=======
>>>>>>> ab8a428 (Uploading of folder,ppt and youtube video link are enabled and quiz generation happening)

async function extractContent(source) {
  if (source.type === "YOUTUBE") {
    return await extractYouTube(source);
  }

  if (!source.filePath || !fs.existsSync(source.filePath)) {
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
<<<<<<< HEAD
=======
    case "YOUTUBE": {
      const url = source.youtubeUrl || source.filePath;
      if (!url) {
        throw createHttpError(400, "YouTube video URL is missing from knowledge source.");
      }
      return await extractYouTube(url);
    }
>>>>>>> ab8a428 (Uploading of folder,ppt and youtube video link are enabled and quiz generation happening)
    default:
      throw createHttpError(400, `Unsupported source type: ${source.type}`);
  }
}

async function processKnowledgeSource(sourceId, userId) {
  validateObjectId(sourceId, "Knowledge source ID");

  const existing = await KnowledgeSource.exists({ _id: sourceId, userId });
  if (!existing) {
    throw createHttpError(404, "Knowledge source not found");
  }

  // Atomically claim the source so concurrent retries cannot create duplicate chunks
  const source = await KnowledgeSource.findOneAndUpdate(
    {
      _id: sourceId,
      userId,
      $or: [
        { status: { $in: PROCESSABLE_STATUSES } },
        { updatedAt: { $lt: new Date(Date.now() - STALE_PROCESSING_MS) } },
      ],
    },
    { $set: { status: "EXTRACTING_CONTENT", errorMessage: null } },
    { returnDocument: "after" },
  );
  if (!source) {
    throw createHttpError(
      409,
      "This source is already being processed. Please wait for it to finish.",
      "SOURCE_PROCESSING",
    );
  }

  const pipelineStartedAt = Date.now();
  const timings = {};

  try {
    // 1. EXTRACTING_CONTENT
    console.log(`[KNOWLEDGE]\nExtraction started (${source.type})`);
    let stageStartedAt = Date.now();
    const extracted = await extractContent(source);
    timings.extractionSeconds = elapsedSeconds(stageStartedAt);

    if (source.type === "YOUTUBE" && extracted.youtube) {
      const autoTitle = Boolean(source.youtube?.autoTitle);
      source.set("youtube.channel", extracted.youtube.channel);
      source.set("youtube.language", extracted.youtube.language);
      source.set("youtube.languageCode", extracted.youtube.languageCode);
      source.set("youtube.isGenerated", extracted.youtube.isGenerated);
      source.set("youtube.durationSeconds", extracted.youtube.durationSeconds);
      source.set("youtube.segmentCount", extracted.youtube.segmentCount);
      if (autoTitle && extracted.youtube.title) {
        source.title = extracted.youtube.title.slice(0, 200);
      }
    }

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
<<<<<<< HEAD
      if (source.type === "YOUTUBE") {
        throw createHttpError(422, "The transcript for this video is empty.", "EMPTY_TRANSCRIPT");
      }
      throw createHttpError(400, "PDF contains no extractable text and OCR could not recover text.");
=======
      throw createHttpError(400, "Document contains no extractable text.");
    }

    if (source.type === "YOUTUBE" && extracted.metadata?.title) {
      if (!source.title || source.title === "YouTube Video Knowledge" || source.title === "YouTube Video") {
        source.title = extracted.metadata.title;
      }
      source.originalFileName = extracted.metadata.title;
      await source.save();
>>>>>>> ab8a428 (Uploading of folder,ppt and youtube video link are enabled and quiz generation happening)
    }

    // 2. CLEANING_CONTENT
    source.status = "CLEANING_CONTENT";
    await source.save();

    // 3. CHUNKING
    source.status = "CHUNKING";
    await source.save();
    stageStartedAt = Date.now();

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
    timings.chunkingSeconds = elapsedSeconds(stageStartedAt);

    // 4. EMBEDDING & FAISS Indexing
    source.status = "EMBEDDING";
    await source.save();

    console.log("[KNOWLEDGE]\nEmbedding + FAISS indexing started");
    const aiServiceClient = require("./aiServiceClient");
    stageStartedAt = Date.now();
    let indexResult;
    try {
      indexResult = await aiServiceClient.indexChunks(userId, source._id, insertedChunks);
    } catch (indexError) {
      throw describeIndexingError(indexError);
    }
    if (!indexResult || indexResult.success !== true) {
      throw createHttpError(500, "Indexing failed: FAISS did not confirm success.", "INDEXING_FAILED");
    }
    if (
      typeof indexResult.indexedCount === "number" &&
      indexResult.indexedCount !== insertedChunks.length
    ) {
      throw createHttpError(
        500,
        `Indexing failed: ${indexResult.indexedCount} of ${insertedChunks.length} chunks were indexed.`,
        "INDEXING_FAILED",
      );
    }
    timings.indexingSeconds = elapsedSeconds(stageStartedAt);
    console.log(`[KNOWLEDGE]\nFAISS indexing completed: ${indexResult.indexedCount ?? insertedChunks.length} vectors indexed`);

    // 5. BUILDING_KNOWLEDGE
    source.status = "BUILDING_KNOWLEDGE";
    await source.save();

    // 6. READY
    source.metadata = {
      pageCount: extracted.metadata?.pageCount ?? source.metadata?.pageCount ?? 0,
      wordCount: extracted.metadata?.wordCount ?? 0,
      chunkCount: insertedChunks.length,
<<<<<<< HEAD
      processingTimes: {
        ...timings,
        totalSeconds: elapsedSeconds(pipelineStartedAt),
      },
=======
      duration: extracted.metadata?.formattedDuration ?? null,
      videoId: extracted.metadata?.videoId ?? null,
      videoUrl: extracted.metadata?.videoUrl ?? source.youtubeUrl ?? null,
>>>>>>> ab8a428 (Uploading of folder,ppt and youtube video link are enabled and quiz generation happening)
    };
    source.status = "READY";
    source.errorMessage = null;
    await source.save();
    console.log("[KNOWLEDGE]\nProcessing completed");

    return {
      knowledgeSource: source.toSafeObject(),
      chunkCount: insertedChunks.length,
      processingTimes: source.metadata.processingTimes,
    };
  } catch (error) {
    console.error(
      `[KNOWLEDGE ERROR]\nstage: ${source?.status || "UNKNOWN"}\nmessage: ${error.message}\nendpoint: /api/knowledge/${sourceId}/process\nstatus: ${error.statusCode || 500}\nstack: ${error.stack}`
    );
    source.status = "FAILED";
    source.errorMessage = error.message || "Failed to ingest knowledge document";
    source.set("metadata.chunkCount", 0);
    await source.save().catch(() => {});

    // Clean up partial chunks and their vectors on failure
    await KnowledgeChunk.deleteMany({ knowledgeSourceId: source._id }).catch(() => {});
    await require("./aiServiceClient")
      .deleteSourceVectors(userId, source._id)
      .catch(() => {});

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
