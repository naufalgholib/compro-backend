const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const ticketRoutes = require('./ticketRoutes');
const approvalRoutes = require('./approvalRoutes');
const notificationRoutes = require('./notificationRoutes');
const dashboardRoutes = require('./dashboardRoutes');

// API Routes
router.use('/auth', authRoutes);
router.use('/tickets', ticketRoutes);
router.use('/approval', approvalRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
