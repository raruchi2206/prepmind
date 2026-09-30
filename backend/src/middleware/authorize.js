const mongoose = require("mongoose");
const { createHttpError } = require("./errorMiddleware");

function authorize(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return next(
        createHttpError(
          403,
          "You do not have permission to access this resource",
        ),
      );
    }
    next();
  };
}

function requireSelf(param = "userId") {
  return (request, response, next) => {
    const targetId = request.params[param];
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return next(createHttpError(400, "Invalid ID format"));
    }
    if (!request.user || targetId !== request.user._id.toString()) {
      return next(
        createHttpError(403, "You can only access your own resources"),
      );
    }
    next();
  };
}

function requireOwnership(Model, paramName = "id", ownerField = "userId") {
  return async (request, response, next) => {
    try {
      const resourceId = request.params[paramName];
      if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        return next(createHttpError(400, "Invalid resource ID format"));
      }
      const resource = await Model.findOne({
        _id: resourceId,
        [ownerField]: request.user._id,
      });
      if (!resource) {
        return next(
          createHttpError(404, "Resource not found or access denied"),
        );
      }
      request.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { authorize, requireSelf, requireOwnership };
