const approvalService = require('../services/approvalService');
const { response } = require('../utils');

/**
 * Manager approve CR
 * POST /api/approval/:id/manager/approve
 */
async function managerApprove(req, res, next) {
  try {
    const { notes } = req.body;
    const cr = await approvalService.managerApprove(req.params.id, req.user, notes);
    return response.success(res, cr, 'Change Request berhasil diapprove');
  } catch (error) {
    next(error);
  }
}

/**
 * Manager reject CR (Final)
 * POST /api/approval/:id/manager/reject
 */
async function managerReject(req, res, next) {
  try {
    const { notes } = req.body;
    const cr = await approvalService.managerReject(req.params.id, req.user, notes);
    return response.success(res, cr, 'Change Request ditolak');
  } catch (error) {
    next(error);
  }
}

/**
 * Manager request revision
 * POST /api/approval/:id/manager/revision
 */
async function managerRequestRevision(req, res, next) {
  try {
    const { notes } = req.body;
    const cr = await approvalService.managerRequestRevision(req.params.id, req.user, notes);
    return response.success(res, cr, 'Permintaan revisi berhasil dikirim');
  } catch (error) {
    next(error);
  }
}

/**
 * VP approve CR
 * POST /api/approval/:id/vp/approve
 */
async function vpApprove(req, res, next) {
  try {
    const { notes } = req.body;
    const cr = await approvalService.vpApprove(req.params.id, req.user, notes);
    return response.success(res, cr, 'Change Request berhasil diapprove oleh VP');
  } catch (error) {
    next(error);
  }
}

/**
 * VP reject CR (Final)
 * POST /api/approval/:id/vp/reject
 */
async function vpReject(req, res, next) {
  try {
    const { notes } = req.body;
    const cr = await approvalService.vpReject(req.params.id, req.user, notes);
    return response.success(res, cr, 'Change Request ditolak oleh VP');
  } catch (error) {
    next(error);
  }
}

/**
 * VP request revision
 * POST /api/approval/:id/vp/revision
 */
async function vpRequestRevision(req, res, next) {
  try {
    const { notes } = req.body;
    const cr = await approvalService.vpRequestRevision(req.params.id, req.user, notes);
    return response.success(res, cr, 'Permintaan revisi VP berhasil dikirim');
  } catch (error) {
    next(error);
  }
}

/**
 * Manager IT assign developer(s)
 * POST /api/approval/:id/assign
 */
async function assignDeveloper(req, res, next) {
  try {
    const { developerIds, notes } = req.body;
    const cr = await approvalService.assignDeveloper(req.params.id, req.user, developerIds, notes);
    return response.success(res, cr, 'Developer berhasil di-assign');
  } catch (error) {
    next(error);
  }
}

/**
 * Mark CR as completed
 * POST /api/approval/:id/complete
 */
async function markCompleted(req, res, next) {
  try {
    const cr = await approvalService.markCompleted(req.params.id, req.user);
    return response.success(res, cr, 'Change Request telah diselesaikan');
  } catch (error) {
    next(error);
  }
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
