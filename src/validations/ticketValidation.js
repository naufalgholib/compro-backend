const { z } = require('zod');

// CR Form Data validation schema
const formDataSchema = z.object({
  targetDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Target tanggal tidak valid',
  }),
  title: z.string().min(5, 'Judul minimal 5 karakter').max(200, 'Judul maksimal 200 karakter'),
  requester1: z.string().min(2, 'Nama pemohon 1 minimal 2 karakter'),
  requester2: z.string().min(2, 'Nama pemohon 2 (Manager) minimal 2 karakter'),
  businessArea: z.string().min(2, 'Business area wajib diisi'),
  categoryImpact: z.string().min(2, 'Category impact wajib diisi'),
  impactDescription: z.string().min(10, 'Deskripsi impact minimal 10 karakter'),
  background: z.string().min(20, 'Latar belakang minimal 20 karakter'),
  objective: z.string().min(10, 'Tujuan minimal 10 karakter'),
  serviceExplanation: z.string().min(10, 'Penjelasan layanan minimal 10 karakter'),
  servicesNeeded: z.string().min(5, 'Layanan yang dibutuhkan minimal 5 karakter'),
});

// Create CR validation schema
const createCRSchema = z.object({
  formData: formDataSchema,
});

// Update CR validation schema
const updateCRSchema = z.object({
  formData: formDataSchema,
});

// Submit CR validation (just need CR ID in params)
const submitCRSchema = z.object({});

// Pagination and filter schema
const listCRSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  status: z.enum([
    'DRAFT',
    'PENDING_MANAGER',
    'REJECTED_MANAGER',
    'REVISION_MANAGER',
    'PENDING_VP',
    'REJECTED_VP',
    'REVISION_VP',
    'APPROVED',
    'ASSIGNED_DEV',
    'COMPLETED',
  ]).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'id']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
});

module.exports = {
  formDataSchema,
  createCRSchema,
  updateCRSchema,
  submitCRSchema,
  listCRSchema,
};
