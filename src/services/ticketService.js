const prisma = require('../config/prisma');
const { generateCRId } = require('../utils/idGenerator');
const { badRequest, forbidden, notFound } = require('../utils/apiError');
const blobService = require('./blobService');
const notificationService = require('./notificationService');

/**
 * Create new Change Request (Draft)
 * @param {string} userId - Creator user ID
 * @param {object} formData - CR form data
 * @returns {Promise<object>} Created CR
 */
async function createCR(userId, formData) {
  const crId = await generateCRId();

  const cr = await prisma.changeRequest.create({
    data: {
      id: crId,
      userId,
      formData,
      status: 'DRAFT',
      currentApproverRole: null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          division: true,
        },
      },
    },
  });

  return cr;
}

/**
 * Get CR by ID
 * @param {string} crId 
 * @param {object} user - Current user
 * @returns {Promise<object>} CR with details
 */
async function getCRById(crId, user) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          division: true,
          role: true,
        },
      },
      approvalLogs: {
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      developerAssignments: {
        include: {
          developer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      documents: true,
    },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  // Check access based on role
  const hasAccess = checkCRAccess(cr, user);
  if (!hasAccess) {
    throw forbidden('Anda tidak memiliki akses ke CR ini');
  }

  return cr;
}

/**
 * Check if user has access to CR
 * @param {object} cr - Change Request
 * @param {object} user - Current user
 * @returns {boolean}
 */
function checkCRAccess(cr, user) {
  // Deleted CR only visible to owner
  if (cr.status === 'DELETED') {
    return cr.userId === user.id;
  }

  switch (user.role) {
    case 'USER':
      // Users can only see their own CRs
      return cr.userId === user.id;
    
    case 'MANAGER':
      // Managers can see CRs from their own division
      return cr.user.division === user.division;
    
    case 'VP':
      // VP can see all CRs that have been approved by manager (PENDING_VP and above)
      return ['PENDING_VP', 'REJECTED_VP', 'REVISION_VP', 'APPROVED', 'ASSIGNED_DEV', 'COMPLETED'].includes(cr.status) 
        || cr.userId === user.id;
    
    case 'MANAGER_IT':
      // Manager IT can see CRs that have been approved by VP
      return ['APPROVED', 'ASSIGNED_DEV', 'COMPLETED'].includes(cr.status);
    
    case 'DEV':
      // Developers can only see CRs assigned to them
      const isAssigned = cr.developerAssignments?.some(a => a.developerId === user.id);
      return isAssigned;
    
    default:
      return false;
  }
}

/**
 * Get CRs list based on user role
 * @param {object} user - Current user
 * @param {object} options - Pagination and filter options
 * @returns {Promise<object>} List of CRs with pagination
 */
async function getCRList(user, options = {}) {
  const { status, sortBy = 'createdAt', sortOrder = 'desc', search } = options;
  
  // Ensure page and limit are integers
  const page = parseInt(options.page, 10) || 1;
  const limit = parseInt(options.limit, 10) || 20;
  const skip = (page - 1) * limit;

  // Build where clause based on user role
  let where = { status: { not: 'DELETED' } };

  switch (user.role) {
    case 'USER':
      where.userId = user.id;
      break;
    
    case 'MANAGER':
      where.user = { division: user.division };
      break;
    
    case 'VP':
      // VP sees CRs pending their approval
      where.status = { in: ['PENDING_VP', 'REJECTED_VP', 'REVISION_VP', 'APPROVED', 'ASSIGNED_DEV', 'COMPLETED'] };
      break;
    
    case 'MANAGER_IT':
      // Manager IT sees approved CRs for mapping
      where.status = { in: ['APPROVED', 'ASSIGNED_DEV', 'COMPLETED'] };
      break;
    
    case 'DEV':
      // Developers only see assigned CRs
      where.developerAssignments = { some: { developerId: user.id } };
      break;
  }

  // Add status filter if provided
  if (status) {
    if (user.role === 'VP' || user.role === 'MANAGER_IT') {
      // Intersect with existing status filter
      const allowedStatuses = where.status.in || [];
      where.status = allowedStatuses.includes(status) ? status : { in: [] };
    } else {
      where.status = status;
    }
  }

  // Add search filter
  if (search) {
    where.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { formData: { path: ['title'], string_contains: search } },
    ];
  }

  // Get total count
  const total = await prisma.changeRequest.count({ where });

  // Get CRs
  const crs = await prisma.changeRequest.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          division: true,
        },
      },
      approvalLogs: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: {
          approver: {
            select: {
              name: true,
              role: true,
            },
          },
        },
      },
      developerAssignments: {
        include: {
          developer: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: { documents: true },
      },
    },
    orderBy: { [sortBy]: sortOrder },
    skip,
    take: limit,
  });

  return {
    data: crs,
    pagination: {
      page,
      limit,
      total,
    },
  };
}

/**
 * Update CR (only for draft or revision status)
 * @param {string} crId 
 * @param {string} userId 
 * @param {object} formData 
 * @returns {Promise<object>} Updated CR
 */
async function updateCR(crId, userId, formData) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  // Check ownership
  if (cr.userId !== userId) {
    throw forbidden('Anda tidak memiliki akses untuk mengedit CR ini');
  }

  // Check if editable (only DRAFT, REVISION_MANAGER, REVISION_VP)
  const editableStatuses = ['DRAFT', 'REVISION_MANAGER', 'REVISION_VP'];
  if (!editableStatuses.includes(cr.status)) {
    throw badRequest('CR tidak dapat diedit. Status saat ini: ' + cr.status);
  }

  const updatedCR = await prisma.changeRequest.update({
    where: { id: crId },
    data: {
      formData,
      updatedAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          division: true,
        },
      },
    },
  });

  return updatedCR;
}

/**
 * Delete CR (soft delete, only for draft status)
 * @param {string} crId 
 * @param {string} userId 
 */
async function deleteCR(crId, userId) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: { documents: true },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  // Check ownership
  if (cr.userId !== userId) {
    throw forbidden('Anda tidak memiliki akses untuk menghapus CR ini');
  }

  // Only draft can be deleted
  if (cr.status !== 'DRAFT') {
    throw badRequest('Hanya CR dengan status DRAFT yang dapat dihapus');
  }

  // Soft delete (change status to DELETED)
  await prisma.changeRequest.update({
    where: { id: crId },
    data: { status: 'DELETED' },
  });

  // Delete associated files from Azure Blob Storage
  for (const doc of cr.documents) {
    await blobService.deleteBlob(doc.filePath);
  }
}

/**
 * Submit CR for approval (DRAFT -> PENDING_MANAGER)
 * @param {string} crId 
 * @param {string} userId 
 * @returns {Promise<object>} Updated CR
 */
async function submitCR(crId, userId) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: {
      user: {
        select: {
          division: true,
          name: true,
        },
      },
    },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  // Check ownership
  if (cr.userId !== userId) {
    throw forbidden('Anda tidak memiliki akses untuk submit CR ini');
  }

  // Only DRAFT can be submitted
  if (cr.status !== 'DRAFT') {
    throw badRequest('Hanya CR dengan status DRAFT yang dapat disubmit');
  }

  // Update status to PENDING_MANAGER
  const updatedCR = await prisma.changeRequest.update({
    where: { id: crId },
    data: {
      status: 'PENDING_MANAGER',
      currentApproverRole: 'MANAGER',
    },
  });

  // Create approval log
  await prisma.approvalLog.create({
    data: {
      crId,
      approverId: userId,
      action: 'SUBMIT',
      notes: 'CR submitted for manager approval',
    },
  });

  // Notify managers of same division
  await notificationService.notifyManagers(cr.user.division, {
    title: 'CR Baru Perlu Approval',
    message: `CR ${crId} dari ${cr.user.name} menunggu persetujuan Anda`,
    type: 'CR_SUBMITTED',
    relatedId: crId,
  });

  return updatedCR;
}

/**
 * Resubmit CR after revision
 * @param {string} crId 
 * @param {string} userId 
 * @returns {Promise<object>} Updated CR
 */
async function resubmitCR(crId, userId) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: {
      user: {
        select: {
          division: true,
          name: true,
        },
      },
    },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  // Check ownership
  if (cr.userId !== userId) {
    throw forbidden('Anda tidak memiliki akses untuk resubmit CR ini');
  }

  // Only revision statuses can be resubmitted
  if (!['REVISION_MANAGER', 'REVISION_VP'].includes(cr.status)) {
    throw badRequest('CR tidak dalam status revisi');
  }

  // Update counters and status
  const updateData = {
    status: 'PENDING_MANAGER',
    currentApproverRole: 'MANAGER',
  };

  if (cr.status === 'REVISION_MANAGER') {
    const newCount = cr.managerRevisionCount + 1;
    if (newCount > 3) {
      throw badRequest('Maksimal 3 kali revisi dari Manager');
    }
    updateData.managerRevisionCount = newCount;
  } else if (cr.status === 'REVISION_VP') {
    const newCount = cr.vpRevisionCount + 1;
    if (newCount > 2) {
      throw badRequest('Maksimal 2 kali revisi dari VP');
    }
    updateData.vpRevisionCount = newCount;
  }

  const updatedCR = await prisma.changeRequest.update({
    where: { id: crId },
    data: updateData,
  });

  // Create approval log
  await prisma.approvalLog.create({
    data: {
      crId,
      approverId: userId,
      action: 'RESUBMIT',
      notes: 'CR resubmitted after revision',
    },
  });

  // Notify managers
  await notificationService.notifyManagers(cr.user.division, {
    title: 'CR Revisi Perlu Approval',
    message: `CR ${crId} dari ${cr.user.name} telah direvisi dan menunggu persetujuan Anda`,
    type: 'CR_RESUBMITTED',
    relatedId: crId,
  });

  return updatedCR;
}

/**
 * Add document to CR
 * @param {string} crId 
 * @param {string} userId 
 * @param {object} fileData 
 * @returns {Promise<object>} Created document
 */
async function addDocument(crId, userId, fileData) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: { _count: { select: { documents: true } } },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  if (cr.userId !== userId) {
    throw forbidden('Anda tidak memiliki akses untuk menambah dokumen ke CR ini');
  }

  // Check max documents (5)
  if (cr._count.documents >= 5) {
    throw badRequest('Maksimal 5 dokumen per CR');
  }

  // Check if CR is editable
  const editableStatuses = ['DRAFT', 'REVISION_MANAGER', 'REVISION_VP'];
  if (!editableStatuses.includes(cr.status)) {
    throw badRequest('Dokumen tidak dapat ditambahkan. Status CR: ' + cr.status);
  }

  // Upload file to Azure Blob Storage
  const blobName = `attachments/${crId}/${Date.now()}-${fileData.originalname}`;
  const blobUrl = await blobService.uploadBuffer(
    fileData.buffer,
    blobName,
    fileData.mimetype
  );

  const document = await prisma.document.create({
    data: {
      crId,
      fileName: fileData.originalname,
      filePath: blobUrl,
      fileSize: fileData.size,
      mimeType: fileData.mimetype,
      fileType: 'ATTACHMENT',
    },
  });

  return document;
}

/**
 * Delete document from CR
 * @param {string} crId 
 * @param {number} documentId 
 * @param {string} userId 
 */
async function deleteDocument(crId, documentId, userId) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  if (cr.userId !== userId) {
    throw forbidden('Anda tidak memiliki akses untuk menghapus dokumen dari CR ini');
  }

  // Check if CR is editable
  const editableStatuses = ['DRAFT', 'REVISION_MANAGER', 'REVISION_VP'];
  if (!editableStatuses.includes(cr.status)) {
    throw badRequest('Dokumen tidak dapat dihapus. Status CR: ' + cr.status);
  }

  const document = await prisma.document.findFirst({
    where: { id: documentId, crId },
  });

  if (!document) {
    throw notFound('Dokumen tidak ditemukan');
  }

  // Delete file from Azure Blob Storage
  await blobService.deleteBlob(document.filePath);

  // Delete from database
  await prisma.document.delete({
    where: { id: documentId },
  });
}

/**
 * Download document from CR
 * @param {string} crId 
 * @param {number} documentId 
 * @param {object} user - User object with id and role
 * @returns {Promise<object>} Document buffer and info
 */
async function downloadDocument(crId, documentId, user) {
  // First check access to the CR
  await checkCRAccess(crId, user);

  const document = await prisma.document.findFirst({
    where: { id: documentId, crId },
  });

  if (!document) {
    throw notFound('Dokumen tidak ditemukan');
  }

  // Download from Azure Blob Storage
  const buffer = await blobService.downloadBlob(document.filePath);

  return {
    buffer,
    fileName: document.fileName,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
  };
}

/**
 * Get progress tracking for a CR
 * @param {string} crId 
 * @returns {Promise<object>} Progress data
 */
async function getProgress(crId) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: {
      approvalLogs: {
        include: {
          approver: {
            select: { name: true, role: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      developerAssignments: {
        include: {
          developer: { select: { name: true } },
        },
      },
    },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  // Define progress steps
  const steps = [
    { step: 1, name: 'Draft', status: 'completed', timestamp: cr.createdAt },
    { step: 2, name: 'Submit to Manager', status: 'pending', timestamp: null },
    { step: 3, name: 'Manager Approval', status: 'pending', timestamp: null },
    { step: 4, name: 'VP Approval', status: 'pending', timestamp: null },
    { step: 5, name: 'Assigned to Developer', status: 'pending', timestamp: null },
    { step: 6, name: 'Completed', status: 'pending', timestamp: null },
  ];

  // Update steps based on approval logs
  const submitLog = cr.approvalLogs.find(l => l.action === 'SUBMIT' || l.action === 'RESUBMIT');
  if (submitLog) {
    steps[1].status = 'completed';
    steps[1].timestamp = submitLog.createdAt;
  }

  const managerApproval = cr.approvalLogs.find(l => l.approver.role === 'MANAGER' && l.action === 'APPROVE');
  if (managerApproval) {
    steps[2].status = 'completed';
    steps[2].timestamp = managerApproval.createdAt;
    steps[2].approver = managerApproval.approver.name;
  }

  const vpApproval = cr.approvalLogs.find(l => l.approver.role === 'VP' && l.action === 'APPROVE');
  if (vpApproval) {
    steps[3].status = 'completed';
    steps[3].timestamp = vpApproval.createdAt;
    steps[3].approver = vpApproval.approver.name;
  }

  if (cr.developerAssignments.length > 0) {
    steps[4].status = 'completed';
    steps[4].timestamp = cr.developerAssignments[0].assignedAt;
    steps[4].developers = cr.developerAssignments.map(a => a.developer.name);
  }

  if (cr.status === 'COMPLETED') {
    steps[5].status = 'completed';
    steps[5].timestamp = cr.updatedAt;
  }

  // Set current step
  const currentStepIndex = steps.findIndex(s => s.status === 'pending');
  if (currentStepIndex > 0) {
    steps[currentStepIndex].status = 'current';
  }

  return {
    crId: cr.id,
    currentStatus: cr.status,
    steps,
  };
}

module.exports = {
  createCR,
  getCRById,
  getCRList,
  updateCR,
  deleteCR,
  submitCR,
  resubmitCR,
  addDocument,
  deleteDocument,
  downloadDocument,
  getProgress,
  checkCRAccess,
};
