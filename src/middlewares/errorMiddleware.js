const { ApiError } = require('../utils/apiError');
const { error } = require('../utils/apiResponse');

/**
 * Global Error Handler Middleware
 */
const errorMiddleware = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle ApiError
  if (err instanceof ApiError) {
    return error(res, err.message, err.statusCode, err.errors);
  }

  // Handle Prisma errors
  if (err.code) {
    switch (err.code) {
      case 'P2002':
        return error(res, 'Data sudah ada (duplikat)', 409);
      case 'P2025':
        return error(res, 'Data tidak ditemukan', 404);
      case 'P2003':
        return error(res, 'Foreign key constraint gagal', 400);
      default:
        break;
    }
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const validationErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return error(res, 'Validasi gagal', 400, validationErrors);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return error(res, 'Token tidak valid', 401);
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Terjadi kesalahan internal server' 
    : err.message;

  return error(res, message, statusCode);
};

/**
 * Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  return error(res, `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`, 404);
};

module.exports = {
  errorMiddleware,
  notFoundHandler,
};
