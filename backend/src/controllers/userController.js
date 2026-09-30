const User = require("../models/User");
const { createHttpError } = require("../middleware/errorMiddleware");

async function getMe(request, response) {
  response.json({
    success: true,
    data: { user: request.user.toSafeObject() },
  });
}

async function updateProfile(request, response, next) {
  try {
    const { name, username, avatar } = request.body;
    const sanitized = {};

    if (name) {
      sanitized.name = name.trim();
    }

    if (username) {
      const cleanUsername = username.toLowerCase().trim();
      const existing = await User.findOne({
        username: cleanUsername,
        _id: { $ne: request.user._id },
      });
      if (existing) {
        throw createHttpError(409, "That username is already taken");
      }
      sanitized.username = cleanUsername;
    }

    if (avatar !== undefined) {
      sanitized.avatar = avatar.trim();
    }

    if (Object.keys(sanitized).length === 0) {
      return response.json({
        success: true,
        message: "No profile changes provided",
        data: { user: request.user.toSafeObject() },
      });
    }

    const user = await User.findByIdAndUpdate(
      request.user._id,
      { $set: sanitized },
      { returnDocument: "after", runValidators: true },
    );

    response.json({
      success: true,
      message: "Profile updated successfully",
      data: { user: user.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMe, updateProfile };
