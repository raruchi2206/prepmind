function notFoundHandler(request, response) {
  response.status(404).json({
    success: false,
    message: `Route not found: ${request.method} ${request.originalUrl}`,
  });
}

function errorHandler(error, request, response, next) {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "value";
    return response.status(409).json({
      success: false,
      code: "DUPLICATE_VALUE",
      message: `${field} is already in use`,
    });
  }

  const status =
    error.statusCode || (error.name === "ValidationError" ? 422 : 500);
  if (status >= 500) console.error(error);

  const code =
    error.code ||
    (status >= 500 ? "INTERNAL_SERVER_ERROR" : "VALIDATION_ERROR");

  response.status(status).json({
    success: false,
    code,
    message:
      error.message ||
      (status >= 500 ? "Internal server error" : "Request failed"),
    ...(error.details ? { details: error.details } : {}),
  });
}

function createHttpError(statusCode, message, code = null, details = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

module.exports = { notFoundHandler, errorHandler, createHttpError };
