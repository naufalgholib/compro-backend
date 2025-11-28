const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { roleMiddleware, ROLES } = require('../middlewares/roleMiddleware');
const { validateBody } = require('../middlewares/validationMiddleware');
const { approveSchema, rejectSchema, revisionSchema, assignDeveloperSchema } = require('../validations');

// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /approval/{id}/manager/approve:
 *   post:
 *     summary: Manager approve CR
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     description: Manager approves CR from their division. Status changes to PENDING_VP.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: CR ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApproveRequest'
 *     responses:
 *       200:
 *         description: CR berhasil diapprove
 *       400:
 *         description: CR tidak dalam status PENDING_MANAGER
 *       403:
 *         description: Tidak dapat approve CR dari divisi lain
 */
router.post(
  '/:id/manager/approve',
  roleMiddleware(ROLES.MANAGER),
  validateBody(approveSchema),
  approvalController.managerApprove
);

/**
 * @swagger
 * /approval/{id}/manager/reject:
 *   post:
 *     summary: Manager reject CR (Final)
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Manager rejects CR permanently. User cannot resubmit this CR.
 *       Must provide rejection reason (min 50 characters).
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
 *             $ref: '#/components/schemas/RejectRequest'
 *     responses:
 *       200:
 *         description: CR ditolak
 *       400:
 *         description: Alasan penolakan minimal 50 karakter
 */
router.post(
  '/:id/manager/reject',
  roleMiddleware(ROLES.MANAGER),
  validateBody(rejectSchema),
  approvalController.managerReject
);

/**
 * @swagger
 * /approval/{id}/manager/revision:
 *   post:
 *     summary: Manager request revision
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Manager requests user to revise CR. Status changes to REVISION_MANAGER.
 *       Max 3 revision cycles from manager.
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
 *             $ref: '#/components/schemas/RevisionRequest'
 *     responses:
 *       200:
 *         description: Permintaan revisi berhasil dikirim
 *       400:
 *         description: Max 3x revisi dari Manager
 */
router.post(
  '/:id/manager/revision',
  roleMiddleware(ROLES.MANAGER),
  validateBody(revisionSchema),
  approvalController.managerRequestRevision
);

/**
 * @swagger
 * /approval/{id}/vp/approve:
 *   post:
 *     summary: VP approve CR (Final)
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       VP approves CR. Status changes to APPROVED.
 *       Triggers automatic PDF document generation.
 *       CR is ready for developer assignment.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApproveRequest'
 *     responses:
 *       200:
 *         description: CR berhasil diapprove oleh VP
 *       400:
 *         description: CR tidak dalam status PENDING_VP
 */
router.post(
  '/:id/vp/approve',
  roleMiddleware(ROLES.VP),
  validateBody(approveSchema),
  approvalController.vpApprove
);

/**
 * @swagger
 * /approval/{id}/vp/reject:
 *   post:
 *     summary: VP reject CR (Manager approval voided)
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       VP rejects CR permanently. **Manager approval is voided.**
 *       User must create new CR if needed.
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
 *             $ref: '#/components/schemas/RejectRequest'
 *     responses:
 *       200:
 *         description: CR ditolak oleh VP
 */
router.post(
  '/:id/vp/reject',
  roleMiddleware(ROLES.VP),
  validateBody(rejectSchema),
  approvalController.vpReject
);

/**
 * @swagger
 * /approval/{id}/vp/revision:
 *   post:
 *     summary: VP request revision (Manager approval voided)
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       VP requests revision. **Manager approval is voided.**
 *       User must revise and submit from beginning (Manager → VP again).
 *       Max 2 revision cycles from VP.
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
 *             $ref: '#/components/schemas/RevisionRequest'
 *     responses:
 *       200:
 *         description: Permintaan revisi VP berhasil dikirim
 *       400:
 *         description: Max 2x revisi dari VP
 */
router.post(
  '/:id/vp/revision',
  roleMiddleware(ROLES.VP),
  validateBody(revisionSchema),
  approvalController.vpRequestRevision
);

/**
 * @swagger
 * /approval/{id}/assign:
 *   post:
 *     summary: Manager IT assign developer(s)
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Manager IT assigns one or more developers to approved CR.
 *       Status changes to ASSIGNED_DEV.
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
 *             $ref: '#/components/schemas/AssignDeveloperRequest'
 *     responses:
 *       200:
 *         description: Developer berhasil di-assign
 *       400:
 *         description: CR tidak dalam status Approved / Developer tidak valid
 */
router.post(
  '/:id/assign',
  roleMiddleware(ROLES.MANAGER_IT),
  validateBody(assignDeveloperSchema),
  approvalController.assignDeveloper
);

/**
 * @swagger
 * /approval/{id}/complete:
 *   post:
 *     summary: Mark CR as completed
 *     tags: [Approval]
 *     security:
 *       - bearerAuth: []
 *     description: Mark assigned CR as completed. Only Manager IT or assigned Developer can do this.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CR telah diselesaikan
 *       400:
 *         description: CR tidak dalam status ASSIGNED_DEV
 *       403:
 *         description: Hanya Manager IT atau Developer yang di-assign
 */
router.post(
  '/:id/complete',
  roleMiddleware(ROLES.MANAGER_IT, ROLES.DEV),
  approvalController.markCompleted
);

module.exports = router;
