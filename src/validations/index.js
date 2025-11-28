const { loginSchema, registerSchema, changePasswordSchema } = require('./authValidation');
const { formDataSchema, createCRSchema, updateCRSchema, submitCRSchema, listCRSchema } = require('./ticketValidation');
const { approveSchema, rejectSchema, revisionSchema, assignDeveloperSchema } = require('./approvalValidation');

module.exports = {
  // Auth
  loginSchema,
  registerSchema,
  changePasswordSchema,
  
  // Ticket/CR
  formDataSchema,
  createCRSchema,
  updateCRSchema,
  submitCRSchema,
  listCRSchema,
  
  // Approval
  approveSchema,
  rejectSchema,
  revisionSchema,
  assignDeveloperSchema,
};
