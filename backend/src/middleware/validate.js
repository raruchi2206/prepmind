function validate(schema, source = "body") {
  return (request, response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      const error = new Error(
        result.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", "),
      );
      error.statusCode = 422;
      return next(error);
    }
    request[source] = result.data;
    next();
  };
}

module.exports = { validate };
