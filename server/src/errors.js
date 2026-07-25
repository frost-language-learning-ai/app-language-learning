export class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AppError";
    this.status = options.status || 500;
    this.code = options.code || "INTERNAL_ERROR";
    this.details = options.details;
    this.expose = Boolean(options.expose ?? this.status < 500);
    this.cause = options.cause;
  }
}

export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function mapPgError(error) {
  if (!error || !error.code) {
    return null;
  }

  if (error.code === "23503") {
    return new AppError("Related resource was not found", {
      status: 404,
      code: "FOREIGN_KEY_NOT_FOUND",
      details: { constraint: error.constraint }
    });
  }

  if (error.code === "23505") {
    return new AppError("Resource already exists", {
      status: 409,
      code: "DUPLICATE_RESOURCE",
      details: { constraint: error.constraint }
    });
  }

  if (error.code === "22P02") {
    return new AppError("Invalid input value", {
      status: 400,
      code: "INVALID_INPUT"
    });
  }

  return null;
}

export function toHttpError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (Number.isInteger(error?.status)) {
    return new AppError(error.message || "Request failed", {
      status: error.status,
      code: error.code || (error.status < 500 ? "BAD_REQUEST" : "INTERNAL_ERROR"),
      details: error.details,
      expose: error.status < 500,
      cause: error
    });
  }

  const mapped = mapPgError(error);
  if (mapped) {
    return mapped;
  }

  return new AppError("Internal server error", {
    status: 500,
    code: "INTERNAL_ERROR",
    cause: error,
    expose: false
  });
}
