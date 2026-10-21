const path = require("path");
const fs = require("fs").promises;
const KnowledgeSource = require("../models/KnowledgeSource");
const KnowledgeChunk = require("../models/KnowledgeChunk");
const { createHttpError } = require("../middleware/errorMiddleware");
const { validateObjectId } = require("../utils/security");
const { parseYouTubeUrl } = require("../utils/youtube");

function mapExtensionToType(ext) {
  const normalized = ext.toLowerCase();
  switch (normalized) {
    case ".pdf":
      return "PDF";
    case ".jpg":
    case ".jpeg":
    case ".png":
      return "IMAGE";
    case ".pptx":
      return "PPTX";
    case ".ppt":
      return "PPT";
    case ".docx":
      return "DOCX";
    case ".doc":
      return "DOC";
    case ".txt":
      return "TXT";
    default:
      return null;
  }
}

/**
 * Creates (or, with reprocess=true, resets) the YouTube source for a video.
 * Returns { source, duplicate } — duplicate is set when the video already exists
 * for this user and reprocessing was not requested.
 */
async function createYouTubeKnowledgeSource({ userId, url, title, language, reprocess = false }) {
  const { videoId, canonicalUrl } = parseYouTubeUrl(url);
  const customTitle = typeof title === "string" ? title.trim() : "";

  const existing = await KnowledgeSource.findOne({ userId, youtubeVideoId: videoId });
  if (existing) {
    if (!reprocess) {
      throw createHttpError(
        409,
        "This video is already in your knowledge library. Choose Reprocess to import it again.",
        "DUPLICATE_YOUTUBE_SOURCE",
        { knowledgeSource: existing.toSafeObject() },
      );
    }
    if (!["READY", "FAILED", "UPLOADING"].includes(existing.status)) {
      throw createHttpError(
        409,
        "This video is already being processed. Please wait for it to finish.",
        "SOURCE_PROCESSING",
      );
    }
    existing.status = "UPLOADING";
    existing.errorMessage = null;
    existing.youtubeUrl = canonicalUrl;
    if (language) existing.set("youtube.requestedLanguage", language);
    if (customTitle) {
      existing.title = customTitle;
      existing.set("youtube.autoTitle", false);
    }
    await existing.save();
    return existing;
  }

  try {
    return await KnowledgeSource.create({
      userId,
      title: customTitle || `YouTube video ${videoId}`,
      type: "YOUTUBE",
      youtubeUrl: canonicalUrl,
      youtubeVideoId: videoId,
      youtube: {
        requestedLanguage: language || null,
        autoTitle: !customTitle,
      },
      status: "UPLOADING",
    });
  } catch (error) {
    if (error && error.code === 11000) {
      throw createHttpError(
        409,
        "This video is already in your knowledge library. Choose Reprocess to import it again.",
        "DUPLICATE_YOUTUBE_SOURCE",
      );
    }
    throw error;
  }
}

async function createKnowledgeSource({ userId, title, type, youtubeUrl }) {
  if (type === "YOUTUBE") {
    return createYouTubeKnowledgeSource({ userId, url: youtubeUrl, title });
  }
  const source = await KnowledgeSource.create({
    userId,
    title: title.trim(),
    type,
    youtubeUrl: type === "YOUTUBE" ? youtubeUrl.trim() : null,
    status: "UPLOADING",
  });
  return source;
}

async function createUploadedKnowledgeSource({ userId, title, file }) {
  const ext = path.extname(file.originalname);
  const inferredType = mapExtensionToType(ext);
  if (!inferredType) {
    throw createHttpError(400, `Unsupported file format: ${ext}`);
  }

  const finalTitle = (title && title.trim()) || path.parse(file.originalname).name;

  const source = await KnowledgeSource.create({
    userId,
    title: finalTitle,
    type: inferredType,
    originalFileName: file.originalname,
    filePath: file.path,
    status: "UPLOADING",
  });
  return source;
}

async function getKnowledgeSources(userId) {
  const sources = await KnowledgeSource.find({ userId }).sort({ createdAt: -1 });
  return sources.map((s) => s.toSafeObject());
}

async function getKnowledgeSourceById({ id, userId }) {
  validateObjectId(id, "Knowledge source ID");
  const source = await KnowledgeSource.findOne({ _id: id, userId });
  if (!source) {
    throw createHttpError(404, "Knowledge source not found");
  }
  return source.toSafeObject();
}

async function updateKnowledgeSource({ id, userId, title }) {
  validateObjectId(id, "Knowledge source ID");
  const updated = await KnowledgeSource.findOneAndUpdate(
    { _id: id, userId },
    { $set: { title: title.trim() } },
    { returnDocument: "after", runValidators: true },
  );
  if (!updated) {
    throw createHttpError(404, "Knowledge source not found");
  }
  return updated.toSafeObject();
}

async function deleteKnowledgeSource({ id, userId }) {
  validateObjectId(id, "Knowledge source ID");
  const source = await KnowledgeSource.findOneAndDelete({ _id: id, userId });
  if (!source) {
    throw createHttpError(404, "Knowledge source not found");
  }

  // Delete associated KnowledgeChunks
  await KnowledgeChunk.deleteMany({ knowledgeSourceId: id });

  // Delete associated FAISS vectors
  const aiServiceClient = require("./aiServiceClient");
  await aiServiceClient.deleteSourceVectors(userId, id).catch((err) => {
    console.warn(`[FAISS Cleanup] Error removing vectors for source ${id}:`, err.message);
  });

  // Safely cleanup physical file if it exists
  if (source.filePath) {
    fs.unlink(source.filePath).catch((err) => {
      // Log failure but do not crash response
      console.warn(`File cleanup error for ${source.filePath}:`, err.message);
    });
  }

  return true;
}

async function reindexKnowledgeSource({ id, userId }) {
  validateObjectId(id, "Knowledge source ID");
  const source = await KnowledgeSource.findOne({ _id: id, userId });
  if (!source) {
    throw createHttpError(404, "Knowledge source not found");
  }

  const chunks = await KnowledgeChunk.find({ knowledgeSourceId: id, userId }).sort({ chunkIndex: 1 });
  if (chunks.length === 0) {
    throw createHttpError(400, "No chunks found to reindex for this document.");
  }

  const aiServiceClient = require("./aiServiceClient");
  console.log(`[REINDEX] Reindexing ${chunks.length} chunks for source ${id} under user ${userId}`);

  try {
    const indexRes = await aiServiceClient.indexChunks(userId, id, chunks);
    if (!indexRes || indexRes.success !== true) {
      throw createHttpError(500, "FAISS vector indexing failed to confirm success.");
    }

    source.status = "READY";
    source.errorMessage = null;
    source.metadata = {
      ...(source.metadata || {}),
      chunkCount: chunks.length,
    };
    await source.save();

    return {
      knowledgeSource: source.toSafeObject(),
      indexedCount: indexRes.indexedCount || chunks.length,
    };
  } catch (err) {
    source.status = "FAILED";
    source.errorMessage = err.message || "Failed to reindex document";
    await source.save().catch(() => {});
    throw err;
  }
}

async function reindexAllSources(userId) {
  const sources = await KnowledgeSource.find({ userId });
  const results = [];
  for (const s of sources) {
    const chunks = await KnowledgeChunk.find({ knowledgeSourceId: s._id, userId });
    if (chunks.length > 0) {
      const aiServiceClient = require("./aiServiceClient");
      await aiServiceClient.indexChunks(userId, s._id, chunks);
      s.status = "READY";
      s.errorMessage = null;
      s.metadata = {
        ...(s.metadata || {}),
        chunkCount: chunks.length,
      };
      await s.save();
      results.push({ sourceId: s._id.toString(), indexedCount: chunks.length });
    }
  }
  return results;
}

module.exports = {
  createKnowledgeSource,
  createYouTubeKnowledgeSource,
  createUploadedKnowledgeSource,
  getKnowledgeSources,
  getKnowledgeSourceById,
  updateKnowledgeSource,
  deleteKnowledgeSource,
  reindexKnowledgeSource,
  reindexAllSources,
};
