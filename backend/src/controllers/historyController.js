const GeneratedContent = require("../models/GeneratedContent");
const Assessment = require("../models/Assessment");
const Conversation = require("../models/Conversation");
const Attempt = require("../models/Attempt");
const { createHttpError } = require("../middleware/errorMiddleware");
const { validateObjectId } = require("../utils/security");

async function getHistory(req, res, next) {
  try {
    const userId = req.user._id;

    const [contents, conversations, attempts] = await Promise.all([
      GeneratedContent.find({ userId }).sort({ createdAt: -1 }).limit(50),
      Conversation.find({ userId }).sort({ updatedAt: -1 }).limit(20),
      Attempt.find({ userId }).sort({ createdAt: -1 }).limit(50),
    ]);

    const formattedContents = contents.map((c) => ({
      id: c._id.toString(),
      type: c.type,
      title: c.title,
      summaryPreview: typeof c.content === "string" ? c.content.slice(0, 180) : "Interactive assessment",
      sources: c.sources || [],
      metadata: c.metadata || {},
      createdAt: c.createdAt,
    }));

    const formattedConversations = conversations.map((cv) => ({
      id: cv._id.toString(),
      type: "ASK",
      title: cv.title || "Ask PrepMind Chat",
      messageCount: (cv.messages || []).length,
      createdAt: cv.createdAt,
      updatedAt: cv.updatedAt,
    }));

    const formattedAttempts = attempts.map((a) => ({
      id: a._id.toString(),
      assessmentId: a.assessmentId ? a.assessmentId.toString() : null,
      type: "ATTEMPT",
      title: `${a.assessmentTitle} (Attempt)`,
      score: a.score,
      totalMarks: a.totalMarks,
      percentage: a.percentage,
      createdAt: a.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        items: [...formattedContents, ...formattedConversations, ...formattedAttempts].sort(
          (a, b) => new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt)
        ),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getHistoryItem(req, res, next) {
  try {
    const { id } = req.params;
    validateObjectId(id, "History item ID");

    const content = await GeneratedContent.findOne({ _id: id, userId: req.user._id });
    if (content) {
      // If content is an assessment ID, load the full assessment
      if (content.type === "QUIZ" || content.type === "PRACTICE_PAPER" || content.type === "VIVA") {
        const assessment = await Assessment.findOne({ _id: content.content, userId: req.user._id });
        if (assessment) {
          return res.status(200).json({
            success: true,
            data: {
              ...content.toSafeObject(),
              assessment: assessment.toSafeObject(),
            },
          });
        }
      }
      return res.status(200).json({
        success: true,
        data: content.toSafeObject(),
      });
    }

    const conversation = await Conversation.findOne({ _id: id, userId: req.user._id });
    if (conversation) {
      return res.status(200).json({
        success: true,
        data: conversation.toSafeObject(),
      });
    }

    const attempt = await Attempt.findOne({ _id: id, userId: req.user._id });
    if (attempt) {
      return res.status(200).json({
        success: true,
        data: attempt.toSafeObject(),
      });
    }

    throw createHttpError(404, "History item not found");
  } catch (err) {
    next(err);
  }
}

async function deleteHistoryItem(req, res, next) {
  try {
    const { id } = req.params;
    validateObjectId(id, "History item ID");

    const [deletedContent, deletedConversation, deletedAttempt] = await Promise.all([
      GeneratedContent.findOneAndDelete({ _id: id, userId: req.user._id }),
      Conversation.findOneAndDelete({ _id: id, userId: req.user._id }),
      Attempt.findOneAndDelete({ _id: id, userId: req.user._id }),
    ]);

    if (!deletedContent && !deletedConversation && !deletedAttempt) {
      throw createHttpError(404, "History item not found");
    }

    res.status(200).json({
      success: true,
      message: "History item deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHistory,
  getHistoryItem,
  deleteHistoryItem,
};
