const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns dashboard data based on user's role:
 *       - **USER**: My CRs statistics, recent CRs
 *       - **MANAGER**: Pending approvals, division statistics
 *       - **VP**: All pending VP approvals, executive overview
 *       - **MANAGER_IT**: CRs needing mapping, developer workload
 *       - **DEV**: Assigned CRs, deadlines
 *     responses:
 *       200:
 *         description: Dashboard data
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         role:
 *                           type: string
 *                         division:
 *                           type: string
 *                     stats:
 *                       type: object
 *                       description: Statistics vary by role
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', authMiddleware, dashboardController.getDashboard);

module.exports = router;
