const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { roleMiddleware, ROLES } = require('../middlewares/roleMiddleware');
const { uploadSingle, handleUploadError } = require('../middlewares/uploadMiddleware');
const { validateBody, validateQuery } = require('../middlewares/validationMiddleware');
const { createCRSchema, updateCRSchema, listCRSchema } = require('../validations');

// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /tickets:
 *   get:
 *     summary: Get list of Change Requests (filtered by role)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PENDING_MANAGER, REJECTED_MANAGER, REVISION_MANAGER, PENDING_VP, REJECTED_VP, REVISION_VP, APPROVED, ASSIGNED_DEV, COMPLETED]
 *         description: Filter by status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, id]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by CR ID or title
 *     responses:
 *       200:
 *         description: List of CRs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', validateQuery(listCRSchema), ticketController.getCRList);

/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: Create new Change Request
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     description: Only USER role can create CR. CR will be created with DRAFT status.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCRRequest'
 *     responses:
 *       201:
 *         description: CR berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/ChangeRequest'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/',
  roleMiddleware(ROLES.USER),
  validateBody(createCRSchema),
  ticketController.createCR
);

/**
 * @swagger
 * /tickets/{id}:
 *   get:
 *     summary: Get Change Request by ID
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: CR ID (e.g., CR-2025-11-000001)
 *     responses:
 *       200:
 *         description: CR detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChangeRequest'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', ticketController.getCRById);

/**
 * @swagger
 * /tickets/{id}/progress:
 *   get:
 *     summary: Get CR progress tracking
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progress tracking data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CRProgress'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id/progress', ticketController.getProgress);

/**
 * @swagger
 * /tickets/{id}/pdf:
 *   get:
 *     summary: Get download URL for PDF document
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     description: Returns a temporary SAS URL (valid for 2 minutes) for direct PDF download from Azure Blob Storage
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [approval, form]
 *           default: approval
 *         description: Type of PDF document
 *       - in: query
 *         name: redirect
 *         schema:
 *           type: boolean
 *           default: false
 *         description: If true, redirects to download URL. If false, returns JSON with URL.
 *     responses:
 *       200:
 *         description: Download URL info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     downloadUrl:
 *                       type: string
 *                     fileName:
 *                       type: string
 *                     contentType:
 *                       type: string
 *                     fileSize:
 *                       type: integer
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       302:
 *         description: Redirect to download URL (when redirect=true)
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id/pdf', ticketController.downloadPDF);

/**
 * @swagger
 * /tickets/{id}:
 *   put:
 *     summary: Update Change Request
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     description: Only owner can update. Only editable when status is DRAFT, REVISION_MANAGER, or REVISION_VP.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCRRequest'
 *     responses:
 *       200:
 *         description: CR berhasil diupdate
 *       400:
 *         description: CR tidak dapat diedit (status tidak valid)
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put(
  '/:id',
  roleMiddleware(ROLES.USER),
  validateBody(updateCRSchema),
  ticketController.updateCR
);

/**
 * @swagger
 * /tickets/{id}:
 *   delete:
 *     summary: Delete Change Request (soft delete)
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     description: Only owner can delete. Only deletable when status is DRAFT.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CR berhasil dihapus
 *       400:
 *         description: Hanya CR dengan status DRAFT yang dapat dihapus
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:id', roleMiddleware(ROLES.USER), ticketController.deleteCR);

/**
 * @swagger
 * /tickets/{id}/submit:
 *   post:
 *     summary: Submit CR for approval
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     description: Submit DRAFT CR for manager approval. Status will change to PENDING_MANAGER.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CR berhasil disubmit
 *       400:
 *         description: Hanya CR dengan status DRAFT yang dapat disubmit
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/:id/submit', roleMiddleware(ROLES.USER), ticketController.submitCR);

/**
 * @swagger
 * /tickets/{id}/resubmit:
 *   post:
 *     summary: Resubmit CR after revision
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     description: Resubmit CR after making revisions. Only for REVISION_MANAGER or REVISION_VP status.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CR berhasil diresubmit
 *       400:
 *         description: CR tidak dalam status revisi
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/:id/resubmit', roleMiddleware(ROLES.USER), ticketController.resubmitCR);

/**
 * @swagger
 * /tickets/{id}/documents:
 *   post:
 *     summary: Upload document to CR
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     description: Upload file attachment. Max 5 files per CR, max 10MB each.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Dokumen berhasil diupload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Document'
 *       400:
 *         description: Max 5 dokumen per CR / File tidak valid
 */
router.post(
  '/:id/documents',
  roleMiddleware(ROLES.USER),
  uploadSingle('file'),
  handleUploadError,
  ticketController.uploadDocument
);

/**
 * @swagger
 * /tickets/{id}/documents/{docId}:
 *   delete:
 *     summary: Delete document from CR
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: docId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dokumen berhasil dihapus
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Dokumen tidak ditemukan
 */
router.delete(
  '/:id/documents/:docId',
  roleMiddleware(ROLES.USER),
  ticketController.deleteDocument
);

/**
 * @swagger
 * /tickets/{id}/documents/{docId}/download:
 *   get:
 *     summary: Get download URL for document
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     description: Returns a temporary SAS URL (valid for 2 minutes) for direct download from Azure Blob Storage
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: docId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: redirect
 *         schema:
 *           type: boolean
 *           default: false
 *         description: If true, redirects to download URL. If false, returns JSON with URL.
 *     responses:
 *       200:
 *         description: Download URL info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     downloadUrl:
 *                       type: string
 *                       description: Temporary SAS URL for direct download
 *                     fileName:
 *                       type: string
 *                     contentType:
 *                       type: string
 *                     fileSize:
 *                       type: integer
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       302:
 *         description: Redirect to download URL (when redirect=true)
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Dokumen tidak ditemukan
 */
router.get(
  '/:id/documents/:docId/download',
  ticketController.downloadDocument
);

module.exports = router;
