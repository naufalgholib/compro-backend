const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const config = require('../config');
const { badRequest, unauthorized, notFound } = require('../utils/apiError');

/**
 * Register new user
 * @param {object} data - User registration data
 * @returns {Promise<object>} Created user (without password)
 */
async function register(data) {
  const { email, password, name, role, division } = data;

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw badRequest('Email sudah terdaftar');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
      division,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      division: true,
      createdAt: true,
    },
  });

  return user;
}

/**
 * Login user
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>} User data with JWT token
 */
async function login(email, password) {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw unauthorized('Email atau password salah');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    throw unauthorized('Email atau password salah');
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      division: user.division,
    },
    token,
  };
}

/**
 * Get current user profile
 * @param {string} userId 
 * @returns {Promise<object>} User profile
 */
async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      division: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw notFound('User tidak ditemukan');
  }

  return user;
}

/**
 * Update user profile
 * @param {string} userId 
 * @param {object} data 
 * @returns {Promise<object>} Updated user
 */
async function updateProfile(userId, data) {
  const { name, division } = data;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      division,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      division: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Change user password
 * @param {string} userId 
 * @param {string} oldPassword 
 * @param {string} newPassword 
 */
async function changePassword(userId, oldPassword, newPassword) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw notFound('User tidak ditemukan');
  }

  // Verify old password
  const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);

  if (!isValidPassword) {
    throw badRequest('Password lama salah');
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });
}

/**
 * Get users by role (for assigning developers, etc.)
 * @param {string} role 
 * @param {string} division - Optional division filter
 * @returns {Promise<Array>}
 */
async function getUsersByRole(role, division = null) {
  const where = { role };
  if (division) {
    where.division = division;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      division: true,
    },
    orderBy: { name: 'asc' },
  });

  return users;
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getUsersByRole,
};
