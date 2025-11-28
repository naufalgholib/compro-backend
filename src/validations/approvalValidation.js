const { z } = require('zod');

// Approval action schema
const approveSchema = z.object({
  notes: z.string().optional(),
});

// Reject (Final) schema - min 50 chars for reason
const rejectSchema = z.object({
  notes: z.string().min(50, 'Alasan penolakan minimal 50 karakter'),
});

// Request Revision schema - min 50 chars with instruction
const revisionSchema = z.object({
  notes: z.string().min(50, 'Alasan dan instruksi perbaikan minimal 50 karakter'),
});

// Manager IT assign developer schema
const assignDeveloperSchema = z.object({
  developerIds: z.array(z.string().uuid('ID developer tidak valid')).min(1, 'Minimal pilih 1 developer'),
  notes: z.string().optional(),
});

module.exports = {
  approveSchema,
  rejectSchema,
  revisionSchema,
  assignDeveloperSchema,
};
