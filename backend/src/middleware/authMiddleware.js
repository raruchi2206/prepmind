const User = require("../models/User");
const {
  ACCESS_COOKIE,
  verifyAccessToken,
} = require("../services/tokenService");
const { createHttpError } = require("./errorMiddleware");

async function requireAuth(request, response, next) {
  try {
    const token = request.cookies[ACCESS_COOKIE];
    if (!token) {
      throw createHttpError(401, "Authentication required");
    }
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw createHttpError(401, "Authentication session is invalid or expired");
    }
    request.user = user;
    next();
  } catch (error) {
    next(
      error.statusCode
        ? error
        : createHttpError(401, "Authentication required"),
    );
  }
}

async function optionalAuth(request, response, next) {
  try {
    const token = request.cookies[ACCESS_COOKIE];
    if (token) {
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub);
      if (user && user.tokenVersion === payload.tokenVersion) {
        request.user = user;
      }
    }
  } catch {
    // Graceful fallback for optional auth
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
