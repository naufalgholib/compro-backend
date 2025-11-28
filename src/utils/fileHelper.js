const fs = require('fs');
const path = require('path');

/**
 * Delete file from filesystem
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>}
 */
async function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get file extension from filename
 * @param {string} filename 
 * @returns {string}
 */
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

/**
 * Check if file type is allowed
 * @param {string} mimeType 
 * @returns {boolean}
 */
function isAllowedFileType(mimeType) {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
  ];
  return allowedTypes.includes(mimeType);
}

module.exports = {
  deleteFile,
  ensureDirectoryExists,
  getFileExtension,
  isAllowedFileType,
};
