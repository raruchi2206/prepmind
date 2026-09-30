const mongoose = require("mongoose");

const knowledgeChunkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    knowledgeSourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KnowledgeSource",
      required: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      page: {
        type: Number,
        default: null,
      },
      slide: {
        type: Number,
        default: null,
      },
      section: {
        type: String,
        default: null,
      },
      sourceType: {
        type: String,
        enum: ["PDF", "PPTX", "DOCX", "TXT", "YOUTUBE"],
        required: true,
      },
      originalFileName: {
        type: String,
        default: null,
      },
    },
  },
  { timestamps: true },
);

// Compound indexes for chunk retrieval and user scoping
knowledgeChunkSchema.index({ knowledgeSourceId: 1, chunkIndex: 1 });
knowledgeChunkSchema.index({ userId: 1, knowledgeSourceId: 1 });

knowledgeChunkSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    knowledgeSourceId: this.knowledgeSourceId.toString(),
    chunkIndex: this.chunkIndex,
    text: this.text,
    metadata: this.metadata,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("KnowledgeChunk", knowledgeChunkSchema);
