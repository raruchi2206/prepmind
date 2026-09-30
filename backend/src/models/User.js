const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
      immutable: true,
    },
    isEmailVerified: { type: Boolean, default: false },
    avatar: { type: String, default: "" },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    username: this.username,
    role: this.role,
    avatar: this.avatar,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("User", userSchema);
