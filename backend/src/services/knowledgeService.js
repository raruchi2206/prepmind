const path = require("path");
const fs = require("fs").promises;
const KnowledgeSource = require("../models/KnowledgeSource");
const { createHttpError } = require("../middleware/errorMiddleware");
const { validateObjectId } = require("../utils/security");

function mapExtensionToType(ext) {
  const normalized = ext.toLowerCase();
  switch (normalized) {
    case ".pdf":
      return "PDF";
    case ".pptx":
      return "PPTX";
    case ".docx":
      return "DOCX";
    case ".txt":
      return "TXT";
    default:
      return null;
  }
}

async function createKnowledgeSource({ userId, title, type, youtubeUrl }) {
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

  // Safely cleanup physical file if it exists
  if (source.filePath) {
    fs.unlink(source.filePath).catch((err) => {
      // Log failure but do not crash response
      console.warn(`File cleanup error for ${source.filePath}:`, err.message);
    });
  }

  return true;
}

module.exports = {
  createKnowledgeSource,
  createUploadedKnowledgeSource,
  getKnowledgeSources,
  getKnowledgeSourceById,
  updateKnowledgeSource,
  deleteKnowledgeSource,
};
