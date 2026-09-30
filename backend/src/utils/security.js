const mongoose = require("mongoose");
const { createHttpError } = require("../middleware/errorMiddleware");

/**
 * Validates whether a given string is a valid MongoDB ObjectId.
 * Throws a 400 Bad Request error if invalid.
 */
function validateObjectId(id, label = "Resource ID") {
  if (!id || typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(400, `Invalid ${label} format`);
  }
  return new mongoose.Types.ObjectId(id);
}

/**
 * Checks if a resource is owned by the specified user ID.
 * Throws 403 Forbidden or 404 Not Found if access is denied.
 */
function checkOwnership(resource, userId, ownerField = "userId") {
  if (!resource) {
    throw createHttpError(404, "Resource not found");
  }
  const resourceOwner = resource[ownerField];
  const ownerIdStr = resourceOwner ? resourceOwner.toString() : null;
  const userIdStr = userId ? userId.toString() : null;

  if (!ownerIdStr || ownerIdStr !== userIdStr) {
    throw createHttpError(403, "You do not have permission to access this resource");
  }
  return true;
}

/**
 * Strips MongoDB operators ($gt, $ne, $regex, $where, etc.) from plain objects
 * to prevent NoSQL query injection attacks.
 */
function sanitizeMongoQuery(input) {
  if (input === null || typeof input !== "object") {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeMongoQuery);
  }
  const sanitized = {};
  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith("$")) {
      continue; // Strip MongoDB operator
    }
    sanitized[key] = typeof value === "object" ? sanitizeMongoQuery(value) : value;
  }
  return sanitized;
}

module.exports = {
  validateObjectId,
  checkOwnership,
  sanitizeMongoQuery,
};
