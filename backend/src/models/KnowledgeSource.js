const mongoose = require("mongoose");

const knowledgeSourceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ["PDF", "PPTX", "DOCX", "TXT", "YOUTUBE"],
      required: true,
    },
    originalFileName: {
      type: String,
      default: null,
    },
    filePath: {
      type: String,
      default: null,
    },
    youtubeUrl: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "UPLOADING",
        "EXTRACTING_CONTENT",
        "CLEANING_CONTENT",
        "CHUNKING",
        "EMBEDDING",
        "BUILDING_KNOWLEDGE",
        "READY",
        "FAILED",
      ],
      default: "UPLOADING",
    },
    errorMessage: {
      type: String,
      default: null,
    },
    metadata: {
      pageCount: { type: Number, default: 0 },
      wordCount: { type: Number, default: 0 },
      chunkCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

// Compound index for user knowledge queries sorted newest first
knowledgeSourceSchema.index({ userId: 1, createdAt: -1 });

knowledgeSourceSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    title: this.title,
    type: this.type,
    originalFileName: this.originalFileName,
    youtubeUrl: this.youtubeUrl,
    status: this.status,
    errorMessage: this.errorMessage,
    metadata: this.metadata,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("KnowledgeSource", knowledgeSourceSchema);
