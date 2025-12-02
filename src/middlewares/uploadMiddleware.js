const multer = require('multer');
const config = require('../config');
const { isAllowedFileType } = require('../utils/fileHelper');
const { badRequest } = require('../utils/apiError');

// Use memory storage for Azure Blob Storage upload
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  if (isAllowedFileType(file.mimetype)) {
    cb(null, true);
  } else {
    cb(badRequest('Tipe file tidak diizinkan. Gunakan: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, TXT'), false);
  }
};

// Create multer upload instance with memory storage
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles,
  },
});

// Middleware for single file upload
const uploadSingle = (fieldName = 'file') => upload.single(fieldName);

// Middleware for multiple files upload (max 5)
const uploadMultiple = (fieldName = 'files', maxCount = 5) => upload.array(fieldName, maxCount);

// Middleware for multiple fields
const uploadFields = (fields) => upload.fields(fields);

// Error handler for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(badRequest(`Ukuran file maksimal ${config.upload.maxFileSize / (1024 * 1024)}MB`));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(badRequest(`Maksimal ${config.upload.maxFiles} file`));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(badRequest('Field file tidak sesuai'));
    }
    return next(badRequest(err.message));
  }
  next(err);
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleUploadError,
};
