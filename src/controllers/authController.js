const authService = require('../services/authService');
const { response } = require('../utils');

/**
 * Register new user
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    return response.created(res, user, 'Registrasi berhasil');
  } catch (error) {
    next(error);
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return response.success(res, result, 'Login berhasil');
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user profile
 * GET /api/auth/me
 */
async function getProfile(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id);
    return response.success(res, user);
  } catch (error) {
    next(error);
  }
}

/**
 * Update user profile
 * PUT /api/auth/me
 */
async function updateProfile(req, res, next) {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    return response.success(res, user, 'Profile berhasil diupdate');
  } catch (error) {
    next(error);
  }
}

/**
 * Change password
 * PUT /api/auth/password
 */
async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, oldPassword, newPassword);
    return response.success(res, null, 'Password berhasil diubah');
  } catch (error) {
    next(error);
  }
}

/**
 * Get users by role (for dropdowns, assignments)
 * GET /api/auth/users?role=DEV
 */
async function getUsersByRole(req, res, next) {
  try {
    const { role, division } = req.query;
    const users = await authService.getUsersByRole(role, division);
    return response.success(res, users);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getUsersByRole,
};
