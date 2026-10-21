const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
      index: true,
    },
    knowledgeSourceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "KnowledgeSource",
      },
    ],
    assessmentTitle: {
      type: String,
      default: "Assessment",
    },
    assessmentType: {
      type: String,
      enum: ["QUIZ", "PRACTICE_PAPER", "VIVA"],
      default: "QUIZ",
    },
    answers: [
      {
        questionId: mongoose.Schema.Types.Mixed,
        questionIndex: Number,
        question: String,
        options: [String],
        userAnswer: mongoose.Schema.Types.Mixed,
        correctAnswer: mongoose.Schema.Types.Mixed,
        isCorrect: Boolean,
        awardedMarks: Number,
        maxMarks: Number,
        explanation: String,
        feedback: String,
        strengths: [String],
        improvements: [String],
      },
    ],
    score: {
      type: Number,
      required: true,
      default: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
      default: 0,
    },
    percentage: {
      type: Number,
      required: true,
      default: 0,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

attemptSchema.index({ userId: 1, createdAt: -1 });

attemptSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    assessmentId: this.assessmentId.toString(),
    knowledgeSourceIds: (this.knowledgeSourceIds || []).map((k) => k.toString()),
    assessmentTitle: this.assessmentTitle,
    assessmentType: this.assessmentType,
    answers: this.answers,
    score: this.score,
    totalMarks: this.totalMarks,
    percentage: this.percentage,
    timeSpentSeconds: this.timeSpentSeconds,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("Attempt", attemptSchema);
