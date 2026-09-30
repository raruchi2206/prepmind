function notFoundHandler(request, response) {
  response
    .status(404)
    .json({
      success: false,
      message: `Route not found: ${request.method} ${request.originalUrl}`,
    });
}

function errorHandler(error, request, response, next) {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "value";
    return response
      .status(409)
      .json({ success: false, message: `${field} is already in use` });
  }
  const status =
    error.statusCode || (error.name === "ValidationError" ? 422 : 500);
  if (status >= 500) console.error(error);
  response
    .status(status)
    .json({
      success: false,
      message: status >= 500 ? "Internal server error" : error.message,
    });
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

module.exports = { notFoundHandler, errorHandler, createHttpError };
