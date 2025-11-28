/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create Bad Request Error (400)
 */
function badRequest(message, errors = null) {
  return new ApiError(400, message, errors);
}

/**
 * Create Unauthorized Error (401)
 */
function unauthorized(message = 'Unauthorized') {
  return new ApiError(401, message);
}

/**
 * Create Forbidden Error (403)
 */
function forbidden(message = 'Forbidden') {
  return new ApiError(403, message);
}

/**
 * Create Not Found Error (404)
 */
function notFound(message = 'Resource not found') {
  return new ApiError(404, message);
}

/**
 * Create Conflict Error (409)
 */
function conflict(message) {
  return new ApiError(409, message);
}

/**
 * Create Internal Server Error (500)
 */
function internal(message = 'Internal server error') {
  return new ApiError(500, message);
}

module.exports = {
  ApiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internal,
};
