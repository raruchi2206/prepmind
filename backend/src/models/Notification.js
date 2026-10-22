const mongoose = require("mongoose");

const NOTIFICATION_TYPES = [
  "SOURCE_READY",
  "SOURCE_FAILED",
  "SOURCE_CANCELLED",
  "SOURCE_NEEDS_REVIEW",
  "GENERATION_COMPLETE",
];

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    resourceType: {
      type: String,
      enum: ["KNOWLEDGE_SOURCE", "GENERATED_CONTENT", "ASSESSMENT", null],
      default: null,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    actionUrl: {
      type: String,
      default: null,
      maxlength: 300,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
// Keep notifications for 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

notificationSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    type: this.type,
    title: this.title,
    message: this.message,
    resourceType: this.resourceType,
    resourceId: this.resourceId ? this.resourceId.toString() : null,
    actionUrl: this.actionUrl,
    read: this.read,
    readAt: this.readAt,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("Notification", notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
