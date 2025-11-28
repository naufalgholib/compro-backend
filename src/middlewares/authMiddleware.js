const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/prisma');
const { unauthorized } = require('../utils/apiError');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw unauthorized('Token tidak ditemukan');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        division: true,
      },
    });

    if (!user) {
      throw unauthorized('User tidak ditemukan');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(unauthorized('Token tidak valid'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(unauthorized('Token sudah kadaluarsa'));
    }
    next(error);
  }
};

/**
 * Optional Auth Middleware
 * Attaches user if token exists, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        division: true,
      },
    });

    if (user) {
      req.user = user;
    }
    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuth,
};
