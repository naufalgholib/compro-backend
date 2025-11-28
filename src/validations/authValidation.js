const { z } = require('zod');

// Login validation schema
const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

// Register validation schema
const registerSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  role: z.enum(['USER', 'MANAGER', 'VP', 'MANAGER_IT', 'DEV'], {
    errorMap: () => ({ message: 'Role tidak valid' }),
  }),
  division: z.string().optional(),
});

// Change password validation schema
const changePasswordSchema = z.object({
  oldPassword: z.string().min(6, 'Password lama minimal 6 karakter'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
});

module.exports = {
  loginSchema,
  registerSchema,
  changePasswordSchema,
};
