const prisma = require('../config/prisma');
const { badRequest, forbidden, notFound } = require('../utils/apiError');
const notificationService = require('./notificationService');
const pdfService = require('./pdfService');

/**
 * Manager approve CR
 * @param {string} crId 
 * @param {object} user - Manager user
 * @param {string} notes - Optional notes
 * @returns {Promise<object>} Updated CR
 */
async function managerApprove(crId, user, notes = null) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: {
      user: {
        select: { id: true, name: true, email: true, division: true },
      },
    },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  // Check if manager's division matches
  if (cr.user.division !== user.division) {
    throw forbidden('Anda tidak dapat approve CR dari divisi lain');
  }

  // Check valid status
  if (cr.status !== 'PENDING_MANAGER') {
    throw badRequest('CR tidak dalam status menunggu approval Manager');
  }

  // Update CR status
  const updatedCR = await prisma.changeRequest.update({
    where: { id: crId },
    data: {
      status: 'PENDING_VP',
      currentApproverRole: 'VP',
    },
  });

  // Create approval log
  await prisma.approvalLog.create({
    data: {
      crId,
      approverId: user.id,
      action: 'APPROVE',
      notes: notes || 'Approved by Manager',
    },
  });

  // Notify VP
  await notificationService.notifyByRole('VP', {
    title: 'CR Perlu Approval VP',
    message: `CR ${crId} telah diapprove Manager dan menunggu persetujuan VP IT`,
    type: 'CR_PENDING_VP',
    relatedId: crId,
  });

  // Notify creator
  const managerNotes = notes ? ` Catatan: ${notes}` : '';
  await notificationService.notifyUser(cr.userId, {
    title: 'CR Diapprove Manager',
    message: `CR ${crId} Anda telah diapprove oleh Manager dan sedang menunggu approval VP IT.${managerNotes}`,
    type: 'CR_APPROVED_MANAGER',
    relatedId: crId,
  });

  return updatedCR;
}

/**
 * Manager reject CR (Final - cannot resubmit)
 * @param {string} crId 
 * @param {object} user - Manager user
 * @param {string} notes - Rejection reason (min 50 chars)
 * @returns {Promise<object>} Updated CR
 */
async function managerReject(crId, user, notes) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: {
      user: {
        select: { id: true, name: true, email: true, division: true },
      },
    },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  if (cr.user.division !== user.division) {
    throw forbidden('Anda tidak dapat reject CR dari divisi lain');
  }

  if (cr.status !== 'PENDING_MANAGER') {
    throw badRequest('CR tidak dalam status menunggu approval Manager');
  }

  // Final rejection
  const updatedCR = await prisma.changeRequest.update({
    where: { id: crId },
    data: {
      status: 'REJECTED_MANAGER',
      currentApproverRole: null,
    },
  });

  // Create approval log
  await prisma.approvalLog.create({
    data: {
      crId,
      approverId: user.id,
      action: 'REJECT',
      notes,
    },
  });

  // Notify creator
  await notificationService.notifyUser(cr.userId, {
    title: 'CR Ditolak Manager (Final)',
    message: `CR ${crId} Anda telah ditolak oleh Manager. Alasan: ${notes}. CR ini tidak dapat diajukan ulang.`,
    type: 'CR_REJECTED_FINAL',
    relatedId: crId,
  });

  return updatedCR;
}

/**
 * Manager request revision
 * @param {string} crId 
 * @param {object} user - Manager user
 * @param {string} notes - Revision instructions (min 50 chars)
 * @returns {Promise<object>} Updated CR
 */
async function managerRequestRevision(crId, user, notes) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: {
      user: {
        select: { id: true, name: true, email: true, division: true },
      },
    },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  if (cr.user.division !== user.division) {
    throw forbidden('Anda tidak dapat request revision untuk CR dari divisi lain');
  }

  if (cr.status !== 'PENDING_MANAGER') {
    throw badRequest('CR tidak dalam status menunggu approval Manager');
  }

  // Check max revisions (3)
  if (cr.managerRevisionCount >= 3) {
    throw badRequest('CR sudah mencapai batas maksimal revisi dari Manager (3x)');
  }

  const updatedCR = await prisma.changeRequest.update({
    where: { id: crId },
    data: {
      status: 'REVISION_MANAGER',
      currentApproverRole: null,
    },
  });

  // Create approval log
  await prisma.approvalLog.create({
    data: {
      crId,
      approverId: user.id,
      action: 'REQUEST_REVISION',
      notes,
    },
  });

  // Notify creator
  await notificationService.notifyUser(cr.userId, {
    title: 'CR Perlu Revisi',
    message: `CR ${crId} Anda memerlukan revisi. Instruksi: ${notes}`,
    type: 'CR_REVISION_MANAGER',
    relatedId: crId,
  });

  return updatedCR;
}

/**
 * VP approve CR (Final - triggers PDF generation)
 * @param {string} crId 
 * @param {object} user - VP user
 * @param {string} notes - Optional notes
 * @returns {Promise<object>} Updated CR
 */
async function vpApprove(crId, user, notes = null) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: {
      user: {
        select: { id: true, name: true, email: true, division: true },
      },
    },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  if (cr.status !== 'PENDING_VP') {
    throw badRequest('CR tidak dalam status menunggu approval VP');
  }

  // Update CR status
  const updatedCR = await prisma.changeRequest.update({
    where: { id: crId },
    data: {
      status: 'APPROVED',
      currentApproverRole: 'MANAGER_IT',
    },
  });

  // Create approval log
  await prisma.approvalLog.create({
    data: {
      crId,
      approverId: user.id,
      action: 'APPROVE',
      notes: notes || 'Approved by VP IT',
    },
  });

  // Generate PDF documentation
  try {
    await pdfService.generateApprovalPDF(crId);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }

  // Notify Manager IT
  await notificationService.notifyByRole('MANAGER_IT', {
    title: 'CR Perlu Mapping Developer',
    message: `CR ${crId} telah diapprove VP IT dan perlu di-assign ke Developer`,
    type: 'CR_NEED_MAPPING',
    relatedId: crId,
  });

  // Notify creator and manager
  const vpNotes = notes ? ` Catatan: ${notes}` : '';
  await notificationService.notifyUser(cr.userId, {
    title: 'CR Diapprove VP IT',
    message: `CR ${crId} Anda telah diapprove oleh VP IT.${vpNotes}`,
    type: 'CR_APPROVED_VP',
    relatedId: crId,
  });

  return updatedCR;
}

/**
 * VP reject CR (Final - Manager approval voided)
 * @param {string} crId 
 * @param {object} user - VP user
 * @param {string} notes - Rejection reason
 * @returns {Promise<object>} Updated CR
 */
async function vpReject(crId, user, notes) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: {
      user: {
        select: { id: true, name: true, email: true, division: true },
      },
    },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  if (cr.status !== 'PENDING_VP') {
    throw badRequest('CR tidak dalam status menunggu approval VP');
  }

  // Final rejection - Manager approval voided
  const updatedCR = await prisma.changeRequest.update({
    where: { id: crId },
    data: {
      status: 'REJECTED_VP',
      currentApproverRole: null,
    },
  });

  // Create approval log
  await prisma.approvalLog.create({
    data: {
      crId,
      approverId: user.id,
      action: 'REJECT',
      notes: `[VP REJECT - Manager Approval Voided] ${notes}`,
    },
  });

  // Notify creator
  await notificationService.notifyUser(cr.userId, {
    title: 'CR Ditolak VP IT (Final)',
    message: `CR ${crId} Anda ditolak oleh VP IT. Approval Manager hangus. Alasan: ${notes}`,
    type: 'CR_REJECTED_VP',
    relatedId: crId,
  });

  return updatedCR;
}

/**
 * VP request revision (Manager approval voided)
 * @param {string} crId 
 * @param {object} user - VP user
 * @param {string} notes - Revision instructions
 * @returns {Promise<object>} Updated CR
 */
async function vpRequestRevision(crId, user, notes) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: {
      user: {
        select: { id: true, name: true, email: true, division: true },
      },
    },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  if (cr.status !== 'PENDING_VP') {
    throw badRequest('CR tidak dalam status menunggu approval VP');
  }

  // Check max VP revisions (2)
  if (cr.vpRevisionCount >= 2) {
    throw badRequest('CR sudah mencapai batas maksimal revisi dari VP (2x)');
  }

  // Revision - Manager approval voided
  const updatedCR = await prisma.changeRequest.update({
    where: { id: crId },
    data: {
      status: 'REVISION_VP',
      currentApproverRole: null,
    },
  });

  // Create approval log
  await prisma.approvalLog.create({
    data: {
      crId,
      approverId: user.id,
      action: 'REQUEST_REVISION',
      notes: `[VP REVISION - Manager Approval Voided] ${notes}`,
    },
  });

  // Notify creator
  await notificationService.notifyUser(cr.userId, {
    title: 'CR Perlu Revisi dari VP IT',
    message: `CR ${crId} Anda memerlukan revisi dari VP IT. Approval Manager hangus. Instruksi: ${notes}`,
    type: 'CR_REVISION_VP',
    relatedId: crId,
  });

  return updatedCR;
}

/**
 * Manager IT assign developer(s)
 * @param {string} crId 
 * @param {object} user - Manager IT user
 * @param {Array<string>} developerIds - Developer IDs to assign
 * @param {string} notes - Assignment notes
 * @returns {Promise<object>} Updated CR
 */
async function assignDeveloper(crId, user, developerIds, notes = null) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: {
      user: {
        select: { id: true, name: true, email: true, division: true },
      },
    },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  if (cr.status !== 'APPROVED') {
    throw badRequest('CR tidak dalam status Approved');
  }

  // Verify developers exist and have DEV role
  const developers = await prisma.user.findMany({
    where: {
      id: { in: developerIds },
      role: 'DEV',
    },
  });

  if (developers.length !== developerIds.length) {
    throw badRequest('Satu atau lebih developer tidak valid');
  }

  // Create assignments
  await prisma.developerAssignment.createMany({
    data: developerIds.map((devId) => ({
      crId,
      developerId: devId,
      assignedById: user.id,
      notes,
    })),
  });

  // Update CR status
  const updatedCR = await prisma.changeRequest.update({
    where: { id: crId },
    data: {
      status: 'ASSIGNED_DEV',
      currentApproverRole: null,
    },
    include: {
      developerAssignments: {
        include: {
          developer: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  // Notify developers
  for (const devId of developerIds) {
    await notificationService.notifyUser(devId, {
      title: 'CR Baru Di-assign',
      message: `CR ${crId} telah di-assign kepada Anda.${notes ? ` Catatan: ${notes}` : ''}`,
      type: 'CR_ASSIGNED',
      relatedId: crId,
    });
  }

  // Notify creator with developer names
  const devNames = developers.map(d => d.name).join(', ');
  const assignNotes = notes ? ` Catatan: ${notes}` : '';
  await notificationService.notifyUser(cr.userId, {
    title: 'CR Di-assign ke Developer',
    message: `CR ${crId} Anda telah di-assign ke developer: ${devNames}.${assignNotes}`,
    type: 'CR_ASSIGNED_DEV',
    relatedId: crId,
  });

  return updatedCR;
}

/**
 * Mark CR as completed (optional - for tracking)
 * @param {string} crId 
 * @param {object} user 
 * @returns {Promise<object>} Updated CR
 */
async function markCompleted(crId, user) {
  const cr = await prisma.changeRequest.findUnique({
    where: { id: crId },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  if (!cr) {
    throw notFound('Change Request tidak ditemukan');
  }

  if (cr.status !== 'ASSIGNED_DEV') {
    throw badRequest('CR tidak dalam status Assigned Developer');
  }

  // Only Manager IT or assigned developer can mark as completed
  if (user.role === 'DEV') {
    const assignment = await prisma.developerAssignment.findFirst({
      where: { crId, developerId: user.id },
    });
    if (!assignment) {
      throw forbidden('Anda tidak di-assign ke CR ini');
    }
  } else if (user.role !== 'MANAGER_IT') {
    throw forbidden('Hanya Manager IT atau Developer yang di-assign yang dapat menyelesaikan CR');
  }

  const updatedCR = await prisma.changeRequest.update({
    where: { id: crId },
    data: {
      status: 'COMPLETED',
    },
  });

  // Notify creator that CR is completed
  await notificationService.notifyUser(cr.userId, {
    title: 'CR Selesai',
    message: `CR ${crId} Anda telah selesai dikerjakan oleh Developer.`,
    type: 'CR_COMPLETED',
    relatedId: crId,
  });

  return updatedCR;
}

module.exports = {
  managerApprove,
  managerReject,
  managerRequestRevision,
  vpApprove,
  vpReject,
  vpRequestRevision,
  assignDeveloper,
  markCompleted,
};
