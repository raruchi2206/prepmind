const crypto = require("crypto");
const argon2 = require("argon2");
const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");
const { generateUniqueUsername } = require("../utils/usernameGenerator");
const { createHttpError } = require("../middleware/errorMiddleware");
const { sendPasswordResetOTP } = require("./emailService");
const {
  createPasswordResetToken,
  hashToken,
  verifyPasswordResetToken,
} = require("./tokenService");
const { env } = require("../config/env");

async function registerUser({ name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  if (await User.exists({ email: normalizedEmail })) {
    throw createHttpError(409, "An account with this email already exists");
  }
  const username = await generateUniqueUsername(name);
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await User.create({
    name,
    email: normalizedEmail,
    username,
    passwordHash,
    role: "USER", // Always force USER role on registration
  });
  return user;
}

async function authenticateUser({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
  if (!user || !(await argon2.verify(user.passwordHash, password))) {
    throw createHttpError(401, "Invalid email or password");
  }
  return user;
}

async function requestPasswordReset(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    // Generic response to prevent user enumeration
    return false;
  }

  // Invalidate any previous reset requests for this user
  await PasswordReset.deleteMany({ userId: user._id });

  // Generate cryptographically secure 6-digit OTP
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = await argon2.hash(otp, { type: argon2.argon2id });
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);

  await PasswordReset.create({
    userId: user._id,
    otpHash,
    expiresAt,
    attempts: 0,
    verified: false,
  });

  try {
    await sendPasswordResetOTP(user.email, otp);
  } catch (error) {
    console.error("Failed to deliver OTP email:", error.message);
  }

  return true;
}

async function verifyPasswordResetOTP({ email, otp }) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw createHttpError(400, "Invalid or expired verification code");
  }

  const resetRecord = await PasswordReset.findOne({
    userId: user._id,
    usedAt: null,
    verified: false,
  });

  if (!resetRecord) {
    throw createHttpError(
      400,
      "No active password reset request found. Please request a new code.",
    );
  }

  if (Date.now() > resetRecord.expiresAt.getTime()) {
    await PasswordReset.deleteOne({ _id: resetRecord._id });
    throw createHttpError(
      400,
      "Verification code has expired. Please request a new code.",
    );
  }

  if (resetRecord.attempts >= 5) {
    await PasswordReset.deleteOne({ _id: resetRecord._id });
    throw createHttpError(
      429,
      "Maximum verification attempts exceeded. Please request a new code.",
    );
  }

  const isValidOtp = await argon2.verify(resetRecord.otpHash, otp);
  if (!isValidOtp) {
    resetRecord.attempts += 1;
    if (resetRecord.attempts >= 5) {
      await PasswordReset.deleteOne({ _id: resetRecord._id });
      throw createHttpError(
        429,
        "Maximum verification attempts exceeded. Please request a new code.",
      );
    }
    await resetRecord.save();
    throw createHttpError(400, "Invalid verification code. Please try again.");
  }

  const resetToken = createPasswordResetToken(user, resetRecord);
  resetRecord.verified = true;
  resetRecord.resetTokenHash = hashToken(resetToken);
  resetRecord.resetTokenExpiresAt = new Date(
    Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000,
  );
  await resetRecord.save();

  return resetToken;
}

async function resetPassword({ resetToken, newPassword }) {
  let payload;
  try {
    payload = verifyPasswordResetToken(resetToken);
  } catch {
    throw createHttpError(400, "Invalid or expired reset token");
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw createHttpError(400, "Invalid user for password reset");
  }

  const resetRecord = await PasswordReset.findOne({
    _id: payload.resetId,
    userId: user._id,
    verified: true,
    usedAt: null,
  });

  if (!resetRecord) {
    throw createHttpError(
      400,
      "Reset authorization has already been used or is invalid",
    );
  }

  if (
    !resetRecord.resetTokenExpiresAt ||
    Date.now() > resetRecord.resetTokenExpiresAt.getTime()
  ) {
    await PasswordReset.deleteOne({ _id: resetRecord._id });
    throw createHttpError(
      400,
      "Reset authorization has expired. Please restart password recovery.",
    );
  }

  if (resetRecord.resetTokenHash !== hashToken(resetToken)) {
    throw createHttpError(400, "Reset authorization mismatch");
  }

  const passwordHash = await argon2.hash(newPassword, {
    type: argon2.argon2id,
  });

  user.passwordHash = passwordHash;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  resetRecord.usedAt = new Date();
  await resetRecord.save();

  // Clean up any remaining reset records for this user
  await PasswordReset.deleteMany({ userId: user._id, _id: { $ne: resetRecord._id } });

  return true;
}

async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) {
    throw createHttpError(401, "User not found");
  }

  const isValidCurrent = await argon2.verify(user.passwordHash, currentPassword);
  if (!isValidCurrent) {
    throw createHttpError(400, "Current password is incorrect");
  }

  const passwordHash = await argon2.hash(newPassword, {
    type: argon2.argon2id,
  });

  user.passwordHash = passwordHash;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  return user;
}

module.exports = {
  registerUser,
  authenticateUser,
  requestPasswordReset,
  verifyPasswordResetOTP,
  resetPassword,
  changePassword,
};
