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
      enum: ["PDF", "IMAGE", "PPTX", "PPT", "DOCX", "DOC", "TXT", "YOUTUBE"],
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
    youtubeVideoId: {
      type: String,
      default: undefined,
      trim: true,
    },
    youtube: {
      channel: { type: String, default: null },
      language: { type: String, default: null },
      languageCode: { type: String, default: null },
      requestedLanguage: { type: String, default: null },
      isGenerated: { type: Boolean, default: null },
      durationSeconds: { type: Number, default: null },
      segmentCount: { type: Number, default: null },
      autoTitle: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: [
        "UPLOADING",
        "QUEUED",
        "EXTRACTING_CONTENT",
        "CLASSIFYING",
        "CLEANING_CONTENT",
        "CHUNKING",
        "EMBEDDING",
        "BUILDING_KNOWLEDGE",
        "AWAITING_REVIEW",
        "READY",
        "FAILED",
        "CANCELLED",
      ],
      default: "UPLOADING",
    },
    // Educational-relevance check for YouTube sources, with the user's decision
    classification: {
      label: { type: String, enum: ["EDUCATIONAL", "NON_EDUCATIONAL", "UNCERTAIN", null], default: null },
      confidence: { type: Number, default: null },
      topic: { type: String, default: null },
      reason: { type: String, default: null },
      evidence: { type: [String], default: undefined },
      method: { type: String, default: null },
      classifiedAt: { type: Date, default: null },
      decision: { type: String, enum: ["AUTO_APPROVED", "APPROVED", "REJECTED", null], default: null },
      decidedAt: { type: Date, default: null },
    },
    processingJobId: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    metadata: {
      pageCount: { type: Number, default: 0 },
      wordCount: { type: Number, default: 0 },
      chunkCount: { type: Number, default: 0 },
      processingTimes: {
        extractionSeconds: { type: Number, default: null },
        chunkingSeconds: { type: Number, default: null },
        indexingSeconds: { type: Number, default: null },
        totalSeconds: { type: Number, default: null },
      },
    },
  },
  { timestamps: true },
);

// Compound index for user knowledge queries sorted newest first
knowledgeSourceSchema.index({ userId: 1, createdAt: -1 });
// One record per video per user; documents without a video ID are unaffected
knowledgeSourceSchema.index(
  { userId: 1, youtubeVideoId: 1 },
  { unique: true, partialFilterExpression: { youtubeVideoId: { $type: "string" } } },
);

knowledgeSourceSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    title: this.title,
    type: this.type,
    originalFileName: this.originalFileName,
    youtubeUrl: this.youtubeUrl,
    youtubeVideoId: this.youtubeVideoId || null,
    youtube:
      this.type === "YOUTUBE" && this.youtube
        ? {
            videoId: this.youtubeVideoId || null,
            channel: this.youtube.channel,
            language: this.youtube.language,
            languageCode: this.youtube.languageCode,
            isGenerated: this.youtube.isGenerated,
            durationSeconds: this.youtube.durationSeconds,
            segmentCount: this.youtube.segmentCount,
          }
        : null,
    status: this.status,
    classification: this.classification?.label
      ? {
          label: this.classification.label,
          confidence: this.classification.confidence,
          topic: this.classification.topic,
          reason: this.classification.reason,
          evidence: this.classification.evidence || [],
          decision: this.classification.decision,
          classifiedAt: this.classification.classifiedAt,
        }
      : null,
    errorMessage: this.errorMessage,
    metadata: this.metadata,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("KnowledgeSource", knowledgeSourceSchema);
