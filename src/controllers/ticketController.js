const ticketService = require('../services/ticketService');
const pdfService = require('../services/pdfService');
const { response } = require('../utils');

/**
 * Create new Change Request
 * POST /api/tickets
 */
async function createCR(req, res, next) {
  try {
    const { formData } = req.body;
    const cr = await ticketService.createCR(req.user.id, formData);
    return response.created(res, cr, 'Change Request berhasil dibuat');
  } catch (error) {
    next(error);
  }
}

/**
 * Get CR by ID
 * GET /api/tickets/:id
 */
async function getCRById(req, res, next) {
  try {
    const cr = await ticketService.getCRById(req.params.id, req.user);
    return response.success(res, cr);
  } catch (error) {
    next(error);
  }
}

/**
 * Get CR list (filtered by role)
 * GET /api/tickets
 */
async function getCRList(req, res, next) {
  try {
    const result = await ticketService.getCRList(req.user, req.query);
    return response.paginated(res, result.data, result.pagination);
  } catch (error) {
    next(error);
  }
}

/**
 * Update CR
 * PUT /api/tickets/:id
 */
async function updateCR(req, res, next) {
  try {
    const { formData } = req.body;
    const cr = await ticketService.updateCR(req.params.id, req.user.id, formData);
    return response.success(res, cr, 'Change Request berhasil diupdate');
  } catch (error) {
    next(error);
  }
}

/**
 * Delete CR (soft delete)
 * DELETE /api/tickets/:id
 */
async function deleteCR(req, res, next) {
  try {
    await ticketService.deleteCR(req.params.id, req.user.id);
    return response.success(res, null, 'Change Request berhasil dihapus');
  } catch (error) {
    next(error);
  }
}

/**
 * Submit CR for approval
 * POST /api/tickets/:id/submit
 */
async function submitCR(req, res, next) {
  try {
    const cr = await ticketService.submitCR(req.params.id, req.user.id);
    return response.success(res, cr, 'Change Request berhasil disubmit untuk approval');
  } catch (error) {
    next(error);
  }
}

/**
 * Resubmit CR after revision
 * POST /api/tickets/:id/resubmit
 */
async function resubmitCR(req, res, next) {
  try {
    const cr = await ticketService.resubmitCR(req.params.id, req.user.id);
    return response.success(res, cr, 'Change Request berhasil diresubmit');
  } catch (error) {
    next(error);
  }
}

/**
 * Upload document to CR
 * POST /api/tickets/:id/documents
 */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return response.error(res, 'File tidak ditemukan', 400);
    }
    const document = await ticketService.addDocument(req.params.id, req.user.id, req.file);
    return response.created(res, document, 'Dokumen berhasil diupload');
  } catch (error) {
    next(error);
  }
}

/**
 * Delete document from CR
 * DELETE /api/tickets/:id/documents/:docId
 */
async function deleteDocument(req, res, next) {
  try {
    await ticketService.deleteDocument(req.params.id, parseInt(req.params.docId), req.user.id);
    return response.success(res, null, 'Dokumen berhasil dihapus');
  } catch (error) {
    next(error);
  }
}

/**
 * Download document from CR - returns SAS URL or redirects
 * GET /api/tickets/:id/documents/:docId/download
 * Query params:
 *   - redirect=true: redirect to download URL
 *   - redirect=false (default): return JSON with download URL
 */
async function downloadDocument(req, res, next) {
  try {
    const downloadInfo = await ticketService.downloadDocument(
      req.params.id,
      parseInt(req.params.docId),
      req.user
    );
    
    // Check if client wants redirect or JSON response
    const shouldRedirect = req.query.redirect === 'true';
    
    if (shouldRedirect) {
      // Redirect to SAS URL for direct download
      return res.redirect(downloadInfo.downloadUrl);
    }
    
    // Return JSON with download URL (default)
    return response.success(res, downloadInfo, 'Download URL generated');
  } catch (error) {
    next(error);
  }
}

/**
 * Get CR progress tracking
 * GET /api/tickets/:id/progress
 */
async function getProgress(req, res, next) {
  try {
    // First check access
    await ticketService.getCRById(req.params.id, req.user);
    const progress = await ticketService.getProgress(req.params.id);
    return response.success(res, progress);
  } catch (error) {
    next(error);
  }
}

/**
 * Download approval PDF - returns SAS URL or redirects
 * GET /api/tickets/:id/pdf
 * Query params:
 *   - type: 'approval' or 'form'
 *   - redirect=true: redirect to download URL
 *   - redirect=false (default): return JSON with download URL
 */
async function downloadPDF(req, res, next) {
  try {
    // Check access first
    await ticketService.getCRById(req.params.id, req.user);
    
    const type = req.query.type || 'approval';
    const downloadInfo = await pdfService.downloadPDF(req.params.id, type);
    
    // Check if client wants redirect or JSON response
    const shouldRedirect = req.query.redirect === 'true';
    
    if (shouldRedirect) {
      // Redirect to SAS URL for direct download
      return res.redirect(downloadInfo.downloadUrl);
    }
    
    // Return JSON with download URL (default)
    return response.success(res, downloadInfo, 'Download URL generated');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCR,
  getCRById,
  getCRList,
  updateCR,
  deleteCR,
  submitCR,
  resubmitCR,
  uploadDocument,
  deleteDocument,
  downloadDocument,
  getProgress,
  downloadPDF,
};
