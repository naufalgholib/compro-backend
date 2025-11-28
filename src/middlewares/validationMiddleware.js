const { badRequest } = require('../utils/apiError');

/**
 * Validation Middleware Factory
 * Creates middleware that validates request body against Zod schema
 * @param {import('zod').ZodSchema} schema - Zod validation schema
 * @param {string} source - Where to get data from ('body', 'query', 'params')
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);
      
      if (!result.success) {
        const errors = result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return next(badRequest('Validasi gagal', errors));
      }
      
      // Replace with parsed/transformed data
      req[source] = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate body
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * Validate query params
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * Validate URL params
 */
const validateParams = (schema) => validate(schema, 'params');

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
};
