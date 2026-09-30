const mongoose = require("mongoose");

const passwordResetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    resetTokenHash: {
      type: String,
      default: null,
    },
    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PasswordReset", passwordResetSchema);
