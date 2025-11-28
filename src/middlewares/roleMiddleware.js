const { forbidden } = require('../utils/apiError');

/**
 * Role Middleware Factory
 * Creates middleware that checks if user has required role(s)
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 */
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(forbidden('Akses ditolak'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(forbidden(`Akses ditolak. Role yang diizinkan: ${allowedRoles.join(', ')}`));
    }

    next();
  };
};

/**
 * Check if user is the owner of a resource
 * @param {string} userIdField - Field name in req.params or req.body containing user ID
 */
const ownerMiddleware = (userIdField = 'userId') => {
  return (req, res, next) => {
    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    
    if (!req.user) {
      return next(forbidden('Akses ditolak'));
    }

    if (req.user.id !== resourceUserId) {
      return next(forbidden('Anda tidak memiliki akses ke resource ini'));
    }

    next();
  };
};

/**
 * Check if user belongs to same division
 */
const sameDivisionMiddleware = () => {
  return (req, res, next) => {
    // This will be checked in the service layer where we have CR data
    next();
  };
};

// Role constants for convenience
const ROLES = {
  USER: 'USER',
  MANAGER: 'MANAGER',
  VP: 'VP',
  MANAGER_IT: 'MANAGER_IT',
  DEV: 'DEV',
};

module.exports = {
  roleMiddleware,
  ownerMiddleware,
  sameDivisionMiddleware,
  ROLES,
};
