require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  azure: {
    connectionString: process.env.AZURE_COMMUNICATION_CONNECTION_STRING,
    senderAddress: process.env.AZURE_EMAIL_SENDER_ADDRESS || 'DoNotReply@your-domain.azurecomm.net',
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    maxFiles: parseInt(process.env.MAX_FILES) || 5,
    path: process.env.UPLOAD_PATH || './uploads',
  },
};
