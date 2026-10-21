const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema(
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
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["QUIZ", "PRACTICE_PAPER", "VIVA"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    generationId: {
      type: String,
      default: null,
      index: true,
    },
    questionType: {
      type: String,
      default: "MCQ",
    },
    totalMarks: {
      type: Number,
      default: 10,
    },
    timeAllowedMinutes: {
      type: Number,
      default: 15,
    },
    questions: [
      {
        id: mongoose.Schema.Types.Mixed,
        question: { type: String, required: true },
        type: { type: String, default: "MCQ" },
        options: [String],
        correctAnswer: mongoose.Schema.Types.Mixed,
        explanation: String,
        sourceReference: String,
        marks: { type: Number, default: 1 },
        rubric: String,
      },
    ],
    sections: [
      {
        sectionName: String,
        instructions: String,
        marksPerQuestion: Number,
        questions: [
          {
            id: mongoose.Schema.Types.Mixed,
            question: String,
            type: String,
            options: [String],
            correctAnswer: mongoose.Schema.Types.Mixed,
            expectedAnswer: String,
            rubric: String,
            marks: Number,
          },
        ],
      },
    ],
    sources: [
      {
        knowledgeSourceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "KnowledgeSource",
        },
        chunkId: String,
        title: String,
        page: Number,
        slide: Number,
        section: String,
        label: String,
      },
    ],
  },
  { timestamps: true },
);

assessmentSchema.index({ userId: 1, type: 1, createdAt: -1 });

assessmentSchema.methods.toSafeObject = function toSafeObject() {
  const safeQuestions = (this.questions || []).map((q, idx) => {
    const qObj = q.toObject ? q.toObject() : { ...q };
    const qId = qObj._id ? qObj._id.toString() : (qObj.id ? String(qObj.id) : String(idx));
    return {
      ...qObj,
      id: qId,
      _id: qObj._id ? qObj._id.toString() : qId,
    };
  });

  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    knowledgeSourceIds: (this.knowledgeSourceIds || []).map((k) =>
      k.toString(),
    ),
    title: this.title,
    type: this.type,
    difficulty: this.difficulty,
    generationId: this.generationId,
    questionType: this.questionType,
    totalMarks: this.totalMarks,
    timeAllowedMinutes: this.timeAllowedMinutes,
    questions: safeQuestions,
    sections: this.sections,
    sources: this.sources,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("Assessment", assessmentSchema);
