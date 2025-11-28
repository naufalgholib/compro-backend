const notificationService = require('../services/notificationService');
const { response } = require('../utils');

/**
 * Get user notifications
 * GET /api/notifications
 */
async function getNotifications(req, res, next) {
  try {
    const { page, limit, unreadOnly } = req.query;
    const result = await notificationService.getNotifications(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      unreadOnly: unreadOnly === 'true',
    });
    return response.paginated(res, result.data, result.pagination);
  } catch (error) {
    next(error);
  }
}

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
async function getUnreadCount(req, res, next) {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    return response.success(res, { unreadCount: count });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
async function markAsRead(req, res, next) {
  try {
    await notificationService.markAsRead(parseInt(req.params.id), req.user.id);
    return response.success(res, null, 'Notifikasi telah dibaca');
  } catch (error) {
    next(error);
  }
}

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
async function markAllAsRead(req, res, next) {
  try {
    await notificationService.markAllAsRead(req.user.id);
    return response.success(res, null, 'Semua notifikasi telah dibaca');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
