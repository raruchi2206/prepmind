const mongoose = require("mongoose");

const generatedContentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    knowledgeSourceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "KnowledgeSource",
      },
    ],
    type: {
      type: String,
      enum: ["SUMMARY", "NOTES", "QUIZ", "PRACTICE_PAPER", "VIVA", "ASK"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    sources: [
      {
        knowledgeSourceId: { type: mongoose.Schema.Types.ObjectId, ref: "KnowledgeSource" },
        chunkId: String,
        title: String,
        page: Number,
        slide: Number,
        section: String,
        startTime: Number,
        endTime: Number,
        label: String,
      },
    ],
    metadata: {
      questionCount: Number,
      difficulty: String,
      questionType: String,
      totalMarks: Number,
      timeAllowedMinutes: Number,
      chunksRetrieved: Number,
      generationTimeSeconds: Number,
    },
  },
  { timestamps: true },
);

generatedContentSchema.index({ userId: 1, type: 1, createdAt: -1 });

generatedContentSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    knowledgeSourceIds: (this.knowledgeSourceIds || []).map((k) => k.toString()),
    type: this.type,
    title: this.title,
    content: this.content,
    sources: this.sources,
    metadata: this.metadata,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("GeneratedContent", generatedContentSchema);
