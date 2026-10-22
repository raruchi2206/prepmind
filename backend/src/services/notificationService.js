const Notification = require("../models/Notification");
const { createHttpError } = require("../middleware/errorMiddleware");
const { validateObjectId } = require("../utils/security");

const GENERATION_PATHS = {
  SUMMARY: "/summary",
  NOTES: "/notes",
  QUIZ: "/quiz",
  PRACTICE_PAPER: "/practice-paper",
  VIVA: "/viva",
};

const GENERATION_LABELS = {
  SUMMARY: "Summary",
  NOTES: "Notes",
  QUIZ: "Quiz",
  PRACTICE_PAPER: "Practice paper",
  VIVA: "Viva questions",
};

/**
 * Records a notification for a real event. Never throws: a failed notification
 * must not fail the operation that triggered it.
 */
async function notify(userId, { type, title, message = "", resourceType = null, resourceId = null, actionUrl = null }) {
  try {
    await Notification.create({ userId, type, title, message, resourceType, resourceId, actionUrl });
  } catch (error) {
    console.warn(`[NOTIFICATION] Failed to record ${type}: ${error.message}`);
  }
}

function notifySourceEvent(source, status, detail = "") {
  const sourceLabel = source.type === "YOUTUBE" ? "Video" : "Document";
  const events = {
    READY: {
      type: "SOURCE_READY",
      title: `${sourceLabel} ready: ${source.title}`,
      message: `${source.metadata?.chunkCount || 0} chunks indexed. You can now generate study material from it.`,
      actionUrl: `/knowledge/${source._id}`,
    },
    FAILED: {
      type: "SOURCE_FAILED",
      title: `Processing failed: ${source.title}`,
      message: detail || source.errorMessage || "Processing could not be completed.",
      actionUrl: "/knowledge",
    },
    CANCELLED: {
      type: "SOURCE_CANCELLED",
      title: `Processing cancelled: ${source.title}`,
      message: detail || "Processing was cancelled. You can retry it from the Knowledge page.",
      actionUrl: "/knowledge",
    },
    AWAITING_REVIEW: {
      type: "SOURCE_NEEDS_REVIEW",
      title: `Review needed: ${source.title}`,
      message: detail || "This video may not be study material. Review it to continue or cancel.",
      actionUrl: "/knowledge",
    },
  };
  const event = events[status];
  if (!event) return Promise.resolve();
  return notify(source.userId, { ...event, resourceType: "KNOWLEDGE_SOURCE", resourceId: source._id });
}

function notifyGenerationComplete(userId, { kind, sourceTitle, sourceId, resourceType, resourceId }) {
  const label = GENERATION_LABELS[kind] || "Content";
  const path = GENERATION_PATHS[kind] || "/history";
  return notify(userId, {
    type: "GENERATION_COMPLETE",
    title: `${label} ready: ${sourceTitle}`,
    message: `Your ${label.toLowerCase()} has been generated and saved to your history.`,
    resourceType,
    resourceId,
    actionUrl: sourceId ? `${path}?knowledge=${sourceId}` : "/history",
  });
}

async function listNotifications(userId, { limit = 20 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const [items, unreadCount] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(safeLimit),
    Notification.countDocuments({ userId, read: false }),
  ]);
  return { notifications: items.map((n) => n.toSafeObject()), unreadCount };
}

async function getUnreadCount(userId) {
  return Notification.countDocuments({ userId, read: false });
}

async function markRead(userId, id) {
  validateObjectId(id, "Notification ID");
  const updated = await Notification.findOneAndUpdate(
    { _id: id, userId },
    { $set: { read: true, readAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!updated) {
    throw createHttpError(404, "Notification not found");
  }
  return updated.toSafeObject();
}

async function markAllRead(userId) {
  const result = await Notification.updateMany(
    { userId, read: false },
    { $set: { read: true, readAt: new Date() } },
  );
  return result.modifiedCount || 0;
}

module.exports = {
  notify,
  notifySourceEvent,
  notifyGenerationComplete,
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
};
