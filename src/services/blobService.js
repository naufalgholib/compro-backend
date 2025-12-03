const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const config = require('../config');

let blobServiceClient = null;
let containerClient = null;
let sharedKeyCredential = null;

/**
 * Initialize Azure Blob Storage client
 * @returns {object} Container client
 */
function initBlobClient() {
  if (!config.azure.blobConnectionString) {
    console.warn('Azure Blob Storage connection string not configured. File uploads will fail.');
    return null;
  }

  if (!containerClient) {
    try {
      blobServiceClient = BlobServiceClient.fromConnectionString(config.azure.blobConnectionString);
      containerClient = blobServiceClient.getContainerClient(config.azure.blobContainerName);
      
      // Extract account name and key from connection string for SAS generation
      const connStringParts = config.azure.blobConnectionString.split(';');
      let accountName = '';
      let accountKey = '';
      
      for (const part of connStringParts) {
        if (part.startsWith('AccountName=')) {
          accountName = part.substring('AccountName='.length);
        } else if (part.startsWith('AccountKey=')) {
          accountKey = part.substring('AccountKey='.length);
        }
      }
      
      if (accountName && accountKey) {
        sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
      }
      
      console.log(`Azure Blob Storage initialized. Container: ${config.azure.blobContainerName}`);
    } catch (error) {
      console.error('Failed to initialize Azure Blob Storage:', error.message);
      return null;
    }
  }

  return containerClient;
}

/**
 * Ensure container exists (create if not)
 * @returns {Promise<boolean>}
 */
async function ensureContainerExists() {
  const client = initBlobClient();
  if (!client) return false;

  try {
    // Create container with private access (default)
    // All blob access must go through backend API with authentication
    await client.createIfNotExists();
    return true;
  } catch (error) {
    console.error('Failed to create container:', error.message);
    return false;
  }
}

/**
 * Upload file buffer to Azure Blob Storage
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - MIME type
 * @param {string} folder - Folder path in container (e.g., 'attachments', 'pdf')
 * @returns {Promise<object>} Upload result with URL and blob name
 */
async function uploadBuffer(buffer, originalName, mimeType, folder = 'attachments') {
  const client = initBlobClient();
  if (!client) {
    throw new Error('Azure Blob Storage not configured');
  }

  await ensureContainerExists();

  // Generate unique blob name with folder structure
  const extension = path.extname(originalName);
  const uniqueName = `${folder}/${uuidv4()}${extension}`;

  const blockBlobClient = client.getBlockBlobClient(uniqueName);

  // Upload buffer
  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: {
      blobContentType: mimeType,
      blobContentDisposition: `inline; filename="${originalName}"`,
    },
  });

  return {
    blobName: uniqueName,
    url: blockBlobClient.url,
    size: buffer.length,
  };
}

/**
 * Upload file from multer (memory storage)
 * @param {object} file - Multer file object (with buffer)
 * @param {string} folder - Folder path in container
 * @returns {Promise<object>} Upload result
 */
async function uploadFile(file, folder = 'attachments') {
  return uploadBuffer(file.buffer, file.originalname, file.mimetype, folder);
}

/**
 * Delete blob from Azure Blob Storage
 * @param {string} blobNameOrUrl - Blob name or full URL
 * @returns {Promise<boolean>}
 */
async function deleteBlob(blobNameOrUrl) {
  const client = initBlobClient();
  if (!client) {
    console.warn('Azure Blob Storage not configured, cannot delete blob');
    return false;
  }

  try {
    // Extract blob name from URL if full URL is provided
    let blobName = blobNameOrUrl;
    if (blobNameOrUrl.startsWith('http')) {
      const url = new URL(blobNameOrUrl);
      // Remove container name from path
      const pathParts = url.pathname.split('/');
      // Path format: /container-name/folder/filename
      blobName = pathParts.slice(2).join('/');
    }

    const blockBlobClient = client.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
    return true;
  } catch (error) {
    console.error('Failed to delete blob:', error.message);
    return false;
  }
}

/**
 * Get blob URL for a given blob name
 * @param {string} blobName - Blob name
 * @returns {string} Full URL
 */
function getBlobUrl(blobName) {
  const client = initBlobClient();
  if (!client) {
    return null;
  }

  const blockBlobClient = client.getBlockBlobClient(blobName);
  return blockBlobClient.url;
}

/**
 * Download blob as buffer
 * @param {string} blobNameOrUrl - Blob name or full URL
 * @returns {Promise<Buffer>} File buffer
 */
async function downloadBlob(blobNameOrUrl) {
  const client = initBlobClient();
  if (!client) {
    throw new Error('Azure Blob Storage not configured');
  }

  // Extract blob name from URL if full URL is provided
  let blobName = blobNameOrUrl;
  if (blobNameOrUrl.startsWith('http')) {
    const url = new URL(blobNameOrUrl);
    const pathParts = url.pathname.split('/');
    blobName = pathParts.slice(2).join('/');
  }

  const blockBlobClient = client.getBlockBlobClient(blobName);
  const downloadResponse = await blockBlobClient.download();

  // Convert readable stream to buffer
  const chunks = [];
  for await (const chunk of downloadResponse.readableStreamBody) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Get blob properties
 * @param {string} blobNameOrUrl - Blob name or full URL
 * @returns {Promise<object>} Blob properties
 */
async function getBlobProperties(blobNameOrUrl) {
  const client = initBlobClient();
  if (!client) {
    throw new Error('Azure Blob Storage not configured');
  }

  let blobName = blobNameOrUrl;
  if (blobNameOrUrl.startsWith('http')) {
    const url = new URL(blobNameOrUrl);
    const pathParts = url.pathname.split('/');
    blobName = pathParts.slice(2).join('/');
  }

  const blockBlobClient = client.getBlockBlobClient(blobName);
  const properties = await blockBlobClient.getProperties();

  return {
    contentType: properties.contentType,
    contentLength: properties.contentLength,
    lastModified: properties.lastModified,
  };
}

/**
 * Check if Azure Blob Storage is configured
 * @returns {boolean}
 */
function isConfigured() {
  return !!config.azure.blobConnectionString;
}

/**
 * Extract blob name from URL or return as-is if already blob name
 * @param {string} blobNameOrUrl - Blob name or full URL
 * @returns {string} Blob name
 */
function extractBlobName(blobNameOrUrl) {
  if (blobNameOrUrl.startsWith('http')) {
    const url = new URL(blobNameOrUrl);
    const pathParts = url.pathname.split('/');
    // Path format: /container-name/folder/filename
    return pathParts.slice(2).join('/');
  }
  return blobNameOrUrl;
}

/**
 * Generate SAS URL for blob download
 * @param {string} blobNameOrUrl - Blob name or full URL
 * @param {object} options - SAS options
 * @param {number} options.expiresInMinutes - Expiry time in minutes (default: 5)
 * @param {string} options.contentDisposition - Content disposition header for download
 * @returns {string} SAS URL for direct download
 */
function generateSasUrl(blobNameOrUrl, options = {}) {
  const client = initBlobClient();
  if (!client || !sharedKeyCredential) {
    throw new Error('Azure Blob Storage not configured or credentials not available');
  }

  const blobName = extractBlobName(blobNameOrUrl);
  const expiresInMinutes = options.expiresInMinutes || 5;
  
  // Set start time to 1 minute ago to handle clock skew
  const startsOn = new Date();
  startsOn.setMinutes(startsOn.getMinutes() - 1);
  
  // Set expiry time
  const expiresOn = new Date();
  expiresOn.setMinutes(expiresOn.getMinutes() + expiresInMinutes);

  // Generate SAS token
  const sasOptions = {
    containerName: config.azure.blobContainerName,
    blobName: blobName,
    permissions: BlobSASPermissions.parse('r'), // Read only
    startsOn: startsOn,
    expiresOn: expiresOn,
  };

  // Add content disposition if provided (for download filename)
  if (options.contentDisposition) {
    sasOptions.contentDisposition = options.contentDisposition;
  }

  const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
  
  const blockBlobClient = client.getBlockBlobClient(blobName);
  return `${blockBlobClient.url}?${sasToken}`;
}

/**
 * Get download info with SAS URL
 * @param {string} blobNameOrUrl - Blob name or full URL
 * @param {string} originalFileName - Original file name for download
 * @param {number} expiresInMinutes - URL expiry time in minutes
 * @returns {Promise<object>} Download info with SAS URL
 */
async function getDownloadUrl(blobNameOrUrl, originalFileName, expiresInMinutes = 5) {
  const properties = await getBlobProperties(blobNameOrUrl);
  
  const sasUrl = generateSasUrl(blobNameOrUrl, {
    expiresInMinutes,
    contentDisposition: `attachment; filename="${originalFileName}"`,
  });

  return {
    downloadUrl: sasUrl,
    fileName: originalFileName,
    contentType: properties.contentType,
    fileSize: properties.contentLength,
    expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString(),
  };
}

module.exports = {
  initBlobClient,
  ensureContainerExists,
  uploadBuffer,
  uploadFile,
  deleteBlob,
  getBlobUrl,
  downloadBlob,
  getBlobProperties,
  isConfigured,
  extractBlobName,
  generateSasUrl,
  getDownloadUrl,
};
