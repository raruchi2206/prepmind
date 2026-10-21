const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
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
    title: {
      type: String,
      default: "Ask PrepMind Session",
      trim: true,
    },
    messages: [
      {
        role: {
          type: String,
          enum: ["user", "assistant"],
          required: true,
        },
        content: {
          type: String,
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
            label: String,
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

conversationSchema.index({ userId: 1, updatedAt: -1 });

conversationSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    knowledgeSourceIds: (this.knowledgeSourceIds || []).map((k) => k.toString()),
    title: this.title,
    messages: this.messages,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("Conversation", conversationSchema);
