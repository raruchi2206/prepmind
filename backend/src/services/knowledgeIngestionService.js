const fs = require("fs");
const mongoose = require("mongoose");
const KnowledgeSource = require("../models/KnowledgeSource");
const KnowledgeChunk = require("../models/KnowledgeChunk");
const { createHttpError } = require("../middleware/errorMiddleware");
const { validateObjectId } = require("../utils/security");
const { createChunksFromExtractedItems } = require("../utils/chunker");
const aiServiceClient = require("./aiServiceClient");
const processingJobs = require("./processingJobs");
const { notifySourceEvent } = require("./notificationService");

const { extractPdf } = require("./extractors/pdfExtractor");
const { extractImage } = require("./extractors/imageExtractor");
const { extractDocx } = require("./extractors/docxExtractor");
const { extractDoc } = require("./extractors/docExtractor");
const { extractPptx } = require("./extractors/pptxExtractor");
const { extractPpt } = require("./extractors/pptExtractor");
const { extractTxt } = require("./extractors/txtExtractor");
const { extractYouTube } = require("./extractors/youtubeExtractor");

const PROCESSABLE_STATUSES = ["UPLOADING", "READY", "FAILED", "CANCELLED", "AWAITING_REVIEW"];
const ACTIVE_STATUSES = ["QUEUED", "EXTRACTING_CONTENT", "CLASSIFYING", "CLEANING_CONTENT", "CHUNKING", "EMBEDDING", "BUILDING_KNOWLEDGE"];
// A run that has not updated its status for this long is treated as abandoned
const STALE_PROCESSING_MS = 20 * 60 * 1000;
const CANCEL_ACK_TIMEOUT_MS = 30 * 1000;

function elapsedSeconds(startedAt) {
  return Number(((Date.now() - startedAt) / 1000).toFixed(2));
}

function describeIndexingError(error) {
  const text = `${error?.message || ""} ${error?.cause?.code || ""}`;
  if (/ECONNREFUSED|fetch failed|ENOTFOUND|EAI_AGAIN|timeout|connection attempts failed/i.test(text)) {
    return createHttpError(
      503,
      "Embedding service unavailable. Make sure the AI service is running, then retry.",
      "EMBEDDING_SERVICE_UNAVAILABLE",
    );
  }
  if (/embedding/i.test(text)) {
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

async function extractContent(source, signal) {
  if (source.type === "YOUTUBE") {
    return await extractYouTube(source, { signal });
  }

  if (!source.filePath || !fs.existsSync(source.filePath)) {
    throw createHttpError(400, "Physical document file is missing from storage. Delete this source and upload the file again.");
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
    default:
      throw createHttpError(400, `Unsupported source type: ${source.type}`);
  }
}

/**
 * Decides whether a YouTube transcript may continue to indexing. Educational content
 * continues automatically; anything else waits for the user's decision.
 */
async function classifyTranscript(source, extracted, signal) {
  const previous = source.classification;
  if (previous?.decision === "APPROVED") {
    return { proceed: true };
  }

  const text = extracted.items.map((item) => item.text).join(" ");
  let result;
  try {
    result = await aiServiceClient.classifyEducationalContent(
      { title: source.title, text, wordCount: extracted.metadata?.wordCount },
      { signal },
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    console.warn(`[KNOWLEDGE] Educational classification unavailable: ${error.message}`);
    result = {
      label: "UNCERTAIN",
      confidence: 0,
      topic: null,
      reason: "The relevance check could not be completed, so this video needs your review.",
      evidence: [],
      method: "unavailable",
    };
  }

  const educational = result.label === "EDUCATIONAL";
  source.classification = {
    label: result.label,
    confidence: result.confidence,
    topic: result.topic,
    reason: result.reason,
    evidence: result.evidence || [],
    method: result.method,
    classifiedAt: new Date(),
    decision: educational ? "AUTO_APPROVED" : null,
    decidedAt: educational ? new Date() : null,
  };
  return { proceed: educational, classification: result };
}

async function finishWithoutIndexing(source, status, errorMessage, hadIndexedContent) {
  // A failed or cancelled reprocess leaves the previous complete index in place
  if (hadIndexedContent) {
    const keptChunks = await KnowledgeChunk.countDocuments({ knowledgeSourceId: source._id });
    if (keptChunks > 0) {
      source.status = "READY";
      source.errorMessage =
        status === "CANCELLED"
          ? "Reprocessing was cancelled. The previously indexed version is still available."
          : `Reprocessing failed (${errorMessage}). The previously indexed version is still available.`;
      source.set("metadata.chunkCount", keptChunks);
      source.processingJobId = null;
      await source.save().catch(() => {});
      return;
    }
  }
  source.status = status;
  source.errorMessage = errorMessage;
  source.set("metadata.chunkCount", 0);
  source.processingJobId = null;
  await source.save().catch(() => {});
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
    { $set: { status: "QUEUED", errorMessage: null } },
    { returnDocument: "after" },
  );
  if (!source) {
    throw createHttpError(
      409,
      "This source is already being processed. Please wait for it to finish.",
      "SOURCE_PROCESSING",
    );
  }

  const job = processingJobs.startJob(source._id);
  const { signal } = job.controller;
  source.processingJobId = job.id;
  const hadIndexedContent = (await KnowledgeChunk.countDocuments({ knowledgeSourceId: source._id })) > 0;
  const pipelineStartedAt = Date.now();
  const timings = {};
  let stage = "QUEUED";

  const setStage = async (status) => {
    job.checkpoint();
    stage = status;
    source.status = status;
    await source.save();
  };

  try {
    // 1. Extraction
    await setStage("EXTRACTING_CONTENT");
    console.log(`[KNOWLEDGE]\nExtraction started (${source.type})`);
    let stageStartedAt = Date.now();
    const extracted = await extractContent(source, signal);
    timings.extractionSeconds = elapsedSeconds(stageStartedAt);
    job.checkpoint();

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
    console.log(
      `[KNOWLEDGE]\nExtraction completed\nitems: ${extracted.items?.length || 0}\ncharacters: ${totalChars}\nwords: ${extracted.metadata?.wordCount || 0}`,
    );

    if (totalChars === 0 || !extracted.items || extracted.items.length === 0) {
      if (source.type === "YOUTUBE") {
        throw createHttpError(422, "The transcript for this video is empty.", "EMPTY_TRANSCRIPT");
      }
      throw createHttpError(400, "This document contains no extractable text, and OCR could not recover any. Upload a text-based version and try again.");
    }

    // 2. Educational relevance (YouTube only)
    if (source.type === "YOUTUBE") {
      await setStage("CLASSIFYING");
      const decision = await classifyTranscript(source, extracted, signal);
      job.checkpoint();
      if (!decision.proceed) {
        source.status = "AWAITING_REVIEW";
        source.errorMessage = null;
        source.processingJobId = null;
        await source.save();
        notifySourceEvent(source, "AWAITING_REVIEW", source.classification.reason);
        console.log(`[KNOWLEDGE]\nAwaiting review: ${source.classification.label}`);
        return {
          knowledgeSource: source.toSafeObject(),
          awaitingReview: true,
          classification: source.toSafeObject().classification,
          chunkCount: 0,
        };
      }
    }

    // 3. Chunking (in memory; nothing is replaced until indexing succeeds)
    await setStage("CHUNKING");
    stageStartedAt = Date.now();
    const chunks = createChunksFromExtractedItems(extracted.items, {
      userId,
      knowledgeSourceId: source._id,
      sourceType: source.type,
      originalFileName: source.originalFileName,
    }).map((chunk) => ({ ...chunk, _id: new mongoose.Types.ObjectId() }));

    if (chunks.length === 0) {
      throw createHttpError(400, "Document produced no usable content chunks.");
    }
    timings.chunkingSeconds = elapsedSeconds(stageStartedAt);
    console.log(`[KNOWLEDGE]\nChunking completed\nchunks: ${chunks.length}`);

    // 4. Embedding + FAISS indexing (the AI service writes the index only after every batch succeeds)
    await setStage("EMBEDDING");
    stageStartedAt = Date.now();
    let indexResult;
    try {
      indexResult = await aiServiceClient.indexChunks(userId, source._id, chunks, { jobId: job.id, signal });
    } catch (indexError) {
      if (processingJobs.isCancellation(indexError, job)) throw new processingJobs.ProcessingCancelledError();
      throw describeIndexingError(indexError);
    }
    if (!indexResult || indexResult.success !== true) {
      throw createHttpError(500, "Indexing failed: FAISS did not confirm success.", "INDEXING_FAILED");
    }
    if (typeof indexResult.indexedCount === "number" && indexResult.indexedCount !== chunks.length) {
      throw createHttpError(
        500,
        `Indexing failed: ${indexResult.indexedCount} of ${chunks.length} chunks were indexed.`,
        "INDEXING_FAILED",
      );
    }
    timings.indexingSeconds = elapsedSeconds(stageStartedAt);

    // 5. Swap in the new chunks. Past this point the new vectors are live, so cancellation is no longer offered.
    stage = "BUILDING_KNOWLEDGE";
    source.status = "BUILDING_KNOWLEDGE";
    await source.save();
    const newIds = chunks.map((chunk) => chunk._id);
    await KnowledgeChunk.insertMany(chunks);
    await KnowledgeChunk.deleteMany({ knowledgeSourceId: source._id, _id: { $nin: newIds } });

    // 6. READY
    source.metadata = {
      pageCount: extracted.metadata?.pageCount ?? source.metadata?.pageCount ?? 0,
      wordCount: extracted.metadata?.wordCount ?? 0,
      chunkCount: chunks.length,
      processingTimes: {
        ...timings,
        totalSeconds: elapsedSeconds(pipelineStartedAt),
      },
    };
    source.status = "READY";
    source.errorMessage = null;
    source.processingJobId = null;
    await source.save();
    notifySourceEvent(source, "READY");
    console.log("[KNOWLEDGE]\nProcessing completed");

    return {
      knowledgeSource: source.toSafeObject(),
      chunkCount: chunks.length,
      processingTimes: source.metadata.processingTimes,
    };
  } catch (error) {
    if (processingJobs.isCancellation(error, job)) {
      console.log(`[KNOWLEDGE]\nProcessing cancelled at stage ${stage}`);
      await finishWithoutIndexing(source, "CANCELLED", "Processing was cancelled.", hadIndexedContent);
      notifySourceEvent(source, "CANCELLED");
      throw new processingJobs.ProcessingCancelledError();
    }

    console.error(
      `[KNOWLEDGE ERROR]\nstage: ${stage}\nmessage: ${error.message}\nendpoint: /api/knowledge/${sourceId}/process\nstatus: ${error.statusCode || 500}`,
    );
    const message = error.message || "Failed to ingest knowledge document";
    await finishWithoutIndexing(source, "FAILED", message, hadIndexedContent);
    notifySourceEvent(source, source.status === "READY" ? "FAILED" : source.status, message);
    throw error;
  } finally {
    job.finish();
  }
}

/**
 * Cancels a running job and waits for it to acknowledge. Sources stuck in an active
 * status with no live job (e.g. after a server restart) are marked cancelled directly.
 */
async function cancelProcessing(sourceId, userId) {
  validateObjectId(sourceId, "Knowledge source ID");
  const source = await KnowledgeSource.findOne({ _id: sourceId, userId });
  if (!source) {
    throw createHttpError(404, "Knowledge source not found");
  }

  const job = processingJobs.getJob(source._id);
  if (job) {
    if (source.status === "BUILDING_KNOWLEDGE") {
      throw createHttpError(409, "Processing is finishing and can no longer be cancelled.", "CANCEL_TOO_LATE");
    }
    job.cancelRequested = true;
    job.controller.abort();
    await aiServiceClient.cancelJob(job.id);
    const acknowledged = await Promise.race([
      job.done.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), CANCEL_ACK_TIMEOUT_MS)),
    ]);
    if (!acknowledged) {
      throw createHttpError(504, "Cancellation was requested but not yet confirmed. Check the source status again shortly.", "CANCEL_PENDING");
    }
    const updated = await KnowledgeSource.findById(source._id);
    return { knowledgeSource: updated.toSafeObject(), cancelled: true };
  }

  if (ACTIVE_STATUSES.includes(source.status) || source.status === "UPLOADING") {
    const hadIndexedContent = (await KnowledgeChunk.countDocuments({ knowledgeSourceId: source._id })) > 0;
    await finishWithoutIndexing(source, "CANCELLED", "Processing was cancelled.", hadIndexedContent);
    notifySourceEvent(source, "CANCELLED");
    return { knowledgeSource: source.toSafeObject(), cancelled: true };
  }

  throw createHttpError(409, `This source is not being processed (status: ${source.status}).`, "NOT_PROCESSING");
}

/**
 * Applies the user's decision for a source awaiting educational-relevance review.
 */
async function reviewSource(sourceId, userId, decision) {
  validateObjectId(sourceId, "Knowledge source ID");
  if (!["approve", "cancel"].includes(decision)) {
    throw createHttpError(400, "Decision must be 'approve' or 'cancel'.");
  }
  const source = await KnowledgeSource.findOne({ _id: sourceId, userId });
  if (!source) {
    throw createHttpError(404, "Knowledge source not found");
  }
  if (source.status !== "AWAITING_REVIEW") {
    throw createHttpError(409, `This source is not awaiting review (status: ${source.status}).`, "NOT_AWAITING_REVIEW");
  }

  source.set("classification.decision", decision === "approve" ? "APPROVED" : "REJECTED");
  source.set("classification.decidedAt", new Date());

  if (decision === "cancel") {
    source.status = "CANCELLED";
    source.errorMessage = "Import cancelled after review: the video did not appear to be study material.";
    await source.save();
    return { knowledgeSource: source.toSafeObject() };
  }

  await source.save();
  return processKnowledgeSource(sourceId, userId);
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
  cancelProcessing,
  reviewSource,
  getKnowledgeChunks,
};
